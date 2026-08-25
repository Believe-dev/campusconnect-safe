-- Emergency fix for payout system - disable HTTP triggers and fix table
-- Run this immediately to fix the "schema net does not exist" error

-- 1. Drop all HTTP-dependent triggers
DROP TRIGGER IF EXISTS payout_notification_trigger ON payout_requests;
DROP TRIGGER IF EXISTS subscription_expiry_notification_trigger ON seller_subscriptions;
DROP TRIGGER IF EXISTS wallet_transaction_notification_trigger ON wallet_transactions;

-- 2. Drop HTTP-dependent functions
DROP FUNCTION IF EXISTS notify_payout_status_change();
DROP FUNCTION IF EXISTS notify_subscription_expiry();
DROP FUNCTION IF EXISTS notify_wallet_transaction();

-- 3. Add missing columns to payout_requests
ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS transfer_code TEXT,
ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT 'pending';

-- 4. Fix constraint to allow manual_pending
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_transfer_status_check;
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_transfer_status_check 
CHECK (transfer_status IN ('pending', 'success', 'failed', 'reversed', 'manual_pending', 'processing'));

-- 5. Update existing rows
UPDATE payout_requests 
SET transfer_status = 'pending' 
WHERE transfer_status IS NULL;

-- 6. Create simple notification trigger without HTTP
CREATE OR REPLACE FUNCTION create_payout_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification if status changed to approved or rejected
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            reference_id,
            reference_type,
            created_at
        ) VALUES (
            NEW.user_id,
            CASE WHEN NEW.status = 'approved' THEN 'payout_approved' ELSE 'payout_rejected' END,
            CASE WHEN NEW.status = 'approved' THEN 'Payout Approved' ELSE 'Payout Rejected' END,
            CASE 
                WHEN NEW.status = 'approved' THEN 'Your payout request of ₦' || NEW.amount || ' has been approved and will be processed within 48 hours.'
                ELSE 'Your payout request of ₦' || NEW.amount || ' has been rejected.'
            END,
            NEW.id::text,
            'payout',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger
CREATE TRIGGER payout_notification_trigger
    AFTER UPDATE ON payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_payout_notification();