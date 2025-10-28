# Seller Visibility Fix

## Problem
Sellers who register and pay their ₦1000 registration fee were not showing up in the admin panel's "Sellers" tab for approval. This prevented admins from approving paid sellers.

## Root Cause
When sellers paid their registration fee, the system was updating `seller_registration_paid = true` but not setting:
- `account_type = 'seller'`
- `seller_status = 'pending'`

The admin panel query was filtering for sellers with `seller_status` of `null` or `pending`, but paid sellers didn't have this status set.

## Files Modified

### 1. SellerRegistrationPayment.tsx
**Fixed**: Added `account_type: "seller"` and `seller_status: "pending"` to profile update after successful payment.

### 2. SignupPage.tsx  
**Fixed**: Added `account_type: "seller"` and `seller_status: "pending"` to profile update during seller signup flow.

### 3. Admin.tsx
**Fixed**: Updated `fetchPendingSellers` query to include sellers who have `seller_registration_paid = true`, ensuring paid sellers appear in the admin panel.

### 4. Database Migration
**Created**: `20250909120006_fix_paid_sellers_visibility.sql`
- Updates existing paid sellers to have proper status
- Creates trigger to prevent future occurrences
- Provides data consistency

## How to Apply the Fix

### Step 1: Run Database Migration
Execute the SQL in `fix_paid_sellers.sql` in your Supabase SQL editor:

```sql
-- This will fix existing data and prevent future issues
UPDATE profiles 
SET 
    seller_status = 'pending',
    account_type = 'seller'
WHERE 
    seller_registration_paid = true 
    AND (seller_status IS NULL OR seller_status != 'pending')
    AND (account_type IS NULL OR account_type != 'seller');
```

### Step 2: Deploy Code Changes
The modified React components will ensure future seller registrations work correctly.

### Step 3: Verify Fix
1. Check admin panel "Sellers" tab
2. Paid sellers should now appear for approval
3. New seller registrations should work correctly

## Prevention
- Database trigger ensures `seller_status = 'pending'` when `seller_registration_paid = true`
- Updated application code sets proper status during payment
- Admin query includes paid sellers regardless of status

## Testing
After applying the fix:
1. Existing paid sellers should appear in admin panel
2. New seller registrations should immediately appear for approval
3. Admin can approve/reject sellers as expected

## Impact
- ✅ Existing paid sellers now visible for approval
- ✅ Future seller registrations work correctly  
- ✅ No data loss or corruption
- ✅ Backward compatible with existing system