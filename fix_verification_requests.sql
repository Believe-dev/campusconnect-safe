-- Fix verification requests and seller approvals
-- Ensure seller_status column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_status TEXT DEFAULT 'pending' CHECK (seller_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_approved_by UUID REFERENCES auth.users(id);

-- Update existing seller accounts to have proper status
UPDATE profiles 
SET seller_status = 'pending'
WHERE account_type = 'seller' AND seller_status IS NULL;

-- Update approved sellers (those who can already sell)
UPDATE profiles 
SET seller_status = 'approved', seller_approved_at = NOW()
WHERE account_type = 'seller' AND seller_status = 'pending' AND created_at < NOW() - INTERVAL '1 day';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_seller_status ON profiles(seller_status);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_photos ON profiles(face_photo_url, student_id_photo_url) WHERE face_photo_url IS NOT NULL AND student_id_photo_url IS NOT NULL;

-- Show current verification requests
SELECT 
    full_name,
    email,
    university_name,
    account_type,
    seller_status,
    is_verified,
    CASE 
        WHEN face_photo_url IS NOT NULL THEN 'Yes' 
        ELSE 'No' 
    END as has_face_photo,
    CASE 
        WHEN student_id_photo_url IS NOT NULL THEN 'Yes' 
        ELSE 'No' 
    END as has_id_photo,
    created_at
FROM profiles 
WHERE (face_photo_url IS NOT NULL AND student_id_photo_url IS NOT NULL)
   OR (account_type = 'seller' AND seller_status = 'pending')
ORDER BY created_at DESC;