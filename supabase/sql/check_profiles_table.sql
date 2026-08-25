-- Check if business_name and photo columns exist in profiles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('business_name', 'avatar_url', 'student_id_photo_url')
ORDER BY column_name;