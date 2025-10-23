-- Test notifications system
-- Run this in Supabase SQL Editor to test the notifications system

-- 1. Check if notifications table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- 2. Check constraints on notifications table
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'notifications';

-- 3. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- 4. Check if realtime is enabled
SELECT 
    schemaname,
    tablename,
    relreplident as replica_identity
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE pt.tablename = 'notifications';

-- 5. Check existing notification types
SELECT DISTINCT type, COUNT(*) as count
FROM notifications 
GROUP BY type
ORDER BY count DESC;

-- 6. Test notification creation (replace USER_ID with actual user ID)
-- INSERT INTO notifications (user_id, title, message, type)
-- VALUES ('YOUR_USER_ID_HERE', 'Test Notification', 'This is a test notification to verify the system works', 'info');

-- 7. Check recent notifications
SELECT 
    id,
    user_id,
    title,
    message,
    type,
    is_read,
    created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- 8. Check notification functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%notification%'
ORDER BY routine_name;

-- 9. Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notification%'
ORDER BY trigger_name;

-- 10. Test the send_notification function (replace USER_ID)
-- SELECT send_notification(
--     'YOUR_USER_ID_HERE'::UUID,
--     'Function Test',
--     'Testing the send_notification function',
--     'success'
-- );