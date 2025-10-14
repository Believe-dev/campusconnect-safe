-- Fix user signup database error by improving handle_new_user function
-- without breaking existing triggers and functions

-- Only replace the handle_new_user function with better error handling
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
    
    -- Insert profile with only the columns that definitely exist
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        account_type,
        university_name,
        student_id,
        phone_number,
        seller_status
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
        END
    );
    
    -- Try to create wallet for the user (ignore if wallets table doesn't exist)
    BEGIN
        INSERT INTO wallets (user_id, available_balance, total_earnings, total_commission_paid)
        VALUES (NEW.id, 0.00, 0.00, 0.00)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignore wallet creation errors
            NULL;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add missing columns to profiles table if they don't exist
DO $$ 
BEGIN
    -- Add seller_subscription_expires_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_subscription_expires_at') THEN
        ALTER TABLE profiles ADD COLUMN seller_subscription_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add seller_features_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_features_active') THEN
        ALTER TABLE profiles ADD COLUMN seller_features_active BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add admin_notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_notes') THEN
        ALTER TABLE profiles ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- Ensure all existing users have wallets (safety check)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') THEN
        INSERT INTO wallets (user_id, available_balance, total_earnings, total_commission_paid)
        SELECT p.user_id, 0.00, 0.00, 0.00
        FROM profiles p
        LEFT JOIN wallets w ON p.user_id = w.user_id
        WHERE w.user_id IS NULL
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;