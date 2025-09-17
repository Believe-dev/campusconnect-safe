import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useOrdersCount = () => {
  const { user } = useAuth();
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrdersCount();
      
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `buyer_id=eq.${user.id}`
          },
          () => {
            fetchOrdersCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
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
        .eq('buyer_id', user.id)
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