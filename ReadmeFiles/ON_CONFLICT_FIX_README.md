# ON CONFLICT Error Fix

## Problem
Users were getting the error: "there is no unique or exclusion constraint matching the ON CONFLICT specification" when trying to edit user details or extend seller subscriptions.

## Root Cause
The error occurred because several database functions were using `ON CONFLICT` clauses without ensuring the necessary unique constraints existed on the target tables. This particularly affected:

1. `handle_new_user()` function - used during user registration
2. `create_user_wallet()` function - used when creating wallets
3. `assign_seller_role()` function - used when assigning seller roles
4. Various other functions that tried to use `ON CONFLICT` without proper constraints

## Solution
Created two migration files that fix the issue:

### 1. `20250130000001_fix_on_conflict_error.sql`
- Ensures the `wallets` table has a proper unique constraint on `user_id`
- Replaces all `ON CONFLICT` usage with `EXISTS` checks
- Updates all problematic functions to use safe insertion patterns
- Adds proper error handling and logging

### 2. `20250130000002_fix_profile_update_functions.sql`
- Creates safe wrapper functions for common profile operations
- Provides functions specifically for updating user profiles and extending subscriptions
- Handles edge cases for existing users

## New Safe Functions Available

### For Profile Updates:
```sql
-- Update user profile safely
SELECT update_user_profile(
    user_id, 
    full_name, 
    phone_number, 
    university_name, 
    student_id, 
    bio, 
    avatar_url
);
```

### For Subscription Management:
```sql
-- Extend seller subscription by 30 days (default)
SELECT extend_seller_subscription(user_id, 30);

-- Activate seller features
SELECT activate_seller_features(user_id);

-- Record subscription payment
SELECT update_seller_subscription_payment(user_id, 'payment_ref', 5000.00);
```

## How to Apply the Fix

1. Run the migration files in order:
   ```bash
   supabase db push
   ```

2. Or apply them manually through the Supabase dashboard SQL editor

## What Changed

### Before (Problematic):
```sql
INSERT INTO wallets (user_id, balance)
VALUES (user_id, 0.00)
ON CONFLICT (user_id) DO NOTHING;  -- This would fail if no unique constraint
```

### After (Fixed):
```sql
IF NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = user_id) THEN
    INSERT INTO wallets (user_id, balance)
    VALUES (user_id, 0.00);
END IF;
```

## Benefits
- ✅ No more ON CONFLICT errors
- ✅ Better error handling and logging
- ✅ Safe for existing users
- ✅ Maintains data integrity
- ✅ Provides clear feedback on failures

## Testing
After applying the fix, test:
1. User registration (both buyer and seller)
2. Profile updates
3. Subscription extensions
4. Role assignments

All operations should now work without the ON CONFLICT error.