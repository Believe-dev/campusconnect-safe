import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateId } from '@/lib/utils';

export const useRealTimeCart = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const instanceId = useRef(generateId()).current;

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`cart_realtime_${user.id}_${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cart', user.id] });
          window.dispatchEvent(new CustomEvent('cartUpdated'));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};