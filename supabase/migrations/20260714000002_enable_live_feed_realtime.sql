-- live_feed, live_feed_likes, and live_feed_comments were never added to
-- the supabase_realtime publication, so the postgres_changes subscriptions
-- in LiveFeed.tsx and useLiveFeedNotifications.ts connect successfully but
-- never actually receive events — Postgres only publishes changes for
-- tables inside the publication. This is why the live feed needed a manual
-- refresh to show new posts/likes/comments, and why the bottom nav's
-- "Live" tab unread badge only updated on mount or the 5-minute poll
-- instead of live as new posts came in.
ALTER TABLE live_feed REPLICA IDENTITY FULL;
ALTER TABLE live_feed_likes REPLICA IDENTITY FULL;
ALTER TABLE live_feed_comments REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE live_feed;
        ALTER PUBLICATION supabase_realtime ADD TABLE live_feed_likes;
        ALTER PUBLICATION supabase_realtime ADD TABLE live_feed_comments;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;
