-- Enable HTTP extension and restore all notification triggers
-- Run this in Supabase SQL Editor

-- 1. Enable the HTTP extension (this creates the net schema)
CREATE EXTENSION IF NOT EXISTS http;

-- 2. Grant permissions to the net schema
GRANT USAGE ON SCHEMA net TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO authenticated;

-- 3. Restore the original notification function with HTTP support
CREATE OR REPLACE FUNCTION send_notification_alerts()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
    email_payload JSONB;
BEGIN
    -- Get user profile information
    SELECT full_name, email INTO user_profile
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Only proceed if we have user profile data
    IF user_profile IS NOT NULL THEN
        -- Prepare email payload
        email_payload := jsonb_build_object(
            'to', user_profile.email,
            'subject', 'UniMarket Notification: ' || NEW.title,
            'html', format(
                '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0ea5e9;">📢 %s</h2>
                    <p>Hello <strong>%s</strong>,</p>
                    <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
                        <p>%s</p>
                    </div>
                    <p>Please log in to your UniMarket account to take any necessary actions.</p>
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Best regards,<br>
                        UniMarket Team<br>
                        📧 noreply.unimarket@gmail.com
                    </p>
                </div>',
                NEW.title,
                COALESCE(user_profile.full_name, 'User'),
                replace(NEW.message, E'\n', '<br>')
            )
        );
        
        -- Send email notification (only if user has email) - wrapped in try/catch
        BEGIN
            IF user_profile.email IS NOT NULL AND user_profile.email != '' THEN
                PERFORM
                    net.http_post(
                        url := current_setting('app.supabase_url') || '/functions/v1/send-email',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
                        ),
                        body := email_payload
                    );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but don't fail the notification
                RAISE WARNING 'Failed to send email notification: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Restore the auto notification trigger
CREATE TRIGGER auto_notification_trigger
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_notification_alerts();

-- 5. Keep the updated_at trigger
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_updated_at_trigger
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();