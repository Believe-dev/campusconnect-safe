-- Auto notification system with push and email triggers
-- This migration adds automatic push and email notifications when notifications are created

-- Create function to send push and email notifications
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
            ),
            'text', format(
                'Hello %s,\n\n%s\n\n%s\n\nPlease log in to your UniMarket account to take any necessary actions.\n\nBest regards,\nUniMarket Team',
                COALESCE(user_profile.full_name, 'User'),
                NEW.title,
                NEW.message
            )
        );
        
        -- Send email notification (only if user has email)
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
        
        -- Log the notification attempt
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
            'UniMarket Notification: ' || NEW.title,
            email_payload->>'html',
            email_payload->>'text',
            CASE WHEN user_profile.email IS NOT NULL THEN 'sent' ELSE 'skipped' END,
            NOW(),
            'noreply.unimarket@gmail.com',
            'UniMarket Team'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic notifications
DROP TRIGGER IF EXISTS auto_notification_trigger ON notifications;
CREATE TRIGGER auto_notification_trigger
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_notification_alerts();

-- Create function to send OneSignal push notifications
CREATE OR REPLACE FUNCTION send_onesignal_notification(
    user_ids UUID[],
    title TEXT,
    message TEXT,
    data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
    onesignal_payload JSONB;
    response JSONB;
BEGIN
    -- Build OneSignal payload
    onesignal_payload := jsonb_build_object(
        'app_id', '2c42e82a-a1c6-4bf8-bb8b-67106cf7d92c',
        'include_external_user_ids', array_to_json(user_ids::TEXT[]),
        'headings', jsonb_build_object('en', title),
        'contents', jsonb_build_object('en', message),
        'data', data,
        'web_url', 'https://unimarket.app/notifications',
        'chrome_web_icon', 'https://unimarket.app/logo.png',
        'chrome_web_badge', 'https://unimarket.app/logo.png'
    );
    
    -- Send to OneSignal API
    SELECT content::JSONB INTO response
    FROM http((
        'POST',
        'https://onesignal.com/api/v1/notifications',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Basic ' || current_setting('app.onesignal_api_key', true))
        ],
        'application/json',
        onesignal_payload::TEXT
    )::http_request);
    
    RETURN COALESCE(response, '{}'::JSONB);
EXCEPTION
    WHEN OTHERS THEN
        -- Return error info but don't fail the transaction
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to notify specific users
CREATE OR REPLACE FUNCTION notify_user(
    target_user_id UUID,
    notification_title TEXT,
    notification_message TEXT,
    notification_type TEXT DEFAULT 'info',
    send_push BOOLEAN DEFAULT true,
    send_email BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Insert notification (this will trigger email via the trigger)
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (target_user_id, notification_title, notification_message, notification_type)
    RETURNING id INTO notification_id;
    
    -- Send push notification if requested
    IF send_push THEN
        PERFORM send_onesignal_notification(
            ARRAY[target_user_id],
            notification_title,
            notification_message,
            jsonb_build_object('notification_id', notification_id)
        );
    END IF;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to notify multiple users
CREATE OR REPLACE FUNCTION notify_users(
    target_user_ids UUID[],
    notification_title TEXT,
    notification_message TEXT,
    notification_type TEXT DEFAULT 'info',
    send_push BOOLEAN DEFAULT true,
    send_email BOOLEAN DEFAULT true
)
RETURNS UUID[] AS $$
DECLARE
    notification_ids UUID[] := '{}';
    user_id UUID;
    notification_id UUID;
BEGIN
    -- Insert notifications for each user
    FOREACH user_id IN ARRAY target_user_ids
    LOOP
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (user_id, notification_title, notification_message, notification_type)
        RETURNING id INTO notification_id;
        
        notification_ids := array_append(notification_ids, notification_id);
    END LOOP;
    
    -- Send bulk push notification if requested
    IF send_push THEN
        PERFORM send_onesignal_notification(
            target_user_ids,
            notification_title,
            notification_message,
            jsonb_build_object('bulk_notification', true)
        );
    END IF;
    
    RETURN notification_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_notification_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION send_onesignal_notification(UUID[], TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_user(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_users(UUID[], TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;