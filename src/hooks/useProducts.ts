import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, UseProductsReturn } from '@/lib/types';
import { BUSINESS_RULES } from '@/lib/constants';
import { handleSupabaseError, logError } from '@/lib/errors';

interface UseProductsOptions {
  category?: string;
  campus?: string;
  limit?: number;
  sellerId?: string;
  isActive?: boolean;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const {
    category,
    campus,
    limit = BUSINESS_RULES.pagination.defaultLimit,
    sellerId,
    isActive = true,
  } = options;

  const fetchProducts = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentPage = reset ? 0 : page;
      const offset = currentPage * limit;

      let query = supabase
        .from('products')
        .select(`
          *,
          profiles!seller_id (
            full_name,
            rating,
            is_verified
          )
        `)
        .eq('is_active', isActive)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (campus && campus !== 'all') {
        query = query.eq('campus', campus);
      }
      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw handleSupabaseError(queryError);
      }

      const transformedProducts: Product[] = (data || []).map(product => ({
        ...product,
        seller: product.profiles,
      }));

      if (reset) {
        setProducts(transformedProducts);
        setPage(1);
      } else {
        setProducts(prev => [...prev, ...transformedProducts]);
        setPage(prev => prev + 1);
      }

      setHasMore(transformedProducts.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(errorMessage);
      logError(err as Error, { options });
    } finally {
      setLoading(false);
    }
  }, [category, campus, limit, sellerId, isActive, page]);

  const refetch = useCallback(() => {
    setPage(0);
    return fetchProducts(true);
  }, [fetchProducts]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      return fetchProducts(false);
    }
    return Promise.resolve();
  }, [fetchProducts, loading, hasMore]);

  useEffect(() => {
    refetch();
  }, [category, campus, sellerId, isActive]);

  return {
    products,
    loading,
    error,
    refetch,
    hasMore,
    loadMore,
  };
}

// Specialized hook for featured products
export function useFeaturedProducts() {
  return useProducts({ limit: 8 });
}

// Specialized hook for seller products
export function useSellerProducts(sellerId: string) {
  return useProducts({ sellerId, limit: 20 });
}