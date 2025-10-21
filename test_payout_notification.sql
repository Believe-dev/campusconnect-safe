-- Test payout notification trigger
-- Run this in Supabase SQL Editor

-- Check if the payout notification trigger exists
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'payout_requests';

-- Test the trigger by updating a payout status (replace PAYOUT_ID with real ID)
-- UPDATE payout_requests 
-- SET status = 'approved' 
-- WHERE id = 'YOUR_PAYOUT_ID_HERE';

-- Check if notification was created
SELECT id, user_id, title, message, type, created_at 
FROM notifications 
WHERE title LIKE '%Payout%'
ORDER BY created_at DESC 
LIMIT 3;