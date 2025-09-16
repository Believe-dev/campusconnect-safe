import { useState, useCallback } from 'react';

interface UsePaginationProps {
  initialPage?: number;
  pageSize?: number;
}

export const usePagination = ({ 
  initialPage = 1, 
  pageSize = 20 
}: UsePaginationProps = {}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const getRange = useCallback(() => {
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    return { from, to };
  }, [currentPage, pageSize]);

  const nextPage = useCallback(() => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore, loading]);

  const prevPage = useCallback(() => {
    if (currentPage > 1 && !loading) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage, loading]);

  const goToPage = useCallback((page: number) => {
    if (page > 0 && !loading) {
      setCurrentPage(page);
    }
  }, [loading]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setHasMore(true);
  }, [initialPage]);

  return {
    currentPage,
    pageSize,
    loading,
    hasMore,
    setLoading,
    setHasMore,
    getRange,
    nextPage,
    prevPage,
    goToPage,
    reset
  };
};