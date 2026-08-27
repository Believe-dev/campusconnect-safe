import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateId } from '@/lib/utils';

export const useOrdersCount = () => {
  const { user } = useAuth();
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(generateId()).current;

  useEffect(() => {
    if (user) {
      fetchOrdersCount();

      const channel = supabase
        .channel(`orders_count_${user.id}_${instanceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            // Check if this order involves the current user
            if ((payload.new as any)?.buyer_id === user.id || (payload.new as any)?.seller_id === user.id ||
                (payload.old as any)?.buyer_id === user.id || (payload.old as any)?.seller_id === user.id) {
              fetchOrdersCount();
            }
          }
        )
        .subscribe();
        
      // Listen for custom order update events
      const handleOrderUpdate = () => fetchOrdersCount();
      window.addEventListener('ordersUpdated', handleOrderUpdate);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('ordersUpdated', handleOrderUpdate);
      };
    } else {
      setOrdersCount(0);
      setLoading(false);
    }
  }, [user]);

  const fetchOrdersCount = async () => {
    if (!user) {
      setOrdersCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .in('status', ['paid', 'shipped', 'delivered']);

      // If orders table doesn't exist, silently fail
      if (error && (error.message?.includes('relation') || error.message?.includes('does not exist'))) {
        setOrdersCount(0);
        return;
      }

      if (error) throw error;

      setOrdersCount(data?.length || 0);
    } catch (error) {
      // Silently handle table not found errors
      setOrdersCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { ordersCount, loading, refetch: fetchOrdersCount };
};