-- Fix old user profiles that are missing required columns
-- This addresses the 400 Bad Request error when editing existing users

-- Add missing columns to profiles table if they don't exist
DO $$
BEGIN
    -- Add seller_registration_paid column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_registration_paid') THEN
        ALTER TABLE profiles ADD COLUMN seller_registration_paid BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add seller_features_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_features_active') THEN
        ALTER TABLE profiles ADD COLUMN seller_features_active BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add verification_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_status') THEN
        ALTER TABLE profiles ADD COLUMN verification_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add verified_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verified_at') THEN
        ALTER TABLE profiles ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add seller_subscription_expires_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_subscription_expires_at') THEN
        ALTER TABLE profiles ADD COLUMN seller_subscription_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add seller_registration_paid_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_registration_paid_at') THEN
        ALTER TABLE profiles ADD COLUMN seller_registration_paid_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add rating column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rating') THEN
        ALTER TABLE profiles ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    -- Add total_reviews column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_reviews') THEN
        ALTER TABLE profiles ADD COLUMN total_reviews INTEGER DEFAULT 0;
    END IF;
    
    -- Add is_verified column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add business_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_name') THEN
        ALTER TABLE profiles ADD COLUMN business_name TEXT;
    END IF;
    
    -- Add avatar_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- Add student_id_photo_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'student_id_photo_url') THEN
        ALTER TABLE profiles ADD COLUMN student_id_photo_url TEXT;
    END IF;
    
    -- Add bio column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;
    
    -- Add admin_notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_notes') THEN
        ALTER TABLE profiles ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- Update existing profiles to have proper default values
UPDATE profiles 
SET 
    seller_registration_paid = COALESCE(seller_registration_paid, FALSE),
    seller_features_active = COALESCE(seller_features_active, FALSE),
    verification_status = COALESCE(verification_status, 'pending'),
    rating = COALESCE(rating, 0.0),
    total_reviews = COALESCE(total_reviews, 0),
    is_verified = COALESCE(is_verified, FALSE)
WHERE 
    seller_registration_paid IS NULL 
    OR seller_features_active IS NULL 
    OR verification_status IS NULL
    OR rating IS NULL
    OR total_reviews IS NULL
    OR is_verified IS NULL;

-- Ensure all existing users have wallets
INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
SELECT p.user_id, 0.00, 0.00, 0.00, 0.00
FROM profiles p
LEFT JOIN wallets w ON p.user_id = w.user_id
WHERE w.user_id IS NULL;

-- Ensure all existing users have proper roles
INSERT INTO user_roles (user_id, role)
SELECT p.user_id, p.account_type::app_role
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id AND ur.role = p.account_type::app_role
WHERE ur.user_id IS NULL
AND p.account_type IN ('buyer', 'seller', 'admin');