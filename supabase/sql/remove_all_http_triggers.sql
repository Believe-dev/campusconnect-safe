-- Remove all HTTP-dependent triggers and functions causing "schema net does not exist" error
-- Run this to completely disable HTTP notifications

-- Drop all notification triggers
DROP TRIGGER IF EXISTS payout_notification_trigger ON payout_requests;
DROP TRIGGER IF EXISTS payout_status_notification_trigger ON payout_requests;
DROP TRIGGER IF EXISTS subscription_expiry_notification_trigger ON seller_subscriptions;
DROP TRIGGER IF EXISTS wallet_transaction_notification_trigger ON wallet_transactions;
DROP TRIGGER IF EXISTS notification_trigger ON notifications;
DROP TRIGGER IF EXISTS send_payout_notification_trigger ON payout_requests;

-- Drop all HTTP-dependent functions with CASCADE
DROP FUNCTION IF EXISTS notify_payout_status_change() CASCADE;
DROP FUNCTION IF EXISTS notify_subscription_expiry() CASCADE;
DROP FUNCTION IF EXISTS notify_wallet_transaction() CASCADE;
DROP FUNCTION IF EXISTS create_payout_notification() CASCADE;
DROP FUNCTION IF EXISTS send_payout_notification() CASCADE;
DROP FUNCTION IF EXISTS http_post_request(text, json) CASCADE;
DROP FUNCTION IF EXISTS send_notification_email(text, text, text, text) CASCADE;

-- Add missing columns to payout_requests if they don't exist
ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS transfer_code TEXT,
ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT 'pending';

-- Fix constraint to allow manual_pending
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_transfer_status_check;
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_transfer_status_check 
CHECK (transfer_status IN ('pending', 'success', 'failed', 'reversed', 'manual_pending', 'processing'));

-- Update existing rows
UPDATE payout_requests 
SET transfer_status = 'pending' 
WHERE transfer_status IS NULL;