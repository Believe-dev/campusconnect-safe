-- Fix notifications system completely
-- This migration addresses all notification-related issues

-- 1. Ensure notifications table exists with correct structure
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

-- 2. Drop existing constraint and add comprehensive type constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('info', 'success', 'warning', 'error', 'payout', 'subscription', 'subscription_expiring', 'subscription_expired', 'subscription_activated', 'order_shipped', 'order_delivered', 'seller_approved', 'message', 'order', 'payment', 'seller'));

-- 3. Add missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'reference_id') THEN
        ALTER TABLE notifications ADD COLUMN reference_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'reference_type') THEN
        ALTER TABLE notifications ADD COLUMN reference_type TEXT;
    END IF;
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- 5. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- 7. Create comprehensive RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for updated_at
DROP TRIGGER IF EXISTS notifications_updated_at_trigger ON notifications;
CREATE TRIGGER notifications_updated_at_trigger
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- 10. Enable realtime for notifications
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- 11. Add table to realtime publication
DO $$
BEGIN
    -- Check if publication exists and add table
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Table already in publication, ignore
        NULL;
    WHEN OTHERS THEN
        -- Other errors, log but continue
        RAISE WARNING 'Could not add notifications to realtime publication: %', SQLERRM;
END $$;

-- 12. Clean up any problematic triggers
DROP TRIGGER IF EXISTS auto_notification_trigger ON notifications;
DROP TRIGGER IF EXISTS send_notification_alerts_trigger ON notifications;

-- 13. Create simple payout notification function
CREATE OR REPLACE FUNCTION create_payout_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notifications for status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Payout approved
        IF NEW.status = 'approved' THEN
            INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
            VALUES (
                NEW.user_id,
                'Payout Approved! 💰',
                'Your payout request of ₦' || NEW.amount::text || ' has been approved and processed.',
                'success',
                NEW.id::text,
                'payout_request'
            );
        
        -- Payout rejected  
        ELSIF NEW.status = 'rejected' THEN
            INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
            VALUES (
                NEW.user_id,
                'Payout Request Rejected ❌',
                'Your payout request of ₦' || NEW.amount::text || ' has been rejected. Please contact support for details.',
                'warning',
                NEW.id::text,
                'payout_request'
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- If notification fails, don't break the payout process
        RAISE WARNING 'Failed to create payout notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create payout notification trigger
DROP TRIGGER IF EXISTS payout_status_notification_trigger ON payout_requests;
CREATE TRIGGER payout_status_notification_trigger
    AFTER UPDATE ON payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_payout_notification();

-- 15. Create seller subscription notification function
CREATE OR REPLACE FUNCTION create_subscription_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Subscription activated
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            NEW.user_id,
            'Seller Subscription Activated! 🎉',
            'Your seller subscription is now active. You can start selling on UniMarket!',
            'subscription_activated',
            NEW.id::text,
            'seller_subscription'
        );
    
    -- Subscription expiring (when expires_at is within 3 days)
    ELSIF NEW.status = 'active' AND NEW.expires_at <= NOW() + INTERVAL '3 days' AND NEW.expires_at > NOW() THEN
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            NEW.user_id,
            'Subscription Expiring Soon ⚠️',
            'Your seller subscription expires on ' || NEW.expires_at::date || '. Renew now to continue selling.',
            'subscription_expiring',
            NEW.id::text,
            'seller_subscription'
        )
        ON CONFLICT DO NOTHING; -- Prevent duplicate expiring notifications
    
    -- Subscription expired
    ELSIF NEW.status = 'expired' AND (OLD.status IS NULL OR OLD.status != 'expired') THEN
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            NEW.user_id,
            'Subscription Expired 🔒',
            'Your seller subscription has expired. Renew your subscription to continue selling.',
            'subscription_expired',
            NEW.id::text,
            'seller_subscription'
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create subscription notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Create subscription notification trigger
DROP TRIGGER IF EXISTS subscription_status_notification_trigger ON seller_subscriptions;
CREATE TRIGGER subscription_status_notification_trigger
    AFTER INSERT OR UPDATE ON seller_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION create_subscription_notification();

-- 17. Create order notification function
CREATE OR REPLACE FUNCTION create_order_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Order status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Order shipped
        IF NEW.status = 'shipped' THEN
            INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
            VALUES (
                NEW.buyer_id,
                'Order Shipped! 📦',
                'Your order #' || NEW.id::text || ' has been shipped and is on its way.',
                'order_shipped',
                NEW.id::text,
                'order'
            );
        
        -- Order delivered
        ELSIF NEW.status = 'delivered' THEN
            INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
            VALUES (
                NEW.buyer_id,
                'Order Delivered! ✅',
                'Your order #' || NEW.id::text || ' has been delivered successfully.',
                'order_delivered',
                NEW.id::text,
                'order'
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create order notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Create order notification trigger
DROP TRIGGER IF EXISTS order_status_notification_trigger ON orders;
CREATE TRIGGER order_status_notification_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_notification();

-- 19. Create seller approval notification function
CREATE OR REPLACE FUNCTION create_seller_approval_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Seller approved
    IF NEW.seller_status = 'approved' AND (OLD.seller_status IS NULL OR OLD.seller_status != 'approved') THEN
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            NEW.user_id,
            'Seller Application Approved! 🎉',
            'Congratulations! Your seller application has been approved. You can now start selling on UniMarket.',
            'seller_approved',
            NEW.user_id::text,
            'seller_approval'
        );
    
    -- Seller rejected
    ELSIF NEW.seller_status = 'rejected' AND (OLD.seller_status IS NULL OR OLD.seller_status != 'rejected') THEN
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
            NEW.user_id,
            'Seller Application Rejected ❌',
            'Your seller application has been rejected. Please contact support for more information.',
            'warning',
            NEW.user_id::text,
            'seller_approval'
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create seller approval notification: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Create seller approval notification trigger
DROP TRIGGER IF EXISTS seller_approval_notification_trigger ON profiles;
CREATE TRIGGER seller_approval_notification_trigger
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_seller_approval_notification();

-- 21. Grant necessary permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

-- 22. Create helper function to send notifications programmatically
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

-- 23. Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION send_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;