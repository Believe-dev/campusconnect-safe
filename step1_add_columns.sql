-- Step 1: Add columns only
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS reference_id TEXT,
ADD COLUMN IF NOT EXISTS reference_type TEXT;