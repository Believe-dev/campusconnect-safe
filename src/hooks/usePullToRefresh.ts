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
      // Add a small delay for better UX (mimics Snapchat)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Invalidate all queries to trigger refetch
      await queryClient.invalidateQueries();
      
      // Clear any cached data for fresh content
      queryClient.clear();
      
      // Show success feedback
      toast({
        title: "✨ Refreshed",
        description: "Your content is now up to date",
        duration: 2000,
      });
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh content. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [queryClient, toast, isOnline]);

  return { handleRefresh };
};