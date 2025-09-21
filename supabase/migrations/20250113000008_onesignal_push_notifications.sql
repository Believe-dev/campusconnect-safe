-- Add OneSignal player ID column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

-- Create function to send OneSignal push notifications
CREATE OR REPLACE FUNCTION send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
    user_profile RECORD;
BEGIN
    -- Get user profile information
    SELECT full_name, onesignal_player_id INTO user_profile
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Skip if no OneSignal player ID
    IF user_profile.onesignal_player_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Send push notification via OneSignal API
    BEGIN
        PERFORM
            net.http_post(
                url := 'https://onesignal.com/api/v1/notifications',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Basic os_v2_app_frboqkvbyzf7ro4lm4igz56zfselpqtjjg5uconzsp45xf2dzfd3qmjsbwpfdt3nhgd5o4hhjxctgrzly3ijigoq6t6k25x45fx3fki'
                ),
                body := jsonb_build_object(
                    'app_id', '2c42e82a-a1c6-4bf8-bb8b-67106cf7d92c',
                    'include_player_ids', ARRAY[user_profile.onesignal_player_id],
                    'headings', jsonb_build_object('en', NEW.title),
                    'contents', jsonb_build_object('en', NEW.message)
                )
            );
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignore push notification failures
            NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_send_notification_email ON notifications;
DROP TRIGGER IF EXISTS trigger_send_push_notification ON notifications;

-- Create trigger to send push notifications
CREATE TRIGGER trigger_send_push_notification
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_push_notification();