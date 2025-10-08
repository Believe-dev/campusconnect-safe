-- Create function to automatically send push notifications
CREATE OR REPLACE FUNCTION send_push_notification_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the send-push-notification edge function
  PERFORM
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'data', jsonb_build_object(
          'type', NEW.type,
          'url', '/notifications',
          'notification_id', NEW.id
        )
      )
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically send push notifications
DROP TRIGGER IF EXISTS auto_push_notification_trigger ON notifications;
CREATE TRIGGER auto_push_notification_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification_trigger();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_push_notification_trigger() TO authenticated;
GRANT EXECUTE ON FUNCTION send_push_notification_trigger() TO service_role;