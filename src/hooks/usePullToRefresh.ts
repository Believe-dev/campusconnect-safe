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
  
  // Increased threshold for more natural feel (like Chrome mobile)
  const PULL_THRESHOLD = 120; // Increased from 100px
  const PULL_RESISTANCE = 0.6; // Add resistance to make it feel more natural

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
      
      // Clear localStorage (except essential data including onboarding state)
      const essentialKeys = [
        'auth-token', 
        'user-preferences', 
        'theme',
        'unimarket_onboarding_completed', // Preserve global onboarding state
        'unimarket_onboarding_completed_', // Preserve user-specific onboarding state
        'user_signup_' // Preserve user signup timestamps
      ];
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

  // Enhanced touch event handlers for pull-to-refresh gesture
  useEffect(() => {
    let touchStartY = 0;
    let touchCurrentY = 0;
    let isAtTop = false;
    let isPulling = false;
    
    // Helper function to check if element is interactive
    const isInteractiveElement = (element: Element): boolean => {
      const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
      const interactiveRoles = ['button', 'link', 'menuitem', 'tab'];
      const interactiveClasses = ['btn', 'button', 'clickable', 'interactive'];
      
      // Check tag name
      if (interactiveTags.includes(element.tagName)) return true;
      
      // Check role attribute
      const role = element.getAttribute('role');
      if (role && interactiveRoles.includes(role)) return true;
      
      // Check for click handlers or interactive classes
      if (element.getAttribute('onclick') || 
          element.classList.contains('cursor-pointer') ||
          interactiveClasses.some(cls => element.classList.contains(cls))) {
        return true;
      }
      
      // Check parent elements (up to 3 levels)
      let parent = element.parentElement;
      let level = 0;
      while (parent && level < 3) {
        if (interactiveTags.includes(parent.tagName) || 
            parent.getAttribute('role') === 'button' ||
            parent.classList.contains('cursor-pointer')) {
          return true;
        }
        parent = parent.parentElement;
        level++;
      }
      
      return false;
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      // Ignore touches on interactive elements
      const target = e.target as Element;
      if (isInteractiveElement(target)) {
        isPulling = false;
        return;
      }
      
      touchStartY = e.touches[0].clientY;
      isAtTop = window.scrollY === 0;
      isPulling = isAtTop; // Only start pulling if at top
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || !isAtTop || isRefreshing) return;
      
      touchCurrentY = e.touches[0].clientY;
      const rawDistance = Math.max(0, touchCurrentY - touchStartY);
      
      // Apply resistance for more natural feel
      const pullDistance = rawDistance * PULL_RESISTANCE;
      
      if (pullDistance > 30) { // Lower threshold for showing indicator
        // Prevent default scroll behavior when pulling
        e.preventDefault();
        
        // Show pull indicator
        const indicator = document.getElementById('pull-indicator');
        if (!indicator) {
          const pullIndicator = document.createElement('div');
          pullIndicator.id = 'pull-indicator';
          pullIndicator.innerHTML = `
            <div style="
              position: fixed;
              top: ${Math.min(pullDistance - 30, 80)}px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 9998;
              background: rgba(22, 163, 74, 0.9);
              color: white;
              padding: 10px 20px;
              border-radius: 25px;
              font-size: 13px;
              font-weight: 500;
              backdrop-filter: blur(10px);
              transition: all 0.2s ease;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ">
              ${pullDistance > PULL_THRESHOLD ? '↓ Release to refresh UniMarket' : '↓ Pull down to refresh'}
            </div>
          `;
          document.body.appendChild(pullIndicator);
        } else {
          const indicatorEl = indicator.firstElementChild as HTMLElement;
          indicatorEl.style.top = `${Math.min(pullDistance - 30, 80)}px`;
          indicatorEl.textContent = pullDistance > PULL_THRESHOLD ? 
            '↓ Release to refresh UniMarket' : '↓ Pull down to refresh';
          
          // Change color when ready to refresh
          if (pullDistance > PULL_THRESHOLD) {
            indicatorEl.style.background = 'rgba(34, 197, 94, 0.95)';
          } else {
            indicatorEl.style.background = 'rgba(22, 163, 74, 0.9)';
          }
        }
      }
    };
    
    const handleTouchEnd = () => {
      const indicator = document.getElementById('pull-indicator');
      if (indicator) {
        indicator.remove();
      }
      
      if (!isPulling || !isAtTop || isRefreshing) {
        isPulling = false;
        return;
      }
      
      const rawDistance = Math.max(0, touchCurrentY - touchStartY);
      const pullDistance = rawDistance * PULL_RESISTANCE;
      
      if (pullDistance > PULL_THRESHOLD) {
        handleRefresh();
      }
      
      isPulling = false;
    };
    
    // Use passive: false for touchmove to allow preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleRefresh, isRefreshing, PULL_THRESHOLD, PULL_RESISTANCE]);

  return { handleRefresh, isRefreshing };
};