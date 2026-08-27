-- Email a recipient when a chat message has sat unread for 24+ hours.
--
-- Rather than building a separate Resend call, this reuses the notification
-- email pipeline fixed in 20260715000001_consolidate_notification_email_trigger.sql:
-- inserting a `notifications` row with type='message' already triggers a
-- Resend email through send_notification_alerts(), already gated correctly
-- on the recipient's notification_preferences.message_notifications toggle,
-- and 'message'-type notifications are already excluded from the in-app
-- Notifications page (Notifications.tsx filters `.neq("type","message")`),
-- so this can't clutter that list — it's purely an email-triggering vehicle.

-- 1. Track which messages have already triggered a reminder, so the
--    hourly cron job below is idempotent regardless of how many times it runs.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS unread_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_unread_reminder
    ON messages (created_at)
    WHERE unread_reminder_sent_at IS NULL;

-- 2. Function: find messages older than 24h that are still unread by their
--    recipient (no conversation_reads row for them at/after the message's
--    created_at) and haven't been reminded about yet, and notify each one.
CREATE OR REPLACE FUNCTION send_unread_message_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    msg_record RECORD;
    recipient_id UUID;
    sender_name TEXT;
BEGIN
    FOR msg_record IN
        SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at,
               c.buyer_id, c.seller_id
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.created_at <= now() - INTERVAL '24 hours'
        AND m.unread_reminder_sent_at IS NULL
        AND m.message_type = 'text'
    LOOP
        recipient_id := CASE
            WHEN msg_record.buyer_id = msg_record.sender_id THEN msg_record.seller_id
            ELSE msg_record.buyer_id
        END;

        -- Skip if the recipient has read the conversation at/after this
        -- message was sent.
        IF EXISTS (
            SELECT 1 FROM conversation_reads cr
            WHERE cr.conversation_id = msg_record.conversation_id
            AND cr.user_id = recipient_id
            AND cr.last_read_at >= msg_record.created_at
        ) THEN
            UPDATE messages SET unread_reminder_sent_at = now() WHERE id = msg_record.id;
            CONTINUE;
        END IF;

        SELECT full_name INTO sender_name FROM profiles WHERE user_id = msg_record.sender_id;

        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            recipient_id,
            'New message from ' || COALESCE(sender_name, 'a UniMarket user'),
            msg_record.content,
            'message',
            msg_record.conversation_id::text,
            'conversation'
        );

        UPDATE messages SET unread_reminder_sent_at = now() WHERE id = msg_record.id;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION send_unread_message_reminders() TO postgres;

-- 3. Schedule it hourly via pg_cron, so a message crosses the 24h mark and
--    gets emailed within an hour rather than only at one fixed time of day.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-unread-message-reminders') THEN
        PERFORM cron.unschedule('send-unread-message-reminders');
    END IF;
END $$;

SELECT cron.schedule(
    'send-unread-message-reminders',
    '0 * * * *',
    $$SELECT send_unread_message_reminders();$$
);
