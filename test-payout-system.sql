-- Test script to verify payout system is working
-- Run this in Supabase SQL Editor to check the system

-- 1. Check if all required tables exist
SELECT 
    'wallets' as table_name, 
    COUNT(*) as record_count 
FROM wallets
UNION ALL
SELECT 
    'payout_requests' as table_name, 
    COUNT(*) as record_count 
FROM payout_requests
UNION ALL
SELECT 
    'wallet_transactions' as table_name, 
    COUNT(*) as record_count 
FROM wallet_transactions;

-- 2. Check payout requests status distribution
SELECT 
    status,
    transfer_status,
    COUNT(*) as count
FROM payout_requests 
GROUP BY status, transfer_status
ORDER BY status;

-- 3. Check recent payout requests (last 10)
SELECT 
    pr.id,
    pr.amount,
    pr.bank_name,
    pr.bank_account_number,
    pr.status,
    pr.transfer_status,
    pr.transfer_code,
    pr.admin_notes,
    pr.created_at,
    p.full_name as user_name,
    p.email as user_email
FROM payout_requests pr
LEFT JOIN profiles p ON p.user_id = pr.user_id
ORDER BY pr.created_at DESC
LIMIT 10;

-- 4. Check wallet balances for users with payout requests
SELECT 
    p.full_name,
    p.email,
    w.available_balance,
    w.total_earnings,
    COUNT(pr.id) as payout_requests_count
FROM profiles p
JOIN wallets w ON w.user_id = p.user_id
LEFT JOIN payout_requests pr ON pr.user_id = p.user_id
WHERE w.available_balance > 0 OR w.total_earnings > 0
GROUP BY p.full_name, p.email, w.available_balance, w.total_earnings
ORDER BY w.available_balance DESC;

-- 5. Check if process_payout_request function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%payout%'
AND routine_schema = 'public';

-- 6. Test payout eligibility function (if it exists)
-- Uncomment and replace with actual payout ID to test
-- SELECT * FROM check_payout_eligibility('your-payout-id-here');

-- 7. Check recent wallet transactions
SELECT 
    wt.type,
    wt.amount,
    wt.description,
    wt.reference_type,
    wt.status,
    wt.created_at,
    p.full_name as user_name
FROM wallet_transactions wt
LEFT JOIN profiles p ON p.user_id = wt.user_id
ORDER BY wt.created_at DESC
LIMIT 20;