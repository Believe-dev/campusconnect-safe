-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    order_updates BOOLEAN DEFAULT true,
    message_notifications BOOLEAN DEFAULT true,
    payment_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    seller_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER notification_preferences_updated_at_trigger
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Create function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create preferences for new users
CREATE TRIGGER create_notification_preferences_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Update the notification trigger to respect user preferences
CREATE OR REPLACE FUNCTION send_notification_alerts()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
    user_prefs RECORD;
    email_payload JSONB;
    should_send_email BOOLEAN := false;
    should_send_push BOOLEAN := false;
BEGIN
    -- Get user profile information
    SELECT full_name, email INTO user_profile
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get user notification preferences
    SELECT * INTO user_prefs
    FROM notification_preferences
    WHERE user_id = NEW.user_id;
    
    -- If no preferences exist, create default ones
    IF user_prefs IS NULL THEN
        INSERT INTO notification_preferences (user_id)
        VALUES (NEW.user_id)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Get the newly created preferences
        SELECT * INTO user_prefs
        FROM notification_preferences
        WHERE user_id = NEW.user_id;
    END IF;
    
    -- Determine if we should send notifications based on type and preferences
    IF user_prefs IS NOT NULL THEN
        CASE NEW.type
            WHEN 'message' THEN
                should_send_email := user_prefs.email_notifications AND user_prefs.message_notifications;
                should_send_push := user_prefs.push_notifications AND user_prefs.message_notifications;
            WHEN 'order' THEN
                should_send_email := user_prefs.email_notifications AND user_prefs.order_updates;
                should_send_push := user_prefs.push_notifications AND user_prefs.order_updates;
            WHEN 'payment' THEN
                should_send_email := user_prefs.email_notifications AND user_prefs.payment_notifications;
                should_send_push := user_prefs.push_notifications AND user_prefs.payment_notifications;
            WHEN 'seller' THEN
                should_send_email := user_prefs.email_notifications AND user_prefs.seller_notifications;
                should_send_push := user_prefs.push_notifications AND user_prefs.seller_notifications;
            ELSE
                should_send_email := user_prefs.email_notifications;
                should_send_push := user_prefs.push_notifications;
        END CASE;
    ELSE
        -- Default to sending if no preferences found
        should_send_email := true;
        should_send_push := true;
    END IF;
    
    -- Only proceed if we have user profile data and should send notifications
    IF user_profile IS NOT NULL AND (should_send_email OR should_send_push) THEN
        -- Send email notification if enabled
        IF should_send_email AND user_profile.email IS NOT NULL AND user_profile.email != '' THEN
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
        
        -- Send push notification if enabled
        IF should_send_push THEN
            PERFORM send_onesignal_notification(
                ARRAY[NEW.user_id],
                NEW.title,
                NEW.message,
                jsonb_build_object('notification_id', NEW.id, 'type', NEW.type)
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
            CASE WHEN should_send_email THEN email_payload->>'html' ELSE NULL END,
            CASE WHEN should_send_email THEN email_payload->>'text' ELSE NULL END,
            CASE 
                WHEN should_send_email AND user_profile.email IS NOT NULL THEN 'sent' 
                WHEN NOT should_send_email THEN 'disabled'
                ELSE 'skipped' 
            END,
            NOW(),
            'noreply.unimarket@gmail.com',
            'UniMarket Team'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;