-- Simple notifications fix without net schema dependency
-- This removes all HTTP-dependent functions and creates a clean notification system

-- 1. Drop all problematic functions that depend on net schema
DROP FUNCTION IF EXISTS send_notification_alerts() CASCADE;
DROP FUNCTION IF EXISTS send_onesignal_notification(UUID[], TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS notify_user(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS notify_users(UUID[], TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) CASCADE;

-- 2. Drop all triggers that might cause issues
DROP TRIGGER IF EXISTS auto_notification_trigger ON notifications;
DROP TRIGGER IF EXISTS send_notification_alerts_trigger ON notifications;

-- 3. Create simple send_notification function without HTTP dependencies
CREATE OR REPLACE FUNCTION send_notification(
    target_user_id UUID,
    notification_title TEXT,
    notification_message TEXT,
    notification_type TEXT DEFAULT 'info',
    ref_id TEXT DEFAULT NULL,
    ref_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (target_user_id, notification_title, notification_message, notification_type, ref_id, ref_type)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION send_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;