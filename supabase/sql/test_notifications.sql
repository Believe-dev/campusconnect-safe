-- Test notification system
-- Run this in Supabase SQL Editor

-- First, check if notifications table exists and has proper structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Check if there are any triggers on notifications table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'notifications';

-- Check if there are any triggers on payout_requests table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'payout_requests';

-- Test manual notification insert (replace USER_ID with actual user ID)
-- INSERT INTO notifications (user_id, title, message, type)
-- VALUES ('YOUR_USER_ID_HERE', 'Test Notification', 'This is a test notification', 'info');

-- Check recent notifications
SELECT id, user_id, title, message, type, created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 5;