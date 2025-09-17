-- Fix storage permissions for verification-photos bucket

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-photos', 'verification-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- Allow public read access to verification-photos
CREATE POLICY "Public read verification photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'verification-photos');

-- Allow authenticated users to upload to verification-photos
CREATE POLICY "Authenticated upload verification photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-photos' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own files
CREATE POLICY "Users update own verification photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'verification-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own files
CREATE POLICY "Users delete own verification photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'verification-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );