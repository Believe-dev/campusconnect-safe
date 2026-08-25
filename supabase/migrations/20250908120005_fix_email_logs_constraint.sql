-- Fix email_logs status check constraint to include all status values used across triggers and services
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;

ALTER TABLE email_logs ADD CONSTRAINT email_logs_status_check 
  CHECK (status IN ('sent', 'delivered', 'failed', 'pending', 'queued', 'skipped'));

-- Safely update trigger function send_notification_alerts so log errors never break notification creation
CREATE OR REPLACE FUNCTION send_notification_alerts()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
    email_payload JSONB;
BEGIN
    SELECT full_name, email INTO user_profile
    FROM profiles 
    WHERE user_id = NEW.user_id OR id = NEW.user_id;
    
    IF user_profile IS NOT NULL AND user_profile.email IS NOT NULL AND user_profile.email != '' THEN
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
                'UniMarket Notification: ' || NEW.title,
                email_payload->>'html',
                email_payload->>'text',
                'sent',
                NOW(),
                'noreply.unimarket@gmail.com',
                'UniMarket Team'
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
