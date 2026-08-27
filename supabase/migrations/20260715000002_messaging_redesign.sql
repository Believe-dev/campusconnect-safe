-- Messaging redesign: real delivered/read tracking, and removal of the
-- buggy duplicate conversation-creation RPC.
--
-- `conversation_reads` is already referenced throughout the app
-- (Messages.tsx, useOptimisticMessages.ts) but no migration for it exists
-- anywhere in this repo's history -- it may only exist by hand in the live
-- DB, or not at all. This migration makes it reproducible either way.
--
-- `messages` has never had a delivered/read distinction: the existing chat
-- UI's "✓✓" only meant "insert succeeded," not "the recipient saw it." This
-- adds a real `delivered_at` column (flipped by the recipient's own client
-- via mark_messages_delivered once they've actually received the message)
-- and relies on conversation_reads.last_read_at for read state.

-- 1. Delivered tracking on messages.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 2. conversation_reads table (idempotent — may already exist by hand).
CREATE TABLE IF NOT EXISTS conversation_reads (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Required because the app upserts with onConflict: 'conversation_id,user_id'.
CREATE UNIQUE INDEX IF NOT EXISTS conversation_reads_conv_user_key
    ON conversation_reads (conversation_id, user_id);

ALTER TABLE conversation_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversation participants can view read state" ON conversation_reads;
DROP POLICY IF EXISTS "Users can insert their own read state" ON conversation_reads;
DROP POLICY IF EXISTS "Users can update their own read state" ON conversation_reads;

-- SELECT is scoped by conversation membership, not by user_id — a sender
-- needs to read the OTHER participant's last_read_at to know whether their
-- own message has been seen yet.
CREATE POLICY "Conversation participants can view read state"
    ON conversation_reads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_reads.conversation_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert their own read state"
    ON conversation_reads
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Needed alongside INSERT: Postgres RLS evaluates the UPDATE policy on the
-- conflict-path branch of an upsert.
CREATE POLICY "Users can update their own read state"
    ON conversation_reads
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

ALTER TABLE conversation_reads REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_reads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE conversation_reads;
    END IF;
END $$;

-- 3. Recipient-driven delivery marking. SECURITY DEFINER bypasses RLS, so
-- the EXISTS membership check is required — without it any authenticated
-- user could flip delivered_at on an arbitrary conversation's messages.
CREATE OR REPLACE FUNCTION mark_messages_delivered(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE messages
    SET delivered_at = now()
    WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND delivered_at IS NULL
    AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = p_conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    );
END;
$$;

GRANT EXECUTE ON FUNCTION mark_messages_delivered(UUID) TO authenticated;

-- 4. Remove the buggy one-directional conversation RPC. It checks only
-- buyer_id=X AND seller_id=Y (no reverse direction) and keeps product_id
-- set instead of nulling it out — reintroducing the exact duplicate-
-- conversation bug find_or_create_consolidated_conversation was written to
-- fix. Only ProductDetails.tsx called it by name, and that call site is
-- being switched to the consolidated function in this same change.
DROP FUNCTION IF EXISTS find_or_create_conversation(UUID, UUID, UUID);
