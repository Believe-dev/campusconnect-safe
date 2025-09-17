-- Ensure verification-photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verification-photos', 'verification-photos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Drop all existing policies for verification-photos
DROP POLICY IF EXISTS "Public read verification photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload verification photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own verification photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own verification photos" ON storage.objects;

-- Create new policies for verification-photos bucket
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