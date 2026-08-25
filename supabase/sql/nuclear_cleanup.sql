-- Nuclear cleanup - removes EVERYTHING that could reference net schema
-- Run this in Supabase SQL Editor

-- 1. Drop ALL triggers on notifications table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE event_object_table = 'notifications'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', 
            trigger_record.trigger_name, trigger_record.event_object_table);
    END LOOP;
END $$;

-- 2. Drop ALL functions in public schema that might reference net
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (proname LIKE '%notification%' 
             OR proname LIKE '%email%' 
             OR proname LIKE '%onesignal%'
             OR proname LIKE '%http%'
             OR proname LIKE '%net%')
    LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                func_record.proname, func_record.args);
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Ignore errors
        END;
    END LOOP;
END $$;

-- 3. Recreate notifications table from scratch
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'payout', 'subscription', 'subscription_expiring', 'subscription_expired', 'subscription_activated', 'order_shipped', 'order_delivered', 'seller_approved', 'message', 'order', 'payment', 'seller')),
    is_read BOOLEAN DEFAULT FALSE,
    reference_id TEXT,
    reference_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- 6. Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- 7. Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

-- 8. Enable realtime
ALTER TABLE notifications REPLICA IDENTITY FULL;

SELECT 'Nuclear cleanup complete - notifications table recreated!' as status;