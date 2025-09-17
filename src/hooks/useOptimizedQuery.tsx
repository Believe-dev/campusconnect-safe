import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';

interface OptimizedQueryOptions {
  queryKey: string[];
  queryFn: () => Promise<any>;
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
  placeholderData?: any;
}

export const useOptimizedQuery = ({
  queryKey,
  queryFn,
  staleTime = 15 * 60 * 1000, // 15 minutes
  cacheTime = 60 * 60 * 1000, // 1 hour
  enabled = true,
  placeholderData
}: OptimizedQueryOptions) => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const queryClient = useQueryClient();

  // Get cached data immediately
  const cachedData = queryClient.getQueryData(queryKey);

  return useQuery({
    queryKey,
    queryFn,
    enabled: enabled && isOnline,
    staleTime: isSlowConnection ? staleTime * 2 : staleTime, // Double stale time for slow connections
    cacheTime: isSlowConnection ? cacheTime * 2 : cacheTime,
    placeholderData: placeholderData || cachedData,
    refetchOnMount: !cachedData, // Only refetch if no cached data
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'offlineFirst',
    // Background updates for slow connections
    refetchInterval: isSlowConnection ? 60 * 60 * 1000 : 30 * 60 * 1000, // 1 hour vs 30 min
    refetchIntervalInBackground: true,
    retry: isSlowConnection ? 1 : 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};