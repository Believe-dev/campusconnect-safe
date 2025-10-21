# Manual Payout System

## Overview

The payout system has been updated to be fully manual. When sellers request payouts, admins approve them and manually transfer the money to the provided bank accounts. No automated transfer APIs (like Paystack transfers) are used.

## How It Works

### 1. Seller Payout Request
- Sellers request payouts through the wallet interface
- They provide their bank account details (bank name, account number, account name)
- The request is stored in the `payout_requests` table with status `pending`

### 2. Admin Approval Process
- Admins see payout requests in the Admin Dashboard > Escrow tab
- When approving a payout request:
  1. **Funds are immediately deducted** from the seller's wallet
  2. Payout status is updated to `approved`
  3. Transfer status is set to `manual_pending`
  4. A manual transfer reference is generated (e.g., `MANUAL_1234567890_abc12345`)
  5. Admin notes include transfer instructions
  6. Seller receives a notification that funds have been deducted and transfer is pending

### 3. Manual Transfer
- Admin manually transfers the money to the seller's bank account
- Uses the bank details provided in the payout request
- Uses the generated reference code for the transfer
- No API calls to payment processors

### 4. Database Changes
- **Wallet balance**: Reduced immediately upon approval
- **Payout status**: `pending` → `approved`
- **Transfer status**: `manual_pending` (can be updated to `completed` later)
- **Transaction record**: Created in `wallet_transactions` table

## Key Benefits

1. **No API Dependencies**: No reliance on Paystack transfer API or other payment processors
2. **Full Control**: Admins have complete control over when and how transfers are made
3. **Audit Trail**: All transactions are recorded with manual transfer references
4. **Immediate Deduction**: Prevents double-spending by deducting funds immediately upon approval

## Admin Instructions

### Approving Payouts
1. Go to Admin Dashboard > Escrow tab
2. Find pending payout requests
3. Click "Approve" on a payout request
4. Funds are automatically deducted from seller's wallet
5. Note the transfer details provided in the success message

### Making Manual Transfers
1. Use your bank's online banking or mobile app
2. Transfer the exact amount to the provided bank account
3. Use the generated reference code in the transfer description
4. Keep records of the transfer for reconciliation

### Transfer Details Format
```
Amount: ₦[amount]
Recipient: [account_name]
Bank: [bank_name]
Account Number: [account_number]
Reference: MANUAL_[timestamp]_[payout_id]
```

## Database Schema

### Payout Requests Table
- `status`: `pending` | `approved` | `rejected` | `completed`
- `transfer_status`: `manual_pending` | `processing` | `completed` | `failed`
- `transfer_code`: Manual transfer reference
- `admin_notes`: Transfer instructions and details

### Wallet Transactions Table
- `type`: `payout`
- `amount`: Negative value (debit)
- `reference_type`: `manual_transfer`
- `reference_id`: Transfer code
- `status`: `completed`

## Security Features

1. **Balance Verification**: Checks wallet balance before deducting funds
2. **Admin Authentication**: Only authenticated admins can approve payouts
3. **Audit Trail**: All actions are logged with timestamps and admin IDs
4. **Immediate Deduction**: Prevents sellers from spending the same money twice

## Error Handling

- If wallet has insufficient balance, approval is rejected
- If payout is not in `pending` status, approval is rejected
- Database transactions are atomic to prevent partial updates
- Failed operations are logged for debugging

## Notifications

### For Sellers
- **Approval**: "Payout Approved! Your funds have been deducted and will be transferred within 1-2 business days"
- **Rejection**: "Payout Request Rejected" with reason

### For Admins
- Success message with transfer details after approval
- Error messages if approval fails

## Migration Notes

- Existing Paystack transfer code has been removed/disabled
- Edge functions updated to generate manual transfer codes
- Database constraints updated to support new transfer statuses
- Admin interface updated to show manual transfer instructions