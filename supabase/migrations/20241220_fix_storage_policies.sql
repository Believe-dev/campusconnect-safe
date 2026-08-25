-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own ID cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own ID cards" ON storage.objects;

-- Create new simplified policies
CREATE POLICY "Allow profile photo uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Profile photos are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow profile photo updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow profile photo deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow ID card uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'id-cards');

CREATE POLICY "Allow ID card access" ON storage.objects
  FOR SELECT USING (bucket_id = 'id-cards');

CREATE POLICY "Allow ID card updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'id-cards');

CREATE POLICY "Allow ID card deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'id-cards');