-- Quick fix for signup database error - run this directly on Supabase
-- Add missing columns to profiles table if they don't exist

DO $$ 
BEGIN
    -- Add seller_registration_paid column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_registration_paid') THEN
        ALTER TABLE profiles ADD COLUMN seller_registration_paid BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add seller_registration_paid_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_registration_paid_at') THEN
        ALTER TABLE profiles ADD COLUMN seller_registration_paid_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add seller_subscription_expires_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_subscription_expires_at') THEN
        ALTER TABLE profiles ADD COLUMN seller_subscription_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add seller_features_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_features_active') THEN
        ALTER TABLE profiles ADD COLUMN seller_features_active BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create seller_registration_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS seller_registration_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_reference TEXT NOT NULL UNIQUE,
    payment_method TEXT NOT NULL DEFAULT 'paystack',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on seller_registration_payments if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'seller_registration_payments' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE seller_registration_payments ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies for seller_registration_payments if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'seller_registration_payments' 
        AND policyname = 'Users can view their own payment records'
    ) THEN
        CREATE POLICY "Users can view their own payment records" ON seller_registration_payments FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'seller_registration_payments' 
        AND policyname = 'Admins can view all payment records'
    ) THEN
        CREATE POLICY "Admins can view all payment records" ON seller_registration_payments FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    order_updates BOOLEAN DEFAULT true,
    message_notifications BOOLEAN DEFAULT true,
    payment_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    seller_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on notification_preferences if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'notification_preferences' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies for notification_preferences if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_preferences' 
        AND policyname = 'Users can view their own notification preferences'
    ) THEN
        CREATE POLICY "Users can view their own notification preferences" ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_preferences' 
        AND policyname = 'Users can update their own notification preferences'
    ) THEN
        CREATE POLICY "Users can update their own notification preferences" ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_preferences' 
        AND policyname = 'Users can insert their own notification preferences'
    ) THEN
        CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Update existing seller profiles to have proper defaults
UPDATE profiles 
SET 
    seller_registration_paid = COALESCE(seller_registration_paid, FALSE),
    seller_features_active = COALESCE(seller_features_active, FALSE)
WHERE account_type = 'seller';

-- Create notification preferences for existing users who don't have them
INSERT INTO notification_preferences (user_id)
SELECT p.user_id 
FROM profiles p
LEFT JOIN notification_preferences np ON p.user_id = np.user_id
WHERE np.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Drop all existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON auth.users;

-- Improved handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    account_type_val TEXT;
    university_val TEXT;
    full_name_val TEXT;
    student_id_val TEXT;
    phone_number_val TEXT;
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Check if profile already exists to prevent duplicates
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN NEW;
    END IF;
    
    -- Extract metadata with safe defaults
    account_type_val := COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer');
    university_val := NEW.raw_user_meta_data->>'university_name';
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(COALESCE(NEW.email, 'User'), '@', 1));
    student_id_val := NEW.raw_user_meta_data->>'student_id';
    phone_number_val := NEW.raw_user_meta_data->>'phone_number';
    
    -- Insert profile with all required columns
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        account_type,
        university_name,
        student_id,
        phone_number,
        seller_status,
        seller_registration_paid,
        seller_features_active
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        full_name_val,
        account_type_val,
        university_val,
        student_id_val,
        phone_number_val,
        CASE 
            WHEN account_type_val = 'seller' THEN 'pending'
            ELSE NULL
        END,
        FALSE,
        FALSE
    );
    
    -- Create wallet for the user
    BEGIN
        INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
        VALUES (NEW.id, 0.00, 0.00, 0.00, 0.00)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log warning but don't fail user creation
            RAISE WARNING 'Failed to create wallet for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Create default notification preferences
    BEGIN
        INSERT INTO notification_preferences (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log warning but don't fail user creation
            RAISE WARNING 'Failed to create notification preferences for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();