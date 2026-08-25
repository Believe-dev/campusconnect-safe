-- Fix transfer_status constraint to include missing values used in Admin.tsx
-- This fixes the error: "new row for relation "payout_requests" violates check constraint "payout_requests_transfer_status_check""

-- Drop the existing constraint
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_transfer_status_check;

-- Add the updated constraint with all required values
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_transfer_status_check 
CHECK (transfer_status IN ('pending', 'success', 'failed', 'reversed', 'manual_pending', 'processing'));

-- Update any existing rows that might have invalid values
UPDATE payout_requests 
SET transfer_status = 'pending' 
WHERE transfer_status IS NULL OR transfer_status NOT IN ('pending', 'success', 'failed', 'reversed', 'manual_pending', 'processing');