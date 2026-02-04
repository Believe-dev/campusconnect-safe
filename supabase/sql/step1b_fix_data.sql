-- Step 1b: Fix existing data (run after step 1, before step 2)
-- Check what types exist
SELECT DISTINCT type FROM notifications;

-- Update invalid types to 'info'
UPDATE notifications 
SET type = 'info' 
WHERE type NOT IN ('info', 'success', 'warning', 'error');