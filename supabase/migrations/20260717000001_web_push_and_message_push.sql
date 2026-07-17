-- Web Push (VAPID) notifications, replacing OneSignal entirely.
--
-- Push previously ran through send_onesignal_notification(), which
-- authenticated via a database GUC (app.onesignal_api_key) that was never
-- set anywhere in this project's migration history -- current_setting()
-- returned NULL, the OneSignal call always failed, and the failure was
-- silently swallowed by the surrounding EXCEPTION block. Same bug class
-- already fixed for email in 20260715000001. Rather than fix the GUC, this
-- drops OneSignal (and the app.onesignal_api_key dependency) in favor of
-- the open Web Push standard: a VAPID key pair, a push_subscriptions table
-- of {endpoint, p256dh, auth} per device, and a rewritten send-push-
-- notification edge function that signs/delivers via the `web-push`
-- library. No third-party account or vendor dependency.

-- 1. Drop the dead OneSignal-calling functions. Their only callers were
--    oneSignal.ts's notifyOrderUpdate/notifyNewMessage/notifyPaymentUpdate,
--    which were in turn only called from testNotifications.ts -- itself
--    never imported anywhere in the app. Full dead chain, deleted alongside
--    this migration.
DROP FUNCTION IF EXISTS notify_user(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS notify_users(UUID[], TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS send_onesignal_notification(UUID[], TEXT, TEXT, JSONB);

-- 2. One row per subscribed device/browser, not per user -- someone can
--    have several devices, each needs its own push.
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key
    ON push_subscriptions (endpoint);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
    ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can view their own push subscriptions"
    ON push_subscriptions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own push subscriptions"
    ON push_subscriptions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own push subscriptions"
    ON push_subscriptions FOR DELETE
    USING (user_id = auth.uid());

-- The send-push-notification edge function reads across users via the
-- service-role key, which bypasses RLS entirely -- no policy needed for it.

-- 3. Fix the push branch of the existing notification trigger: same
--    net.http_post + hardcoded anon-key pattern already used for the email
--    call directly above it in this same function. Everything else
--    (preference gating, email branch, email_logs insert) is unchanged
--    from 20260715000001.
CREATE OR REPLACE FUNCTION send_notification_alerts()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
    user_prefs RECORD;
    email_payload JSONB;
    push_payload JSONB;
    should_send_email BOOLEAN := false;
    should_send_push BOOLEAN := false;
BEGIN
    SELECT full_name, email INTO user_profile
    FROM profiles
    WHERE user_id = NEW.user_id;

    SELECT * INTO user_prefs
    FROM notification_preferences
    WHERE user_id = NEW.user_id;

    IF user_prefs IS NULL THEN
        INSERT INTO notification_preferences (user_id)
        VALUES (NEW.user_id)
        ON CONFLICT (user_id) DO NOTHING;

        SELECT * INTO user_prefs
        FROM notification_preferences
        WHERE user_id = NEW.user_id;
    END IF;

    IF user_prefs IS NOT NULL THEN
        CASE
            WHEN NEW.type = 'message' THEN
                should_send_email := user_prefs.email_notifications AND user_prefs.message_notifications;
                should_send_push := user_prefs.push_notifications AND user_prefs.message_notifications;
            WHEN NEW.type IN ('order', 'order_shipped', 'order_delivered') THEN
                should_send_email := user_prefs.email_notifications AND user_prefs.order_updates;
                should_send_push := user_prefs.push_notifications AND user_prefs.order_updates;
            WHEN NEW.type IN ('payment', 'payout') THEN
                should_send_email := user_prefs.email_notifications AND user_prefs.payment_notifications;
                should_send_push := user_prefs.push_notifications AND user_prefs.payment_notifications;
            WHEN NEW.type IN ('seller', 'seller_approved', 'subscription', 'subscription_expiring', 'subscription_expired', 'subscription_activated') THEN
                should_send_email := user_prefs.email_notifications AND user_prefs.seller_notifications;
                should_send_push := user_prefs.push_notifications AND user_prefs.seller_notifications;
            ELSE
                should_send_email := user_prefs.email_notifications;
                should_send_push := user_prefs.push_notifications;
        END CASE;
    ELSE
        should_send_email := true;
        should_send_push := true;
    END IF;

    IF user_profile IS NOT NULL AND (should_send_email OR should_send_push) THEN
        IF should_send_email AND user_profile.email IS NOT NULL AND user_profile.email != '' THEN
            email_payload := jsonb_build_object(
                'to', user_profile.email,
                'subject', 'UniMarket: ' || NEW.title,
                'html', format(
                    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #5f9a3f;">%s</h2>
                        <p>Hello <strong>%s</strong>,</p>
                        <div style="background: #f2f4ee; padding: 15px; border-radius: 12px; margin: 20px 0;">
                            <p style="margin: 0;">%s</p>
                        </div>
                        <p>Log in to your UniMarket account to view this and take any necessary action.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #6b7568; font-size: 12px;">
                            UniMarket Team
                        </p>
                    </div>',
                    NEW.title,
                    COALESCE(user_profile.full_name, 'there'),
                    replace(NEW.message, E'\n', '<br>')
                ),
                'text', 'Hello ' || COALESCE(user_profile.full_name, 'there') || E',\n\n'
                    || NEW.title || E'\n\n' || NEW.message
                    || E'\n\nLog in to your UniMarket account to view this and take any necessary action.\n\nUniMarket Team'
            );

            BEGIN
                PERFORM
                    net.http_post(
                        url := 'https://ssqplkrxtrvfptrsnpow.supabase.co/functions/v1/send-email',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcXBsa3J4dHJ2ZnB0cnNucG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY5NjAsImV4cCI6MjA3MTUyMjk2MH0.pUr4tPv_BolqhaNjUukRfLmUzmAPcAQEm8jy6ifBMeg'
                        ),
                        body := email_payload
                    );
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to send notification email: %', SQLERRM;
            END;
        END IF;

        IF should_send_push THEN
            push_payload := jsonb_build_object(
                'user_id', NEW.user_id,
                'title', NEW.title,
                'message', NEW.message,
                'data', jsonb_build_object('url', '/notifications', 'type', NEW.type)
            );

            BEGIN
                PERFORM
                    net.http_post(
                        url := 'https://ssqplkrxtrvfptrsnpow.supabase.co/functions/v1/send-push-notification',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcXBsa3J4dHJ2ZnB0cnNucG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY5NjAsImV4cCI6MjA3MTUyMjk2MH0.pUr4tPv_BolqhaNjUukRfLmUzmAPcAQEm8jy6ifBMeg'
                        ),
                        body := push_payload
                    );
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
            END;
        END IF;

        INSERT INTO email_logs (
            recipient_email,
            subject,
            html_content,
            text_content,
            status,
            sent_at,
            from_email,
            from_name
        ) VALUES (
            user_profile.email,
            'UniMarket: ' || NEW.title,
            CASE WHEN should_send_email THEN email_payload->>'html' ELSE NULL END,
            CASE WHEN should_send_email THEN email_payload->>'text' ELSE NULL END,
            CASE
                WHEN should_send_email AND user_profile.email IS NOT NULL THEN 'sent'
                WHEN NOT should_send_email THEN 'disabled'
                ELSE 'skipped'
            END,
            NOW(),
            'notifications@mail.unimarket.com.ng',
            'UniMarket'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Instant push the moment a chat message arrives -- deliberately
--    separate from the notifications-table pipeline above, so this never
--    emails (email stays reserved for the 24h-unread digest in
--    20260716000001_unread_message_email_reminders.sql) and never clutters
--    the Notifications page (which already filters out type='message').
CREATE OR REPLACE FUNCTION send_message_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    conv RECORD;
    recipient_id UUID;
    user_prefs RECORD;
    sender_name TEXT;
    push_payload JSONB;
BEGIN
    IF NEW.message_type != 'text' THEN
        RETURN NEW;
    END IF;

    SELECT buyer_id, seller_id INTO conv
    FROM conversations
    WHERE id = NEW.conversation_id;

    IF conv IS NULL THEN
        RETURN NEW;
    END IF;

    recipient_id := CASE
        WHEN conv.buyer_id = NEW.sender_id THEN conv.seller_id
        ELSE conv.buyer_id
    END;

    SELECT * INTO user_prefs
    FROM notification_preferences
    WHERE user_id = recipient_id;

    IF user_prefs IS NULL THEN
        INSERT INTO notification_preferences (user_id)
        VALUES (recipient_id)
        ON CONFLICT (user_id) DO NOTHING;

        SELECT * INTO user_prefs
        FROM notification_preferences
        WHERE user_id = recipient_id;
    END IF;

    IF user_prefs IS NULL OR NOT (user_prefs.push_notifications AND user_prefs.message_notifications) THEN
        RETURN NEW;
    END IF;

    SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.sender_id;

    push_payload := jsonb_build_object(
        'user_id', recipient_id,
        'title', 'New message from ' || COALESCE(sender_name, 'a UniMarket user'),
        'message', left(NEW.content, 100),
        'data', jsonb_build_object('url', '/chat/' || NEW.conversation_id, 'type', 'message')
    );

    BEGIN
        PERFORM
            net.http_post(
                url := 'https://ssqplkrxtrvfptrsnpow.supabase.co/functions/v1/send-push-notification',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcXBsa3J4dHJ2ZnB0cnNucG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY5NjAsImV4cCI6MjA3MTUyMjk2MH0.pUr4tPv_BolqhaNjUukRfLmUzmAPcAQEm8jy6ifBMeg'
                ),
                body := push_payload
            );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to send message push notification: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_message_push_notification ON messages;
CREATE TRIGGER trigger_message_push_notification
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION send_message_push_notification();
