import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing';

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
  className = ''
}) => {
  const [refreshState, setRefreshState] = useState<RefreshState>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const scrollTop = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    scrollTop.current = container.scrollTop;
    
    // Only start pull-to-refresh if at the top of the scroll container
    if (scrollTop.current <= 0) {
      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
      isDragging.current = true;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    // Only allow pulling down when at the top
    if (deltaY > 0 && container.scrollTop <= 0) {
      e.preventDefault(); // Prevent default scroll behavior
      
      // Apply resistance curve for natural feel (Chrome-like)
      const resistance = Math.min(deltaY * 0.5, threshold * 1.2);
      setPullDistance(resistance);
      
      if (resistance >= threshold) {
        setRefreshState('ready');
        // Haptic feedback on mobile (if supported)
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } else {
        setRefreshState('pulling');
      }
    }
  }, [disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current || disabled) return;
    
    isDragging.current = false;
    
    if (refreshState === 'ready' && !isRefreshing) {
      setRefreshState('refreshing');
      setIsRefreshing(true);
      setPullDistance(threshold * 0.8); // Keep indicator visible during refresh
      
      // Haptic feedback for successful trigger
      if ('vibrate' in navigator) {
        navigator.vibrate([20, 10, 20]);
      }
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        // Smooth reset animation with delay
        setTimeout(() => {
          setRefreshState('idle');
          setPullDistance(0);
          setIsRefreshing(false);
        }, 500);
      }
    } else {
      // Smooth return to idle state
      setRefreshState('idle');
      setPullDistance(0);
    }
  }, [refreshState, isRefreshing, disabled, onRefresh, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getIndicatorOpacity = () => {
    if (refreshState === 'idle') return 0;
    if (refreshState === 'refreshing') return 1;
    return Math.min(pullDistance / (threshold * 0.5), 1);
  };

  const getIndicatorScale = () => {
    if (refreshState === 'refreshing') return 1;
    if (refreshState === 'ready') return 1.1; // Slightly larger when ready
    return Math.min(pullDistance / threshold * 0.8 + 0.2, 1);
  };

  const getArrowRotation = () => {
    if (refreshState === 'ready') return 180;
    return Math.min((pullDistance / threshold) * 180, 180);
  };

  return (
    <div 
      ref={containerRef}
      className={`pull-container relative overflow-auto h-full ${className}`}
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.3, threshold * 0.3)}px)`,
        transition: refreshState === 'idle' ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div 
        className={`pull-indicator absolute top-0 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center justify-center ${
          refreshState === 'pulling' ? 'pulling' : ''
        } ${
          refreshState === 'ready' ? 'ready' : ''
        } ${
          refreshState === 'refreshing' ? 'refreshing' : ''
        }`}
        style={{
          transform: `translateX(-50%) translateY(${Math.max(-60 + pullDistance * 0.8, -60)}px)`,
          opacity: getIndicatorOpacity(),
          transition: refreshState === 'idle' ? 'all 0.3s ease-out' : 'opacity 0.1s ease-out'
        }}
      >
        <div 
          className="pull-backdrop bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-gray-200/50"
          style={{
            transform: `scale(${getIndicatorScale()})`,
            transition: refreshState === 'refreshing' ? 'transform 0.2s ease-out' : 'none'
          }}
        >
          {refreshState === 'refreshing' ? (
            <Loader2 className="w-6 h-6 text-primary" />
          ) : (
            <ArrowDown 
              className="pull-arrow w-6 h-6 text-primary"
              style={{
                transform: `rotate(${getArrowRotation()}deg)`
              }}
            />
          )}
        </div>
        
        {/* Status text */}
        <div className="mt-2 text-xs font-medium text-gray-600 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
          {refreshState === 'refreshing' && 'Refreshing...'}
          {refreshState === 'ready' && 'Release to refresh'}
          {refreshState === 'pulling' && 'Pull to refresh'}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;