import { useCallback, useEffect, useRef, useState } from 'react';

// Configuration matching Chrome's feel
const THRESHOLD_PX = 96;
const MAX_PULL_PX = 160;
const RESISTANCE = 0.6;
const ANIMATION_DURATION = 300;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  containerRef?: React.RefObject<HTMLElement>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  containerRef,
  threshold = THRESHOLD_PX,
  maxPull = MAX_PULL_PX,
  disabled = false
}: UsePullToRefreshOptions) => {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false
  });

  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const touchStartTime = useRef(0);
  const isDragging = useRef(false);
  const startedAtTop = useRef(false);
  const interactiveElement = useRef(false);

  // Chrome-like rubber band easing function
  const easeRubber = useCallback((distance: number): number => {
    if (distance <= 0) return 0;
    
    // Small pulls: linear with resistance
    if (distance <= threshold) {
      return distance * RESISTANCE;
    }
    
    // Large pulls: exponential decay for rubber band effect
    const baseDistance = threshold * RESISTANCE;
    const extraDistance = distance - threshold;
    const dampedExtra = extraDistance * 0.3 * Math.exp(-extraDistance / 100);
    
    return Math.min(baseDistance + dampedExtra, maxPull);
  }, [threshold, maxPull]);

  // Check if element is interactive (should not trigger pull-to-refresh)
  const isInteractiveElement = useCallback((element: Element): boolean => {
    const interactiveSelectors = [
      'a', 'button', 'input', 'textarea', 'select',
      '[role="button"]', '[role="link"]', '[role="tab"]',
      '[data-no-pull]', '.no-pull',
      '.overflow-auto', '.overflow-y-auto', '.overflow-scroll', '.overflow-y-scroll',
      '[data-scrollable]', '.chat-messages', '.product-list', '.message-list',
      '.order-list', '.notification-list', '.scroll-area', '.scrollable'
    ];
    
    return interactiveSelectors.some(selector => 
      element.matches?.(selector) || element.closest?.(selector)
    );
  }, []);

  // Check if we're at the top of the scroll container
  const isAtTop = useCallback((): boolean => {
    if (containerRef?.current) {
      return containerRef.current.scrollTop <= 1; // Allow for small rounding errors
    }
    
    // Check both window and document scroll positions
    const windowScrollY = window.scrollY || window.pageYOffset || 0;
    const documentScrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    return windowScrollY <= 1 && documentScrollTop <= 1; // Allow for small rounding errors
  }, [containerRef]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;

    // Only single finger touches
    if (e.touches.length !== 1) return;

    // Check if we're at the very top - be more strict
    const atTop = isAtTop();
    startedAtTop.current = atTop;
    if (!atTop) return;

    // Check if touching an interactive element
    const target = e.target as Element;
    interactiveElement.current = isInteractiveElement(target);
    if (interactiveElement.current) return;

    // Additional check: make sure we're not in a scrollable area that's not at the top
    let scrollableParent = target.closest('[data-scrollable], .overflow-auto, .overflow-y-auto, .overflow-scroll, .overflow-y-scroll');
    if (scrollableParent && scrollableParent.scrollTop > 0) {
      return;
    }

    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = touchStartY.current;
    touchStartTime.current = Date.now();
    isDragging.current = false; // Will be set to true on first move
  }, [disabled, state.isRefreshing, isAtTop, isInteractiveElement]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing || !startedAtTop.current || interactiveElement.current) {
      return;
    }

    if (e.touches.length !== 1) return;

    // Double-check we're still at the top during the move
    if (!isAtTop()) {
      if (state.isPulling) {
        setState(prev => ({ ...prev, isPulling: false, pullDistance: 0, canRefresh: false }));
      }
      return;
    }

    touchCurrentY.current = e.touches[0].clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;

    // Only handle downward pulls
    if (deltaY <= 0) {
      if (state.isPulling) {
        setState(prev => ({ ...prev, isPulling: false, pullDistance: 0, canRefresh: false }));
      }
      return;
    }

    // Only prevent default and start pulling if we have a significant downward movement
    // and we're definitely at the top
    if (deltaY > 30 && isAtTop()) { // Further increased threshold to avoid interfering with normal scrolling
      // Additional check: ensure we're not in the middle of a scroll gesture
      const timeDiff = Date.now() - touchStartTime.current;
      const scrollVelocity = timeDiff > 0 ? Math.abs(deltaY / timeDiff) : 0;
      if (scrollVelocity > 1.5) { // If moving too fast, it's likely a scroll gesture
        return;
      }
      
      e.preventDefault();
      isDragging.current = true;
      
      const easedDistance = easeRubber(deltaY - 30); // Subtract the threshold from the distance
      const canRefresh = easedDistance >= threshold * RESISTANCE;

      // Haptic feedback when crossing threshold
      if (canRefresh && !state.canRefresh && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }

      setState(prev => ({
        ...prev,
        isPulling: true,
        pullDistance: easedDistance,
        canRefresh
      }));
    }
  }, [disabled, state.isRefreshing, state.isPulling, state.canRefresh, easeRubber, threshold, isAtTop]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isDragging.current) return;

    isDragging.current = false;
    startedAtTop.current = false;
    interactiveElement.current = false;

    if (state.canRefresh && !state.isRefreshing) {
      setState(prev => ({ ...prev, isRefreshing: true }));
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh failed:', error);
      } finally {
        // Animate back to closed state
        setState(prev => ({ 
          ...prev, 
          isRefreshing: false, 
          isPulling: false, 
          pullDistance: 0, 
          canRefresh: false 
        }));
      }
    } else {
      // Snap back animation
      setState(prev => ({ 
        ...prev, 
        isPulling: false, 
        pullDistance: 0, 
        canRefresh: false 
      }));
    }
  }, [disabled, state.canRefresh, state.isRefreshing, onRefresh]);

  // Attach event listeners
  useEffect(() => {
    if (disabled) return;

    const target = containerRef?.current || document;
    
    target.addEventListener('touchstart', handleTouchStart, { passive: false });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd);
    target.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      target.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Keyboard fallback (Ctrl/Cmd+R)
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !state.isRefreshing) {
        e.preventDefault();
        setState(prev => ({ ...prev, isRefreshing: true }));
        onRefresh().finally(() => {
          setState(prev => ({ ...prev, isRefreshing: false }));
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disabled, state.isRefreshing, onRefresh]);

  return {
    ...state,
    progress: state.pullDistance / (threshold * RESISTANCE),
    animationDuration: isDragging.current ? 0 : ANIMATION_DURATION
  };
};