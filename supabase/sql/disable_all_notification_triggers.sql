-- Selectively fix notification triggers to keep other notifications working
-- Run this in Supabase SQL Editor

-- Only remove HTTP-based triggers that cause net schema errors
DROP TRIGGER IF EXISTS auto_notification_trigger ON notifications;
DROP TRIGGER IF EXISTS send_notification_alerts_trigger ON notifications;

-- Check what triggers exist on notifications table
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'notifications';

-- Replace problematic HTTP function with database-only version
CREATE OR REPLACE FUNCTION send_notification_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Keep basic notification functionality without HTTP calls
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep the updated_at trigger for notifications (this one is safe)
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the safe updated_at trigger
DROP TRIGGER IF EXISTS notifications_updated_at_trigger ON notifications;
CREATE TRIGGER notifications_updated_at_trigger
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Test notification insert to verify it works
-- INSERT INTO notifications (user_id, title, message, type)
-- VALUES ('YOUR_USER_ID', 'Test After Fix', 'Testing notification system after fix', 'info');