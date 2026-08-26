import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';

interface OptimizedQueryOptions {
  queryKey: string[];
  queryFn: () => Promise<any>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  placeholderData?: any;
  // These four used to be silently dropped: callers passed them expecting
  // real-time-ish behavior, but the destructured param list here never
  // picked them up, so every caller actually got the hardcoded defaults
  // below instead — refetchOnMount forced off the moment anything was
  // cached (gcTime defaults to 1hr), refetchOnWindowFocus forced off, and a
  // 30/60-minute refetchInterval regardless of what was requested. Now
  // forwarded, falling back to the previous hardcoded values (or to the
  // alwaysFresh-driven values below) when a caller doesn't specify them.
  refetchOnMount?: boolean | 'always';
  refetchOnWindowFocus?: boolean | 'always';
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
  // Set for data that must never be served stale from cache - payment/escrow/order
  // status, KYC verification status, account balance. Forces staleTime/gcTime to 0 and
  // always refetches on mount, overriding the "skip refetch if we already have any
  // cached value" behavior below (which is correct for product/listing data but is
  // exactly wrong here: a 15-minute-old escrow status is a correctness bug, not a
  // performance win). refetchOnMount/refetchOnWindowFocus above still take priority
  // if a caller passes them explicitly.
  alwaysFresh?: boolean;
}

export const useOptimizedQuery = ({
  queryKey,
  queryFn,
  staleTime = 15 * 60 * 1000, // 15 minutes
  gcTime = 60 * 60 * 1000, // 1 hour
  enabled = true,
  placeholderData,
  refetchOnMount,
  refetchOnWindowFocus,
  refetchInterval,
  refetchIntervalInBackground = true,
  alwaysFresh = false,
}: OptimizedQueryOptions) => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const queryClient = useQueryClient();

  // Get cached data immediately
  const cachedData = queryClient.getQueryData(queryKey);

  return useQuery({
    queryKey,
    queryFn,
    enabled: enabled && isOnline,
    staleTime: alwaysFresh ? 0 : isSlowConnection ? staleTime * 2 : staleTime, // Double stale time for slow connections
    gcTime: alwaysFresh ? 0 : isSlowConnection ? gcTime * 2 : gcTime,
    placeholderData: placeholderData || cachedData,
    // Only refetch if no cached data, unless the caller opts in explicitly
    // (alwaysFresh forces "always" when a caller hasn't set this itself).
    refetchOnMount: refetchOnMount ?? (alwaysFresh ? "always" : !cachedData),
    refetchOnWindowFocus: refetchOnWindowFocus ?? alwaysFresh,
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