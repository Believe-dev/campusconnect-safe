import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';

interface OptimizedQueryOptions {
  queryKey: string[];
  queryFn: () => Promise<any>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  placeholderData?: any;
  // These four used to be silently dropped: callers (Cart.tsx, Orders.tsx)
  // passed them expecting real-time-ish behavior, but the destructured
  // param list here never picked them up, so every caller actually got the
  // hardcoded defaults below instead — refetchOnMount forced off the
  // moment anything was cached (gcTime defaults to 1hr), refetchOnWindowFocus
  // forced off, and a 30/60-minute refetchInterval regardless of what was
  // requested. In practice that meant navigating back to a page like Cart
  // after changing data elsewhere just showed stale cached data until a
  // full browser reload wiped the in-memory query cache. Now forwarded,
  // falling back to the previous hardcoded values when a caller doesn't
  // specify them, so existing callers that don't pass these keep the same
  // behavior as before.
  refetchOnMount?: boolean | 'always';
  refetchOnWindowFocus?: boolean | 'always';
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
}

export const useOptimizedQuery = ({
  queryKey,
  queryFn,
  staleTime = 15 * 60 * 1000, // 15 minutes
  gcTime = 60 * 60 * 1000, // 1 hour
  enabled = true,
  placeholderData,
  refetchOnMount,
  refetchOnWindowFocus = false,
  refetchInterval,
  refetchIntervalInBackground = true,
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
    gcTime: isSlowConnection ? gcTime * 2 : gcTime,
    placeholderData: placeholderData || cachedData,
    refetchOnMount: refetchOnMount ?? !cachedData, // Only refetch if no cached data, unless the caller opts in explicitly
    refetchOnWindowFocus,
    refetchOnReconnect: true,
    networkMode: 'offlineFirst',
    // Background updates for slow connections
    refetchInterval:
      refetchInterval ?? (isSlowConnection ? 60 * 60 * 1000 : 30 * 60 * 1000), // 1 hour vs 30 min
    refetchIntervalInBackground,
    retry: isSlowConnection ? 1 : 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};