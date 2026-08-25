-- Step 3: Fix payout table (run after step 2)
ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS transfer_code TEXT,
ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT 'pending';

ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_transfer_status_check;
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_transfer_status_check 
CHECK (transfer_status IN ('pending', 'success', 'failed', 'reversed', 'manual_pending', 'processing'));

UPDATE payout_requests 
SET transfer_status = 'pending' 
WHERE transfer_status IS NULL;