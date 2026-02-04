# Real-Time Implementation Guide

## Overview

Your marketplace app now has comprehensive real-time functionality that provides instant updates without page reloads. This implementation uses Supabase real-time subscriptions with optimistic updates, automatic retry mechanisms, and performance optimizations.

## Key Features Implemented

### 1. Real-Time Messaging System
- **Instant message delivery** - Messages appear immediately for both sender and receiver
- **Optimistic updates** - Messages show instantly before server confirmation
- **Automatic retry** - Failed messages are automatically retried with exponential backoff
- **Typing indicators** - Shows when users are typing
- **Read receipts** - Messages are marked as read automatically
- **Connection status** - Visual indicators show connection health

### 2. Global State Management
- **RealTimeContext** - Centralized real-time state management
- **Automatic reconnection** - Handles network drops with smart retry logic
- **Heartbeat monitoring** - Keeps connections alive and detects issues
- **Performance monitoring** - Tracks latency and connection metrics

### 3. Data Synchronization
- **Product updates** - New products appear instantly across all users
- **Order status changes** - Real-time order updates and notifications
- **Notification system** - Instant push notifications for important events
- **Cart synchronization** - Cart updates sync across devices

### 4. Performance Optimizations
- **Memory efficient** - Optimized for low-end devices
- **Bandwidth conscious** - Minimal data transfer with smart caching
- **Battery friendly** - Reduces background activity when app is hidden
- **Connection pooling** - Reuses connections efficiently

## Implementation Details

### Core Components

#### 1. RealTimeProvider (`src/contexts/RealTimeContext.tsx`)
```tsx
// Wrap your app with RealTimeProvider
<RealTimeProvider>
  <App />
</RealTimeProvider>
```

**Features:**
- Connection management with auto-retry
- Subscription lifecycle management
- Heartbeat monitoring
- Performance metrics tracking

#### 2. Optimistic Messaging (`src/hooks/useOptimisticMessages.ts`)
```tsx
const { messages, sendMessage, markAsRead } = useOptimisticMessages({
  conversationId,
  currentUserId
});
```

**Features:**
- Instant message display
- Automatic retry for failed messages
- Read status management
- Message deletion with rollback

#### 3. Real-Time Data Hook (`src/hooks/useRealTimeData.ts`)
```tsx
const { data, loading, optimisticAdd } = useRealTimeData({
  table: 'products',
  filter: 'category=eq.electronics',
  orderBy: { column: 'created_at', ascending: false }
});
```

**Features:**
- Live data synchronization
- Optimistic updates
- Automatic filtering and sorting
- Error handling with fallbacks

### Usage Examples

#### Real-Time Chat
```tsx
import OptimizedChat from '@/components/chat/OptimizedChat';

<OptimizedChat
  conversationId={conversationId}
  currentUserId={user.id}
  otherUser={otherUser}
  onClose={() => navigate('/messages')}
/>
```

#### Live Product Updates
```tsx
import { useRealTimeProducts } from '@/hooks/useRealTimeData';

const { data: products, loading } = useRealTimeProducts({
  category: 'electronics',
  limit: 50
});
```

#### Connection Status
```tsx
import RealTimeStatus from '@/components/common/RealTimeStatus';

<RealTimeStatus showText={true} />
```

## Configuration

### Environment Variables
No additional environment variables needed - uses existing Supabase configuration.

### Database Setup
The real-time system works with your existing database schema. Ensure Row Level Security (RLS) is properly configured for real-time subscriptions.

### Performance Tuning

#### Memory Optimization
```tsx
// Automatic memory management based on device capabilities
const isLowMemory = navigator.deviceMemory < 2;
```

#### Connection Management
```tsx
// Heartbeat interval (adjustable)
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // Base delay in ms
```

## Best Practices

### 1. Subscription Management
- Always unsubscribe when components unmount
- Use unique channel names to avoid conflicts
- Batch multiple subscriptions when possible

### 2. Optimistic Updates
- Always provide rollback mechanisms
- Show loading states for pending operations
- Handle network failures gracefully

### 3. Performance
- Limit subscription scope to necessary data
- Use pagination for large datasets
- Implement connection pooling for multiple subscriptions

### 4. Error Handling
- Provide user feedback for connection issues
- Implement automatic retry with exponential backoff
- Log errors for debugging without exposing sensitive data

## Monitoring and Debugging

### Connection Status
Monitor real-time connection health:
```tsx
const { state } = useRealTime();
console.log('Connection status:', state.connectionStatus);
console.log('Last activity:', state.lastActivity);
console.log('Retry count:', state.retryCount);
```

### Performance Metrics
Track performance with the built-in monitor:
```tsx
import PerformanceMonitor from '@/components/common/PerformanceMonitor';

<PerformanceMonitor showDetails={true} />
```

### Debug Mode
Enable detailed logging in development:
```tsx
// Add to your development environment
window.REALTIME_DEBUG = true;
```

## Troubleshooting

### Common Issues

#### 1. Messages Not Appearing
- Check network connection
- Verify user authentication
- Ensure proper RLS policies
- Check browser console for errors

#### 2. High Memory Usage
- Reduce subscription scope
- Implement proper cleanup
- Use pagination for large datasets
- Monitor with Performance Monitor

#### 3. Connection Drops
- Check network stability
- Verify Supabase project status
- Review retry configuration
- Monitor heartbeat logs

### Performance Issues
- Use React DevTools Profiler
- Monitor network tab in browser
- Check memory usage in Task Manager
- Review subscription patterns

## Security Considerations

### Data Protection
- All real-time data respects RLS policies
- Messages are encrypted in transit
- No sensitive data in client-side logs
- Proper authentication checks

### Rate Limiting
- Built-in connection throttling
- Message sending rate limits
- Subscription count limits
- Automatic backoff on errors

## Migration Guide

### From Polling to Real-Time
1. Replace `setInterval` polling with real-time subscriptions
2. Update state management to use optimistic updates
3. Add error handling and retry logic
4. Test thoroughly with network interruptions

### Existing Components
Most existing components work without changes. Key updates:
- Replace manual refresh buttons with automatic updates
- Add loading states for optimistic operations
- Update error handling for real-time failures

## Future Enhancements

### Planned Features
- Presence indicators (online/offline status)
- Message reactions and threading
- File sharing with real-time progress
- Voice/video call integration
- Advanced analytics and insights

### Scalability
- Connection pooling optimization
- Edge function integration
- CDN for static assets
- Database query optimization

## Support

For issues or questions:
1. Check browser console for errors
2. Review network connectivity
3. Verify Supabase project status
4. Test with different devices/browsers
5. Check RLS policies and permissions

The real-time system is designed to be robust and self-healing, but monitoring and proper error handling are essential for the best user experience.