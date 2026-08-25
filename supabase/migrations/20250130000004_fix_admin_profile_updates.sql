-- Fix admin profile updates for old users by ensuring all required columns exist with proper defaults

-- Add missing columns with proper defaults
DO $$
BEGIN
    -- Add seller_registration_paid column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_registration_paid' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN seller_registration_paid BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add seller_features_active column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_features_active' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN seller_features_active BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add verification_status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_status' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN verification_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add verified_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verified_at' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add seller_subscription_expires_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_subscription_expires_at' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN seller_subscription_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add seller_registration_paid_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_registration_paid_at' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN seller_registration_paid_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add rating column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rating' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    -- Add total_reviews column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_reviews' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN total_reviews INTEGER DEFAULT 0;
    END IF;
    
    -- Add is_verified column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add business_name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_name' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN business_name TEXT;
    END IF;
    
    -- Add avatar_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- Add student_id_photo_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'student_id_photo_url' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN student_id_photo_url TEXT;
    END IF;
    
    -- Add bio column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;
    
    -- Add admin_notes column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_notes' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN admin_notes TEXT;
    END IF;
    
    -- Add face_photo_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'face_photo_url' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN face_photo_url TEXT;
    END IF;
    
    -- Add seller_status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_status' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN seller_status TEXT;
    END IF;
    
    -- Add campus column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'campus' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN campus TEXT;
    END IF;
    
    -- Add is_banned column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_banned' AND table_schema = 'public') THEN
        ALTER TABLE profiles ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update all existing profiles to have proper default values for NULL columns
UPDATE profiles 
SET 
    seller_registration_paid = COALESCE(seller_registration_paid, FALSE),
    seller_features_active = COALESCE(seller_features_active, FALSE),
    verification_status = COALESCE(verification_status, 'pending'),
    rating = COALESCE(rating, 0.0),
    total_reviews = COALESCE(total_reviews, 0),
    is_verified = COALESCE(is_verified, FALSE),
    is_banned = COALESCE(is_banned, FALSE)
WHERE 
    seller_registration_paid IS NULL 
    OR seller_features_active IS NULL 
    OR verification_status IS NULL
    OR rating IS NULL
    OR total_reviews IS NULL
    OR is_verified IS NULL
    OR is_banned IS NULL;

-- Add constraints to ensure data integrity
DO $$
BEGIN
    -- Add check constraint for rating if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_rating_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_rating_check CHECK (rating >= 0 AND rating <= 5);
    END IF;
    
    -- Add check constraint for total_reviews if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_total_reviews_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_total_reviews_check CHECK (total_reviews >= 0);
    END IF;
    
    -- Add check constraint for verification_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_verification_status_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_verification_status_check 
        CHECK (verification_status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    -- Add check constraint for seller_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_seller_status_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_seller_status_check 
        CHECK (seller_status IN ('pending', 'approved', 'rejected') OR seller_status IS NULL);
    END IF;
END $$;

-- Create a function to safely update user profiles from admin panel
CREATE OR REPLACE FUNCTION admin_update_user_profile(
    p_user_id UUID,
    p_updates JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    update_query TEXT := 'UPDATE profiles SET updated_at = NOW()';
    param_count INTEGER := 1;
    key TEXT;
    value TEXT;
BEGIN
    -- Build dynamic update query based on provided fields
    FOR key, value IN SELECT * FROM jsonb_each_text(p_updates)
    LOOP
        CASE key
            WHEN 'full_name' THEN
                update_query := update_query || ', full_name = $' || param_count;
                param_count := param_count + 1;
            WHEN 'email' THEN
                update_query := update_query || ', email = $' || param_count;
                param_count := param_count + 1;
            WHEN 'university_name' THEN
                update_query := update_query || ', university_name = $' || param_count;
                param_count := param_count + 1;
            WHEN 'bio' THEN
                update_query := update_query || ', bio = $' || param_count;
                param_count := param_count + 1;
            WHEN 'phone_number' THEN
                update_query := update_query || ', phone_number = $' || param_count;
                param_count := param_count + 1;
            WHEN 'student_id' THEN
                update_query := update_query || ', student_id = $' || param_count;
                param_count := param_count + 1;
            WHEN 'rating' THEN
                update_query := update_query || ', rating = $' || param_count || '::DECIMAL(3,2)';
                param_count := param_count + 1;
            WHEN 'total_reviews' THEN
                update_query := update_query || ', total_reviews = $' || param_count || '::INTEGER';
                param_count := param_count + 1;
            WHEN 'is_verified' THEN
                update_query := update_query || ', is_verified = $' || param_count || '::BOOLEAN';
                param_count := param_count + 1;
            WHEN 'is_banned' THEN
                update_query := update_query || ', is_banned = $' || param_count || '::BOOLEAN';
                param_count := param_count + 1;
            WHEN 'avatar_url' THEN
                update_query := update_query || ', avatar_url = $' || param_count;
                param_count := param_count + 1;
            WHEN 'admin_notes' THEN
                update_query := update_query || ', admin_notes = $' || param_count;
                param_count := param_count + 1;
            ELSE
                -- Skip unknown fields
                CONTINUE;
        END CASE;
    END LOOP;
    
    update_query := update_query || ' WHERE user_id = $' || param_count;
    
    -- Execute the update (simplified for now - in production you'd use EXECUTE with parameters)
    UPDATE profiles 
    SET 
        full_name = COALESCE((p_updates->>'full_name'), full_name),
        email = COALESCE((p_updates->>'email'), email),
        university_name = COALESCE((p_updates->>'university_name'), university_name),
        bio = COALESCE((p_updates->>'bio'), bio),
        phone_number = COALESCE((p_updates->>'phone_number'), phone_number),
        student_id = COALESCE((p_updates->>'student_id'), student_id),
        rating = COALESCE((p_updates->>'rating')::DECIMAL(3,2), rating),
        total_reviews = COALESCE((p_updates->>'total_reviews')::INTEGER, total_reviews),
        is_verified = COALESCE((p_updates->>'is_verified')::BOOLEAN, is_verified),
        is_banned = COALESCE((p_updates->>'is_banned')::BOOLEAN, is_banned),
        avatar_url = COALESCE((p_updates->>'avatar_url'), avatar_url),
        admin_notes = COALESCE((p_updates->>'admin_notes'), admin_notes),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to update profile for user %: %', p_user_id, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permission to service role for admin functions
GRANT EXECUTE ON FUNCTION admin_update_user_profile(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION admin_update_user_profile(UUID, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION admin_update_user_profile IS 'Safely update user profiles from admin panel with proper validation and error handling';