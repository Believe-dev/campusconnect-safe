-- Add transfer tracking fields to payout_requests table
ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS transfer_code TEXT,
ADD COLUMN IF NOT EXISTS recipient_code TEXT,
ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT 'pending' CHECK (transfer_status IN ('pending', 'success', 'failed', 'reversed'));

-- Update existing payout requests to have proper status
UPDATE payout_requests 
SET transfer_status = 'pending' 
WHERE transfer_status IS NULL;

-- Add index for transfer tracking
CREATE INDEX IF NOT EXISTS idx_payout_requests_transfer_code ON payout_requests(transfer_code);
CREATE INDEX IF NOT EXISTS idx_payout_requests_transfer_status ON payout_requests(transfer_status);