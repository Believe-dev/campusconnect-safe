-- Step 2: Drop functions (run after step 1)
DROP FUNCTION IF EXISTS notify_payout_status_change();
DROP FUNCTION IF EXISTS notify_subscription_expiry();
DROP FUNCTION IF EXISTS notify_wallet_transaction();