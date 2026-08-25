-- Drop existing live_feed table if it exists
DROP TABLE IF EXISTS live_feed CASCADE;

-- Create live_feed table with proper structure
CREATE TABLE live_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_live_feed_seller_id ON live_feed(seller_id);
CREATE INDEX idx_live_feed_active_expires ON live_feed(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_live_feed_created_at ON live_feed(created_at DESC);

-- Enable RLS
ALTER TABLE live_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active live feed items" ON live_feed
  FOR SELECT USING (is_active = true AND expires_at > NOW());

CREATE POLICY "Sellers can insert their own live feed items" ON live_feed
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = seller_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update their own live feed items" ON live_feed
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = seller_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete their own live feed items" ON live_feed
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = seller_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- Function to cleanup expired live feed items
CREATE OR REPLACE FUNCTION cleanup_expired_live_feed()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE live_feed 
  SET is_active = false 
  WHERE expires_at <= NOW() AND is_active = true;
END;
$$;

-- Create live_feed_likes table if not exists
CREATE TABLE IF NOT EXISTS live_feed_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_feed_id UUID NOT NULL REFERENCES live_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(live_feed_id, user_id)
);

-- Create indexes for likes if not exists
CREATE INDEX IF NOT EXISTS idx_live_feed_likes_feed_id ON live_feed_likes(live_feed_id);
CREATE INDEX IF NOT EXISTS idx_live_feed_likes_user_id ON live_feed_likes(user_id);

-- Enable RLS for likes
ALTER TABLE live_feed_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for likes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view likes' AND tablename = 'live_feed_likes') THEN
    CREATE POLICY "Anyone can view likes" ON live_feed_likes FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can like items' AND tablename = 'live_feed_likes') THEN
    CREATE POLICY "Users can like items" ON live_feed_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can unlike items' AND tablename = 'live_feed_likes') THEN
    CREATE POLICY "Users can unlike items" ON live_feed_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create live_feed_comments table if not exists
CREATE TABLE IF NOT EXISTS live_feed_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_feed_id UUID NOT NULL REFERENCES live_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for comments if not exists
CREATE INDEX IF NOT EXISTS idx_live_feed_comments_feed_id ON live_feed_comments(live_feed_id);
CREATE INDEX IF NOT EXISTS idx_live_feed_comments_created_at ON live_feed_comments(created_at DESC);

-- Enable RLS for comments
ALTER TABLE live_feed_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view comments' AND tablename = 'live_feed_comments') THEN
    CREATE POLICY "Anyone can view comments" ON live_feed_comments FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can add comments' AND tablename = 'live_feed_comments') THEN
    CREATE POLICY "Users can add comments" ON live_feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own comments' AND tablename = 'live_feed_comments') THEN
    CREATE POLICY "Users can delete their own comments" ON live_feed_comments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create storage bucket for live feed images
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-feed-images', 'live-feed-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for live feed images
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view live feed images' AND tablename = 'objects') THEN
    CREATE POLICY "Anyone can view live feed images" ON storage.objects
      FOR SELECT USING (bucket_id = 'live-feed-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload live feed images' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can upload live feed images" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'live-feed-images' 
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own live feed images' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update their own live feed images" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'live-feed-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own live feed images' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete their own live feed images" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'live-feed-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;