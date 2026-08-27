-- Tracks who has viewed which live feed post, deduped per viewer (mirrors
-- the live_feed_likes table shape/RLS). Lets an owner see how many people
-- have actually seen their post in the feed; nobody else's view count is
-- surfaced client-side.
CREATE TABLE IF NOT EXISTS live_feed_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_feed_id UUID NOT NULL REFERENCES live_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(live_feed_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_feed_views_feed_id ON live_feed_views(live_feed_id);
CREATE INDEX IF NOT EXISTS idx_live_feed_views_user_id ON live_feed_views(user_id);

ALTER TABLE live_feed_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view view counts' AND tablename = 'live_feed_views') THEN
    CREATE POLICY "Anyone can view view counts" ON live_feed_views FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can record their own views' AND tablename = 'live_feed_views') THEN
    CREATE POLICY "Users can record their own views" ON live_feed_views FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- New tables aren't in the supabase_realtime publication by default (see
-- the 20260714000002 migration for why that matters) — add it up front
-- this time so the owner's view count updates live instead of needing a
-- manual refresh.
ALTER TABLE live_feed_views REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE live_feed_views;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;
