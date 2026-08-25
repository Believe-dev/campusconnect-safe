import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError, logError } from '@/lib/errors';
import { ApiResponse } from '@/lib/types';

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    operation: () => Promise<{ data: T | null; error: any }>
  ): Promise<ApiResponse<T>> => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();
      
      if (result.error) {
        const appError = handleSupabaseError(result.error);
        setError(appError.message);
        logError(appError);
        return { data: null, error: appError.message, loading: false };
      }

      setData(result.data);
      return { data: result.data, error: null, loading: false };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logError(err as Error);
      return { data: null, error: errorMessage, loading: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

// Specialized hooks for common operations
export function useQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  dependencies: any[] = []
) {
  const api = useApi<T>();
  
  const refetch = useCallback(() => {
    return api.execute(queryFn);
  }, [api, queryFn]);

  React.useEffect(() => {
    refetch();
  }, dependencies);

  return {
    ...api,
    refetch,
  };
}

export function useMutation<T, TVariables = void>() {
  const api = useApi<T>();

  const mutate = useCallback(async (
    mutationFn: (variables: TVariables) => Promise<{ data: T | null; error: any }>,
    variables: TVariables
  ) => {
    return api.execute(() => mutationFn(variables));
  }, [api]);

  return {
    ...api,
    mutate,
  };
}

// Common API operations
export const apiOperations = {
  // Profile operations
  getProfile: (userId: string) => 
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
  
  updateProfile: (userId: string, updates: Partial<any>) =>
    supabase.from('profiles').update(updates).eq('user_id', userId),

  // Product operations
  getProducts: (filters?: any) => {
    let query = supabase.from('products').select(`
      *,
      profiles!seller_id (full_name, rating, is_verified)
    `).eq('is_active', true);
    
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.campus && filters.campus !== 'all') {
      query = query.eq('campus', filters.campus);
    }
    
    return query.order('created_at', { ascending: false });
  },

  getProduct: (id: string) =>
    supabase.from('products').select(`
      *,
      profiles!seller_id (*)
    `).eq('id', id).single(),

  // Cart operations
  getCartItems: (userId: string) =>
    supabase.from('cart').select(`
      *,
      products (
        id, title, price, images, seller_id,
        profiles!products_seller_id_fkey (full_name)
      )
    `).eq('user_id', userId),

  addToCart: (userId: string, productId: string, quantity: number = 1) =>
    supabase.from('cart').upsert({
      user_id: userId,
      product_id: productId,
      quantity
    }, { onConflict: 'user_id,product_id' }),

  // Order operations
  getOrders: (userId: string, role: 'buyer' | 'seller' = 'buyer') => {
    const field = role === 'buyer' ? 'buyer_id' : 'seller_id';
    return supabase.from('orders').select(`
      *,
      products (title, images),
      buyer_profile:profiles!buyer_id (full_name),
      seller_profile:profiles!seller_id (full_name)
    `).eq(field, userId).order('created_at', { ascending: false });
  },

  // Notification operations
  getNotifications: (userId: string) =>
    supabase.from('notifications').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

  markNotificationRead: (id: string) =>
    supabase.from('notifications').update({ is_read: true }).eq('id', id),
};