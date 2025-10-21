-- Disable all HTTP-dependent triggers
-- Run this to stop the net schema error

-- Drop all notification triggers that might use HTTP
DROP TRIGGER IF EXISTS auto_notification_trigger ON notifications;
DROP TRIGGER IF EXISTS notification_email_trigger ON notifications;
DROP TRIGGER IF EXISTS send_notification_trigger ON notifications;

-- Drop HTTP-dependent functions
DROP FUNCTION IF EXISTS send_notification_alerts();
DROP FUNCTION IF EXISTS send_email_notification();
DROP FUNCTION IF EXISTS notify_user_email();

-- Check what triggers exist
SELECT n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name
FROM pg_trigger t 
JOIN pg_class c ON t.tgrelid = c.oid 
JOIN pg_namespace n ON c.relnamespace = n.oid 
WHERE n.nspname NOT IN ('information_schema', 'pg_catalog');