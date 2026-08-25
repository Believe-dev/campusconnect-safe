-- Fix signup database error by ensuring all required columns exist and function works properly
-- This migration adds missing columns and fixes the handle_new_user function

-- First, add missing columns to profiles table if they don't exist
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

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create improved handle_new_user function with better error handling
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
    
    -- Send welcome notification for buyers, seller approval notification for sellers
    BEGIN
        IF account_type_val = 'seller' THEN
            -- Notify seller about approval process
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                NEW.id,
                'Seller Application Submitted ⏳',
                'Your seller application has been submitted successfully! Our admin team will review your application within 3 working days. You''ll receive a notification once approved.',
                'info'
            );
            
            -- Notify admins about new seller application
            INSERT INTO notifications (user_id, title, message, type)
            SELECT 
                ur.user_id,
                'New Seller Application 📝',
                'A new seller has registered and needs approval. Check the admin panel to review their application.',
                'info'
            FROM user_roles ur
            WHERE ur.role = 'admin';
        ELSE
            -- Welcome notification for buyers
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                NEW.id,
                'Welcome to UniMarket! 🎉',
                'Your account has been created successfully. Start exploring products from verified student sellers.',
                'info'
            );
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Don't fail profile creation if notifications fail
            RAISE WARNING 'Failed to send notifications for user %: %', NEW.id, SQLERRM;
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

-- Ensure all existing users have wallets (safety check)
DO $$
BEGIN
    INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
    SELECT p.user_id, 0.00, 0.00, 0.00, 0.00
    FROM profiles p
    LEFT JOIN wallets w ON p.user_id = w.user_id
    WHERE w.user_id IS NULL
    ON CONFLICT (user_id) DO NOTHING;
END $$;

-- Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_seller_status ON profiles(seller_status);
CREATE INDEX IF NOT EXISTS idx_seller_payments_user_id ON seller_registration_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_payments_reference ON seller_registration_payments(payment_reference);

-- Update existing seller profiles to have proper defaults
UPDATE profiles 
SET 
    seller_registration_paid = COALESCE(seller_registration_paid, FALSE),
    seller_features_active = COALESCE(seller_features_active, FALSE)
WHERE account_type = 'seller';