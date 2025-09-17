-- Fix all profile photo issues

-- 1. Ensure verification-photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verification-photos', 'verification-photos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Drop all existing storage policies
DROP POLICY IF EXISTS "Public read verification photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload verification photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own verification photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own verification photos" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_3" ON storage.objects;

-- 3. Create comprehensive storage policies
CREATE POLICY "Public read verification photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'verification-photos');

CREATE POLICY "Authenticated upload verification photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users update own verification photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'verification-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own verification photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'verification-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Fix avatar URLs for existing users with face photos
UPDATE profiles 
SET avatar_url = CONCAT('https://ssqplkrxtrvfptrsnpow.supabase.co/storage/v1/object/public/verification-photos/', face_photo_url)
WHERE face_photo_url IS NOT NULL 
  AND (avatar_url IS NULL OR avatar_url = '' OR NOT avatar_url LIKE '%verification-photos%');

-- 5. Create function to generate proper image URLs
CREATE OR REPLACE FUNCTION get_verification_photo_url(file_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF file_path IS NULL OR file_path = '' THEN
    RETURN NULL;
  END IF;
  
  -- If already a full URL, return as is
  IF file_path LIKE 'http%' THEN
    RETURN file_path;
  END IF;
  
  -- Build public URL
  RETURN CONCAT('https://ssqplkrxtrvfptrsnpow.supabase.co/storage/v1/object/public/verification-photos/', file_path);
END;
$$;