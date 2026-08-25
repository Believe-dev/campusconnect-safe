import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealTime } from '@/contexts/RealTimeContext';

interface UseRealTimeDataOptions<T> {
  table: string;
  select?: string;
  filter?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

interface RealTimeDataState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export function useRealTimeData<T = any>(options: UseRealTimeDataOptions<T>) {
  const {
    table,
    select = '*',
    filter,
    orderBy,
    limit,
    enabled = true,
    refetchInterval
  } = options;

  const [state, setState] = useState<RealTimeDataState<T>>({
    data: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  const { state: realTimeState } = useRealTime();
  const subscriptionRef = useRef<(() => void) | null>(null);
  const refetchTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      let query = supabase.from(table).select(select);

      if (filter) {
        // Parse filter string (e.g., "user_id=eq.123")
        const parts = filter.split('=');
        if (parts.length >= 3) {
          const column = parts[0];
          const operator = parts[1];
          const value = parts.slice(2).join('='); // Handle values with = in them
          
          if (operator === 'eq') {
            query = query.eq(column, value);
          } else if (operator === 'neq') {
            query = query.neq(column, value);
          } else if (operator === 'gt') {
            query = query.gt(column, value);
          } else if (operator === 'lt') {
            query = query.lt(column, value);
          } else if (operator === 'in') {
            query = query.in(column, value.split(','));
          }
        }
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      setState({
        data: data || [],
        loading: false,
        error: null,
        lastUpdated: new Date()
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }));
    }
  }, [table, select, filter, orderBy, limit, enabled]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled || !realTimeState.isConnected) return;

    const channel = supabase
      .channel(`realtime_${table}_${Math.random()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter
      }, (payload) => {
        setState(prev => {
          let newData = [...prev.data];

          if (payload.eventType === 'INSERT') {
            // Add new item
            newData.push(payload.new as T);
          } else if (payload.eventType === 'UPDATE') {
            // Update existing item
            const index = newData.findIndex((item: any) => item.id === payload.new.id);
            if (index !== -1) {
              newData[index] = payload.new as T;
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove item
            newData = newData.filter((item: any) => item.id !== payload.old.id);
          }

          // Apply ordering if specified
          if (orderBy) {
            newData.sort((a: any, b: any) => {
              const aVal = a[orderBy.column];
              const bVal = b[orderBy.column];
              const ascending = orderBy.ascending ?? true;
              
              if (aVal < bVal) return ascending ? -1 : 1;
              if (aVal > bVal) return ascending ? 1 : -1;
              return 0;
            });
          }

          // Apply limit if specified
          if (limit) {
            newData = newData.slice(0, limit);
          }

          return {
            ...prev,
            data: newData,
            lastUpdated: new Date()
          };
        });
      })
      .subscribe();

    subscriptionRef.current = () => channel.unsubscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [table, filter, orderBy, limit, enabled, realTimeState.isConnected]);

  // Set up periodic refetch
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    refetchTimeoutRef.current = setInterval(fetchData, refetchInterval);

    return () => {
      if (refetchTimeoutRef.current) {
        clearInterval(refetchTimeoutRef.current);
      }
    };
  }, [fetchData, refetchInterval, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optimistic updates
  const optimisticAdd = useCallback((item: T) => {
    setState(prev => ({
      ...prev,
      data: [...prev.data, item],
      lastUpdated: new Date()
    }));
  }, []);

  const optimisticUpdate = useCallback((id: string, updates: Partial<T>) => {
    setState(prev => ({
      ...prev,
      data: prev.data.map((item: any) => 
        item.id === id ? { ...item, ...updates } : item
      ),
      lastUpdated: new Date()
    }));
  }, []);

  const optimisticRemove = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      data: prev.data.filter((item: any) => item.id !== id),
      lastUpdated: new Date()
    }));
  }, []);

  return {
    ...state,
    refetch: fetchData,
    optimisticAdd,
    optimisticUpdate,
    optimisticRemove,
    isConnected: realTimeState.isConnected
  };
}

// Specialized hooks for common use cases
export const useRealTimeProducts = (filters?: { category?: string; search?: string; limit?: number }) => {
  let filter = '';
  if (filters?.category) {
    filter = `category=eq.${filters.category}`;
  }

  return useRealTimeData({
    table: 'products',
    select: `
      *,
      profiles!seller_id (
        full_name,
        avatar_url,
        is_verified
      )
    `,
    filter,
    orderBy: { column: 'created_at', ascending: false },
    limit: filters?.limit || 50
  });
};

export const useRealTimeOrders = (userId: string) => {
  return useRealTimeData({
    table: 'orders',
    select: `
      *,
      products (
        title,
        price,
        images
      ),
      profiles!seller_id (
        full_name,
        avatar_url
      )
    `,
    filter: userId ? `buyer_id=eq.${userId}` : undefined,
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!userId
  });
};

export const useRealTimeNotifications = (userId: string) => {
  return useRealTimeData({
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
    orderBy: { column: 'created_at', ascending: false },
    limit: 50
  });
};

export const useRealTimeConversations = (userId: string) => {
  return useRealTimeData({
    table: 'conversations',
    select: `
      *,
      products (title, price),
      buyer:profiles!conversations_buyer_id_fkey (full_name, avatar_url),
      seller:profiles!conversations_seller_id_fkey (full_name, avatar_url)
    `,
    filter: `buyer_id=eq.${userId}`,
    orderBy: { column: 'created_at', ascending: false }
  });
};