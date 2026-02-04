-- Check payout_requests table structure and constraints
-- Run this to see what columns and constraints exist

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'payout_requests' 
ORDER BY ordinal_position;

-- Check constraints
SELECT tc.constraint_name, tc.constraint_type, cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'payout_requests';

-- Check if transfer_code and transfer_status columns exist
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payout_requests' AND column_name = 'transfer_code'
) as transfer_code_exists,
EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payout_requests' AND column_name = 'transfer_status'
) as transfer_status_exists;