-- Fix notification system issues
-- Run this in Supabase SQL Editor

-- Enable HTTP extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Grant necessary permissions for notification functions (only if net schema exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'net') THEN
        GRANT USAGE ON SCHEMA net TO authenticated;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO authenticated;
    END IF;
END $$;

-- Update the transfer_status constraint to include all required values
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_transfer_status_check;
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_transfer_status_check 
CHECK (transfer_status IN ('pending', 'success', 'failed', 'reversed', 'manual_pending', 'processing'));

-- Add approved status to payout_requests if not exists
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_status_check;
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_status_check 
CHECK (status IN ('pending', 'processing', 'approved', 'completed', 'failed', 'cancelled', 'rejected'));