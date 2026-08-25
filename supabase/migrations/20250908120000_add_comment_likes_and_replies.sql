-- Create live_feed_comment_likes table
CREATE TABLE IF NOT EXISTS live_feed_comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES live_feed_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Create indexes for comment likes
CREATE INDEX IF NOT EXISTS idx_live_feed_comment_likes_comment_id ON live_feed_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_live_feed_comment_likes_user_id ON live_feed_comment_likes(user_id);

-- Enable RLS for comment likes
ALTER TABLE live_feed_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comment likes
CREATE POLICY "Anyone can view comment likes" ON live_feed_comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON live_feed_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON live_feed_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Add parent_comment_id to live_feed_comments for replies
ALTER TABLE live_feed_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES live_feed_comments(id) ON DELETE CASCADE;

-- Create index for parent comments
CREATE INDEX IF NOT EXISTS idx_live_feed_comments_parent_id ON live_feed_comments(parent_comment_id);