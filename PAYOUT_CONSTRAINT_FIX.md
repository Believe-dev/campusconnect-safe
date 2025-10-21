# Payout Constraint Error Fix

## Problem
The payout system was failing with this error:
```
Payout update error: new row for relation "payout_requests" violates check constraint "payout_requests_transfer_status_check"
```

## Root Cause
The Admin.tsx code (line 1208) was trying to set `transfer_status: "manual_pending"`, but the database constraint only allowed these values:
- `'pending'`
- `'success'`
- `'failed'`
- `'reversed'`

The value `"manual_pending"` was not in the allowed list, causing the constraint violation.

## Solution
1. **Updated the migration file** (`20250117000004_add_transfer_tracking.sql`) to include the missing values
2. **Created a new migration** (`20250909120000_fix_transfer_status_constraint.sql`) to fix existing databases
3. **Added support for these additional values:**
   - `'manual_pending'` - For manual transfers pending completion
   - `'processing'` - For transfers currently being processed

## How to Apply the Fix

### Option 1: Run the batch script
```bash
fix-payout-constraint.bat
```

### Option 2: Manual migration
```bash
supabase db push --include-all
```

### Option 3: Run SQL directly in Supabase dashboard
```sql
-- Drop the existing constraint
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_transfer_status_check;

-- Add the updated constraint with all required values
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_transfer_status_check 
CHECK (transfer_status IN ('pending', 'success', 'failed', 'reversed', 'manual_pending', 'processing'));

-- Update any existing rows that might have invalid values
UPDATE payout_requests 
SET transfer_status = 'pending' 
WHERE transfer_status IS NULL OR transfer_status NOT IN ('pending', 'success', 'failed', 'reversed', 'manual_pending', 'processing');
```

## Verification
After applying the fix, the payout approval process in the Admin dashboard should work without errors. The system will now properly handle manual transfers with the `"manual_pending"` status.

## Files Modified
- `supabase/migrations/20250117000004_add_transfer_tracking.sql` - Updated original migration
- `supabase/migrations/20250909120000_fix_transfer_status_constraint.sql` - New fix migration
- `fix-payout-constraint.bat` - Batch script to apply the fix