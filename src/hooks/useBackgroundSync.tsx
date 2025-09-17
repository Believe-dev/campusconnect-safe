import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';

export const useBackgroundSync = () => {
  const queryClient = useQueryClient();
  const { isOnline, isSlowConnection } = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) return;

    // Background sync for critical data
    const syncInterval = isSlowConnection ? 10 * 60 * 1000 : 5 * 60 * 1000; // 10min vs 5min

    const interval = setInterval(() => {
      // Invalidate and refetch critical queries in background
      queryClient.invalidateQueries({ 
        queryKey: ['cart'], 
        refetchType: 'none' // Don't refetch immediately, just mark as stale
      });
      queryClient.invalidateQueries({ 
        queryKey: ['orders'], 
        refetchType: 'none' 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['notifications'], 
        refetchType: 'none' 
      });
    }, syncInterval);

    return () => clearInterval(interval);
  }, [queryClient, isOnline, isSlowConnection]);

  // Prefetch on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOnline) {
        // Soft refetch - only if data is stale
        queryClient.refetchQueries({ 
          stale: true,
          type: 'active'
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [queryClient, isOnline]);
};