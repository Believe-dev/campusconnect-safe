import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useCartCount = () => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCartCount();
      
      // Subscribe to cart changes
      const channel = supabase
        .channel('cart-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchCartCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setCartCount(0);
      setLoading(false);
    }
  }, [user]);

  const fetchCartCount = async () => {
    if (!user) {
      setCartCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cart')
        .select('quantity')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalItems = data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      setCartCount(totalItems);
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { cartCount, loading, refetch: fetchCartCount };
};