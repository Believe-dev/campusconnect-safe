-- Create storage buckets for user uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('profile-photos', 'profile-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('id-cards', 'id-cards', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for profile-photos bucket
CREATE POLICY "Allow profile photo uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Profile photos are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow profile photo updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow profile photo deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile-photos');

-- Set up RLS policies for id-cards bucket (private)
CREATE POLICY "Allow ID card uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'id-cards');

CREATE POLICY "Allow ID card access" ON storage.objects
  FOR SELECT USING (bucket_id = 'id-cards');

CREATE POLICY "Allow ID card updates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'id-cards');

CREATE POLICY "Allow ID card deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'id-cards');