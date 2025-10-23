-- Simple fix for admin panel 400 errors
-- Add missing columns with proper defaults and constraints

-- Ensure all required columns exist with proper defaults
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS seller_registration_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seller_features_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS seller_subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS seller_registration_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS student_id_photo_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS face_photo_url TEXT,
ADD COLUMN IF NOT EXISTS seller_status TEXT,
ADD COLUMN IF NOT EXISTS campus TEXT,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Update all NULL values to proper defaults
UPDATE profiles 
SET 
    seller_registration_paid = COALESCE(seller_registration_paid, FALSE),
    seller_features_active = COALESCE(seller_features_active, FALSE),
    verification_status = COALESCE(verification_status, 'pending'),
    rating = COALESCE(rating, 0.0),
    total_reviews = COALESCE(total_reviews, 0),
    is_verified = COALESCE(is_verified, FALSE),
    is_banned = COALESCE(is_banned, FALSE);

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Rating constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_rating_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_rating_check CHECK (rating >= 0 AND rating <= 5);
    END IF;
    
    -- Total reviews constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_total_reviews_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_total_reviews_check CHECK (total_reviews >= 0);
    END IF;
    
    -- Verification status constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_verification_status_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_verification_status_check 
        CHECK (verification_status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;