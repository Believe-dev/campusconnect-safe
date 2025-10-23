-- Final cleanup - removes ALL functions that could reference net schema
-- Run this in Supabase SQL Editor

-- Drop ALL functions that might have net dependencies
DROP FUNCTION IF EXISTS send_notification_alerts CASCADE;
DROP FUNCTION IF EXISTS send_onesignal_notification CASCADE;
DROP FUNCTION IF EXISTS notify_user CASCADE;
DROP FUNCTION IF EXISTS notify_users CASCADE;
DROP FUNCTION IF EXISTS send_email_notification CASCADE;
DROP FUNCTION IF EXISTS send_push_notification CASCADE;
DROP FUNCTION IF EXISTS create_notification_with_email CASCADE;
DROP FUNCTION IF EXISTS auto_email_notifications CASCADE;

-- Drop all versions of send_notification function
DROP FUNCTION IF EXISTS send_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS send_notification(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS send_notification(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS send_notification(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS send_notification(UUID) CASCADE;

-- Drop ALL notification triggers
DROP TRIGGER IF EXISTS auto_notification_trigger ON notifications;
DROP TRIGGER IF EXISTS send_notification_alerts_trigger ON notifications;
DROP TRIGGER IF EXISTS notification_trigger ON notifications;
DROP TRIGGER IF EXISTS email_notification_trigger ON notifications;
DROP TRIGGER IF EXISTS push_notification_trigger ON notifications;

-- Ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    reference_id TEXT,
    reference_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix type constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('info', 'success', 'warning', 'error', 'payout', 'subscription', 'subscription_expiring', 'subscription_expired', 'subscription_activated', 'order_shipped', 'order_delivered', 'seller_approved', 'message', 'order', 'payment', 'seller'));

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

SELECT 'Notifications system cleaned and ready!' as status;