-- Step 1: Drop triggers only (run this first)
DROP TRIGGER IF EXISTS payout_notification_trigger ON payout_requests;
DROP TRIGGER IF EXISTS subscription_expiry_notification_trigger ON seller_subscriptions;
DROP TRIGGER IF EXISTS wallet_transaction_notification_trigger ON wallet_transactions;