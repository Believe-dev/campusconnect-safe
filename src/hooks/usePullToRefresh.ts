import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const usePullToRefresh = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  const handleRefresh = useCallback(async () => {
    // Check network status
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your connection and try again.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      // Add delay for UniMarket loader animation
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Clear all caches like browser refresh
      queryClient.clear();
      
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage (except essential data)
      const essentialKeys = ['auth-token', 'user-preferences', 'theme'];
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !essentialKeys.some(essential => key.includes(essential))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Force reload the entire app (like browser refresh)
      window.location.reload();
      
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh UniMarket. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [queryClient, toast, isOnline]);

  return { handleRefresh };
};