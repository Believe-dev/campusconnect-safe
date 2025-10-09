import { useCallback, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const usePullToRefresh = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);

  const showRefreshLoader = useCallback(() => {
    // Create and show pull-to-refresh loader
    const loader = document.createElement('div');
    loader.id = 'pull-refresh-loader';
    loader.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: linear-gradient(135deg, #16a34a, #15803d);
        color: white;
        padding: 12px;
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        transform: translateY(-100%);
        transition: transform 0.3s ease;
      ">
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
          <div style="
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          Refreshing UniMarket...
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(loader);
    
    // Animate in
    setTimeout(() => {
      loader.firstElementChild.style.transform = 'translateY(0)';
    }, 10);
    
    return loader;
  }, []);

  const hideRefreshLoader = useCallback((loader: HTMLElement) => {
    if (loader && loader.parentNode) {
      loader.firstElementChild.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        if (loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      }, 300);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    const loader = showRefreshLoader();
    
    // Check network status
    if (!isOnline) {
      hideRefreshLoader(loader);
      setIsRefreshing(false);
      toast({
        title: "No Internet Connection",
        description: "Please check your connection and try again.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      // Add delay for UniMarket loader animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Clear all caches like browser refresh
      queryClient.clear();
      
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage (except essential data)
      const essentialKeys = ['auth-token', 'user-preferences', 'theme'];
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !essentialKeys.some(essential => key.includes(essential))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      hideRefreshLoader(loader);
      
      // Force reload the entire app (like browser refresh)
      setTimeout(() => {
        window.location.reload();
      }, 300);
      
    } catch (error) {
      console.error('Refresh failed:', error);
      hideRefreshLoader(loader);
      setIsRefreshing(false);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh UniMarket. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [queryClient, toast, isOnline, isRefreshing, showRefreshLoader, hideRefreshLoader]);

  // Touch event handlers for pull-to-refresh gesture
  useEffect(() => {
    let touchStartY = 0;
    let touchCurrentY = 0;
    let isAtTop = false;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      isAtTop = window.scrollY === 0;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;
      
      touchCurrentY = e.touches[0].clientY;
      const pullDistance = Math.max(0, touchCurrentY - touchStartY);
      
      if (pullDistance > 50) {
        // Show pull indicator
        const indicator = document.getElementById('pull-indicator');
        if (!indicator) {
          const pullIndicator = document.createElement('div');
          pullIndicator.id = 'pull-indicator';
          pullIndicator.innerHTML = `
            <div style="
              position: fixed;
              top: ${Math.min(pullDistance - 50, 60)}px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 9998;
              background: rgba(22, 163, 74, 0.9);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 500;
              backdrop-filter: blur(10px);
              transition: all 0.2s ease;
            ">
              ${pullDistance > 100 ? '↓ Release to refresh' : '↓ Pull to refresh'}
            </div>
          `;
          document.body.appendChild(pullIndicator);
        } else {
          const indicatorEl = indicator.firstElementChild as HTMLElement;
          indicatorEl.style.top = `${Math.min(pullDistance - 50, 60)}px`;
          indicatorEl.textContent = pullDistance > 100 ? '↓ Release to refresh' : '↓ Pull to refresh';
        }
      }
    };
    
    const handleTouchEnd = () => {
      const indicator = document.getElementById('pull-indicator');
      if (indicator) {
        indicator.remove();
      }
      
      if (!isAtTop || isRefreshing) return;
      
      const pullDistance = Math.max(0, touchCurrentY - touchStartY);
      if (pullDistance > 100) {
        handleRefresh();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleRefresh, isRefreshing]);

  return { handleRefresh, isRefreshing };
};