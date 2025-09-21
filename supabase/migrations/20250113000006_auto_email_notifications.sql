-- Create function to automatically send email when notification is created
CREATE OR REPLACE FUNCTION send_notification_email()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
    email_subject TEXT;
    email_html TEXT;
    email_text TEXT;
BEGIN
    -- Get user profile information
    SELECT email, full_name INTO user_profile
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Skip if no email found
    IF user_profile.email IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Create email content
    email_subject := '🔔 UniMarket Notification: ' || NEW.title;
    email_html := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">🔔 ' || NEW.title || '</h2>
        <p>Hello <strong>' || COALESCE(user_profile.full_name, 'User') || '</strong>,</p>
        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
            <p>' || REPLACE(NEW.message, E'\n', '<br>') || '</p>
        </div>
        <p>Please log in to your UniMarket account to view this notification.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
            Best regards,<br>
            UniMarket Team<br>
            📧 connectngcampus@gmail.com
        </p>
    </div>';
    email_text := 'Hello ' || COALESCE(user_profile.full_name, 'User') || E',\n\n' || NEW.title || E'\n\n' || NEW.message || E'\n\nPlease log in to your UniMarket account to view this notification.\n\nBest regards,\nUniMarket Team';
    
    -- Try to send email, but don't fail if it doesn't work
    BEGIN
        PERFORM
            net.http_post(
                url := 'https://api.resend.com/emails',
                headers := jsonb_build_object(
                    'Authorization', 'Bearer re_gikSXQzP_ArvK7pWvT2roWEnpwwS9vGxW',
                    'Content-Type', 'application/json'
                ),
                body := jsonb_build_object(
                    'from', 'UniMarket <connectngcampus@gmail.com>',
                    'to', ARRAY[user_profile.email],
                    'subject', email_subject,
                    'html', email_html,
                    'text', email_text
                )
            );
        
        -- Log successful email
        INSERT INTO email_logs (
            recipient_email,
            subject,
            html_content,
            text_content,
            status,
            from_email,
            from_name,
            sent_at
        ) VALUES (
            user_profile.email,
            email_subject,
            email_html,
            email_text,
            'sent',
            'connectngcampus@gmail.com',
            'UniMarket Team',
            NOW()
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log failed email but don't stop notification creation
            INSERT INTO email_logs (
                recipient_email,
                subject,
                html_content,
                text_content,
                status,
                from_email,
                from_name,
                sent_at
            ) VALUES (
                user_profile.email,
                email_subject,
                email_html,
                email_text,
                'failed',
                'connectngcampus@gmail.com',
                'UniMarket Team',
                NOW()
            );
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_send_notification_email ON notifications;

-- Create trigger to automatically send emails for all notifications
CREATE TRIGGER trigger_send_notification_email
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_notification_email();