-- Consolidate notification emails onto a single Resend-backed trigger.
--
-- Two triggers on `notifications` were both firing on every insert:
--   1. trigger_send_notification_email (20250113000006) -> posted straight to
--      the EmailJS API with placeholder credentials (service_gmail /
--      template_notification) -- dead weight, never a real integration.
--   2. auto_notification_trigger (20250908120001, updated 20250908120002) ->
--      calls the `send-email` edge function (Resend), but looked up the
--      sender's profile via `profiles.id = NEW.user_id`. profiles.id is its
--      own random UUID, not the auth user id -- the FK column is
--      profiles.user_id -- so this lookup never matched and the function
--      silently no-opped on every call.
--
-- This migration drops the dead EmailJS path entirely and fixes the Resend
-- path: correct profiles lookup, and a hardcoded project URL/anon key
-- instead of the app.supabase_url / app.supabase_anon_key GUCs, which were
-- referenced by earlier migrations but never actually set at the database
-- level (no ALTER DATABASE ... SET call exists anywhere in this project's
-- history) -- current_setting() on an unset GUC raises, which would have
-- silently aborted the whole trigger body before it even reached net.http_post.

-- 1. Remove the dead EmailJS trigger + function.
DROP TRIGGER IF EXISTS trigger_send_notification_email ON notifications;
DROP FUNCTION IF EXISTS send_notification_email();

-- 2. Recreate the Resend-backed function with the lookup bug fixed and a
--    hardcoded endpoint/key. Preference-gating and the push branch are
--    carried over unchanged from 20250908120002.
CREATE OR REPLACE FUNCTION send_notification_alerts()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
    user_prefs RECORD;
    email_payload JSONB;
    should_send_email BOOLEAN := false;
    should_send_push BOOLEAN := false;
BEGIN
    -- FIXED: was `WHERE id = NEW.user_id`, which matched profiles' own
    -- primary key instead of the auth user id and never found a row.
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
            BEGIN
                PERFORM send_onesignal_notification(
                    ARRAY[NEW.user_id],
                    NEW.title,
                    NEW.message,
                    jsonb_build_object('notification_id', NEW.id, 'type', NEW.type)
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

DROP TRIGGER IF EXISTS auto_notification_trigger ON notifications;
CREATE TRIGGER auto_notification_trigger
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_notification_alerts();
