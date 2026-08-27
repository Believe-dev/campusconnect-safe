import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateId } from '@/lib/utils';

export const useRealTimeOrders = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const instanceId = useRef(generateId()).current;

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`orders_realtime_${user.id}_${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['seller-orders', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};