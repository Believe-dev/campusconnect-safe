# Message Count and Dispute Notification Fixes

## Issues Fixed

### 1. Message Count for Completed Orders
**Problem**: Sellers were seeing unread message notifications for orders that were already completed.

**Solution**: 
- Updated `useMessagesCount.tsx` to exclude conversations related to completed orders from the unread count for sellers
- When an order status is 'confirmed', messages from that conversation no longer contribute to the seller's unread count
- Buyers still see all message counts normally

### 2. Dispute Notifications for Sellers
**Problem**: Sellers weren't receiving detailed notifications when their products were disputed.

**Solution**:
- Created automatic trigger `notify_seller_on_dispute()` that fires when order status changes to 'disputed'
- Enhanced dispute notifications to include:
  - Product details
  - Order ID and amount
  - Buyer information
  - Order date
  - Required actions and timeline
- Sends both email and detailed in-app notifications

## Implementation Details

### Message Count Fix
```typescript
// Filters out conversations with completed orders for sellers
const activeConversations = conversations?.filter(conv => {
  if (conv.seller_id === user.id && conv.orders?.some(order => order.status === 'confirmed')) {
    return false; // Exclude from unread count
  }
  return true;
}) || [];
```

### Dispute Notification Trigger
```sql
-- Automatically triggers when order status changes to 'disputed'
CREATE TRIGGER trigger_dispute_notification
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_seller_on_dispute();
```

### Enhanced Notification Content
- **Email**: Detailed investigation notice with required actions
- **In-app**: Structured notification with all order details
- **Timeline**: 48-hour response requirement clearly stated

## Benefits

1. **Cleaner UX**: Sellers don't see irrelevant unread counts for completed transactions
2. **Better Communication**: Sellers immediately know about disputes with full context
3. **Faster Resolution**: Clear action items and timelines in notifications
4. **Automated Process**: No manual intervention needed for dispute notifications

## Files Modified

- `src/hooks/useMessagesCount.tsx` - Message count filtering
- `supabase/migrations/20250115000002_message_count_and_dispute_fixes.sql` - Database triggers and functions
- Enhanced dispute notification templates with detailed information