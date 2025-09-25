-- Test queries to debug verification request issues

-- 1. Check all profiles with verification photos
SELECT 
    id,
    user_id,
    full_name,
    email,
    account_type,
    seller_status,
    is_verified,
    is_banned,
    face_photo_url IS NOT NULL as has_face_photo,
    student_id_photo_url IS NOT NULL as has_id_photo,
    created_at
FROM profiles 
WHERE face_photo_url IS NOT NULL 
   AND student_id_photo_url IS NOT NULL
ORDER BY created_at DESC;

-- 2. Check pending sellers
SELECT 
    id,
    user_id,
    full_name,
    email,
    account_type,
    seller_status,
    is_banned,
    created_at
FROM profiles 
WHERE account_type = 'seller' 
   AND (seller_status IS NULL OR seller_status = 'pending')
   AND (is_banned IS NULL OR is_banned = false)
ORDER BY created_at DESC;

-- 3. Check verification requests (users with photos but not verified)
SELECT 
    id,
    user_id,
    full_name,
    email,
    account_type,
    is_verified,
    is_banned,
    face_photo_url IS NOT NULL as has_face_photo,
    student_id_photo_url IS NOT NULL as has_id_photo,
    created_at
FROM profiles 
WHERE face_photo_url IS NOT NULL 
   AND student_id_photo_url IS NOT NULL
   AND (is_verified IS NULL OR is_verified = false)
   AND (is_banned IS NULL OR is_banned = false)
ORDER BY created_at DESC;

-- 4. Count totals
SELECT 
    'Total profiles' as category,
    COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
    'Profiles with photos' as category,
    COUNT(*) as count
FROM profiles 
WHERE face_photo_url IS NOT NULL AND student_id_photo_url IS NOT NULL
UNION ALL
SELECT 
    'Pending sellers' as category,
    COUNT(*) as count
FROM profiles 
WHERE account_type = 'seller' AND (seller_status IS NULL OR seller_status = 'pending')
UNION ALL
SELECT 
    'Verification requests' as category,
    COUNT(*) as count
FROM profiles 
WHERE face_photo_url IS NOT NULL 
   AND student_id_photo_url IS NOT NULL
   AND (is_verified IS NULL OR is_verified = false)
   AND (is_banned IS NULL OR is_banned = false);