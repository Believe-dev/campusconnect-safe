-- Fix wallet data inconsistencies and ensure all users have wallets

-- 1. Create wallets for users who don't have them
INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
SELECT 
    p.user_id,
    0.00,
    0.00,
    0.00,
    0.00
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.user_id
WHERE w.id IS NULL;

-- 2. Update payout requests to use correct status values
UPDATE payout_requests 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'processing', 'completed', 'approved', 'failed', 'cancelled', 'rejected');

-- 3. Fix any null wallet references in payout requests
UPDATE payout_requests pr
SET wallet_id = w.id
FROM wallets w
WHERE pr.wallet_id IS NULL 
AND w.user_id = pr.user_id;

-- 4. Check for and fix any negative balances (shouldn't happen but just in case)
UPDATE wallets 
SET available_balance = 0.00 
WHERE available_balance < 0;

-- 5. Ensure all decimal fields have proper precision
UPDATE wallets 
SET 
    available_balance = ROUND(available_balance, 2),
    pending_balance = ROUND(pending_balance, 2),
    total_earnings = ROUND(total_earnings, 2),
    total_commission_paid = ROUND(total_commission_paid, 2);

UPDATE payout_requests 
SET amount = ROUND(amount, 2);