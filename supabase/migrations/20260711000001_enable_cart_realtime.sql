-- The `cart` table was never added to the supabase_realtime publication,
-- so every client-side postgres_changes subscription on it (Cart page's
-- own realtime hook, the header cart-count badge) has been silently
-- receiving zero events — the subscription connects successfully but
-- Postgres never publishes changes for a table outside the publication.
-- This is why the cart page needed a manual reload/navigation to reflect
-- items added elsewhere instead of updating live.
ALTER TABLE cart REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE cart;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;
