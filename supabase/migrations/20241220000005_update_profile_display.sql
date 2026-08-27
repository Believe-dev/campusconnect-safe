-- Ensure profiles table has business_name column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS student_id_photo_url TEXT;

-- Update existing profiles to use signup data from auth metadata
UPDATE profiles 
SET 
  business_name = COALESCE(business_name, (auth.users.raw_user_meta_data->>'business_name')::text),
  avatar_url = COALESCE(avatar_url, (auth.users.raw_user_meta_data->>'profile_photo_url')::text, (auth.users.raw_user_meta_data->>'avatar_url')::text),
  student_id_photo_url = COALESCE(student_id_photo_url, (auth.users.raw_user_meta_data->>'id_card_url')::text, (auth.users.raw_user_meta_data->>'student_id_photo_url')::text)
FROM auth.users 
WHERE profiles.user_id = auth.users.id
  AND (
    profiles.business_name IS NULL 
    OR profiles.avatar_url IS NULL 
    OR profiles.student_id_photo_url IS NULL
  );