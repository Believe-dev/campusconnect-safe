-- Complete cleanup of net schema dependencies
-- Run this in Supabase SQL Editor FIRST, then run fix_notifications_direct.sql

-- 1. Find and drop ALL functions that reference net schema
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE pg_get_functiondef(p.oid) LIKE '%net.%'
        OR pg_get_functiondef(p.oid) LIKE '%http%'
        OR p.proname LIKE '%notification%'
        OR p.proname LIKE '%email%'
        OR p.proname LIKE '%onesignal%'
    LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', 
                func_record.schema_name, func_record.function_name, func_record.args);
            RAISE NOTICE 'Dropped function: %.%(%)', func_record.schema_name, func_record.function_name, func_record.args;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop function %.%: %', func_record.schema_name, func_record.function_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 2. Drop all notification-related triggers
DROP TRIGGER IF EXISTS auto_notification_trigger ON notifications;
DROP TRIGGER IF EXISTS send_notification_alerts_trigger ON notifications;
DROP TRIGGER IF EXISTS notification_trigger ON notifications;
DROP TRIGGER IF EXISTS email_notification_trigger ON notifications;
DROP TRIGGER IF EXISTS push_notification_trigger ON notifications;

-- 3. Drop triggers on other tables that might send notifications
DROP TRIGGER IF EXISTS payout_notification_trigger ON payout_requests;
DROP TRIGGER IF EXISTS order_notification_trigger ON orders;
DROP TRIGGER IF EXISTS seller_notification_trigger ON profiles;
DROP TRIGGER IF EXISTS subscription_notification_trigger ON seller_subscriptions;

-- 4. Clean up any remaining problematic functions by name
DROP FUNCTION IF EXISTS send_notification_alerts() CASCADE;
DROP FUNCTION IF EXISTS send_onesignal_notification(UUID[], TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS notify_user(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS notify_users(UUID[], TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS send_email_notification(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS send_push_notification(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_notification_with_email(UUID, TEXT, TEXT, TEXT) CASCADE;

-- 5. Verify cleanup
SELECT 'Remaining functions with net/http references:' as status;
SELECT n.nspname as schema_name, p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%net.%'
OR pg_get_functiondef(p.oid) LIKE '%http%';