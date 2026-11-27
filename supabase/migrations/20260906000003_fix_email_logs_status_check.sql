-- send_notification_alerts() (20260715000001) writes one of 'sent',
-- 'disabled', or 'skipped' into email_logs.status on every notification
-- insert that reaches that branch. The live email_logs_status_check
-- constraint only allows 'delivered' or 'failed' (from
-- 20250113000005_email_logs_table.sql) - a prior widen attempt
-- (20250908120005_fix_email_logs_constraint.sql) targeted this same
-- mismatch but never actually took effect against production (the live
-- constraint still matches the original 20250113000005 definition, and
-- 'disabled' didn't exist as a status until 20260715000001 introduced
-- preference-gating, so even that widen wouldn't have covered it).
--
-- Every one of the three values the trigger writes violates the
-- constraint, so the INSERT INTO email_logs at the end of the trigger
-- throws - and because that insert isn't wrapped in its own exception
-- handler (unlike the two net.http_post calls above it), the exception
-- propagates out of the trigger and rolls back the entire INSERT INTO
-- notifications that fired it. notification_preferences.email_notifications
-- and .push_notifications both default to true, so this hits any user who
-- hasn't explicitly disabled both - i.e. most users by default.
--
-- Fix, in two parts:
--
-- 1. Widen the constraint rather than force the trigger's values to fit
--    'delivered'/'failed'. net.http_post is fire-and-forget - pg_net queues
--    the request and returns immediately, so the trigger has no visibility
--    into whether the email was actually delivered or genuinely failed at
--    send time. Claiming 'delivered' would assert something the trigger
--    can't know; collapsing 'disabled'/'skipped' into either bucket would
--    also lose the real distinction between "user opted out" and "no email
--    on file" vs an actual send attempt. 'sent' (dispatch attempted),
--    'disabled' (skipped by preference), and 'skipped' (should have sent
--    but no usable email) are the honest states the trigger can attest to.
--    Also folding in 'pending'/'queued' from the earlier (never-applied)
--    widen attempt, since nothing here contradicts keeping them available.
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;

ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_status_check
  CHECK (status IN ('sent', 'delivered', 'failed', 'pending', 'queued', 'skipped', 'disabled'));

-- 2. Wrap the email_logs insert in its own exception handler, matching the
--    two net.http_post calls above it, so a future logging-table problem
--    (schema change, a new status value, anything) can never again take the
--    real notification down with it. Body otherwise unchanged from
--    20260715000001.
CREATE OR REPLACE FUNCTION public.send_notification_alerts()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
    user_prefs RECORD;
    email_payload JSONB;
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

        BEGIN
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
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to write email_logs entry: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
