-- Debug script to identify payout processing issues
-- Run this to check the current state of payout requests and wallets

-- 1. Check all pending payout requests
SELECT 
    pr.id as payout_id,
    pr.user_id,
    pr.wallet_id,
    pr.amount as requested_amount,
    pr.status as payout_status,
    pr.bank_account_name,
    pr.bank_name,
    pr.created_at,
    p.full_name,
    p.email
FROM payout_requests pr
LEFT JOIN profiles p ON p.user_id = pr.user_id
WHERE pr.status = 'pending'
ORDER BY pr.created_at DESC;

-- 2. Check wallet balances for users with pending payouts
SELECT 
    w.id as wallet_id,
    w.user_id,
    w.available_balance,
    w.pending_balance,
    w.total_earnings,
    p.full_name,
    p.email,
    pr.amount as requested_payout,
    (w.available_balance >= pr.amount) as sufficient_balance
FROM wallets w
LEFT JOIN profiles p ON p.user_id = w.user_id
LEFT JOIN payout_requests pr ON pr.wallet_id = w.id AND pr.status = 'pending'
WHERE pr.id IS NOT NULL
ORDER BY w.user_id;

-- 3. Check for any orphaned payout requests (wallet doesn't exist)
SELECT 
    pr.id as payout_id,
    pr.user_id,
    pr.wallet_id,
    pr.amount,
    pr.status,
    CASE 
        WHEN w.id IS NULL THEN 'WALLET_NOT_FOUND'
        ELSE 'WALLET_EXISTS'
    END as wallet_status
FROM payout_requests pr
LEFT JOIN wallets w ON w.id = pr.wallet_id
WHERE pr.status = 'pending';

-- 4. Check recent wallet transactions for context
SELECT 
    wt.id,
    wt.user_id,
    wt.type,
    wt.amount,
    wt.description,
    wt.status,
    wt.created_at,
    p.full_name
FROM wallet_transactions wt
LEFT JOIN profiles p ON p.user_id = wt.user_id
WHERE wt.created_at >= NOW() - INTERVAL '7 days'
ORDER BY wt.created_at DESC
LIMIT 20;

-- 5. Test the check_payout_eligibility function for a specific payout
-- Replace 'YOUR_PAYOUT_ID_HERE' with an actual payout ID from the first query
-- SELECT * FROM check_payout_eligibility('YOUR_PAYOUT_ID_HERE');