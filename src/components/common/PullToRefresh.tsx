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
    
    // Only start pull-to-refresh if exactly at the top AND not scrolling
    if (scrollTop.current === 0) {
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
    
    // Only allow pulling down when exactly at top AND pulling down
    if (deltaY > 10 && container.scrollTop === 0) {
      e.preventDefault();
      
      const resistance = Math.min(deltaY * 0.5, threshold * 1.2);
      setPullDistance(resistance);
      
      if (resistance >= threshold) {
        setRefreshState('ready');
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      } else {
        setRefreshState('pulling');
      }
    } else if (deltaY < 0) {
      // If scrolling up, cancel pull-to-refresh
      isDragging.current = false;
      setRefreshState('idle');
      setPullDistance(0);
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
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
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
    return Math.min(pullDistance / (threshold * 0.6), 0.95);
  };

  const getIndicatorScale = () => {
    if (refreshState === 'refreshing') return 1;
    if (refreshState === 'ready') return 1.05;
    return Math.min(pullDistance / threshold * 0.7 + 0.3, 1);
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
        transform: `translateY(${Math.min(pullDistance * 0.2, threshold * 0.25)}px)`,
        transition: refreshState === 'idle' ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-center pointer-events-none"
        style={{
          transform: `translateY(${Math.max(-80 + pullDistance * 0.6, -80)}px)`,
          opacity: getIndicatorOpacity(),
          transition: refreshState === 'idle' ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
        }}
      >
        <div 
          className="bg-white/95 backdrop-blur-md rounded-full p-3 shadow-xl border border-gray-200/30 mx-auto"
          style={{
            transform: `scale(${getIndicatorScale()})`,
            transition: 'transform 0.2s ease-out'
          }}
        >
          <div className="relative">
            {refreshState === 'refreshing' ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <ArrowDown 
                className="w-6 h-6 text-primary transition-transform duration-300 ease-out"
                style={{
                  transform: `rotate(${getArrowRotation()}deg)`
                }}
              />
            )}
          </div>
        </div>
        
        {/* Status text */}
        {refreshState !== 'idle' && (
          <div className="mt-3 text-xs font-medium text-gray-700 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
            {refreshState === 'refreshing' && 'Refreshing...'}
            {refreshState === 'ready' && 'Release to refresh'}
            {refreshState === 'pulling' && 'Pull to refresh'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;