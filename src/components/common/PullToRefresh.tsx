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
  const [isAtTop, setIsAtTop] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  // Use Intersection Observer to detect when at top
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtTop(entry.isIntersecting);
      },
      { threshold: 1.0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isAtTop) return;
    
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [disabled, isRefreshing, isAtTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing || !isAtTop) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;
    
    if (deltaY > 0) {
      e.preventDefault();
      
      const resistance = Math.min(deltaY * 0.4, threshold * 1.5);
      setPullDistance(resistance);
      
      if (resistance >= threshold) {
        if (refreshState !== 'ready') {
          setRefreshState('ready');
          navigator.vibrate?.(10);
        }
      } else {
        setRefreshState('pulling');
      }
    }
  }, [disabled, isRefreshing, isAtTop, threshold, refreshState]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    
    if (refreshState === 'ready' && !isRefreshing) {
      setRefreshState('refreshing');
      setIsRefreshing(true);
      setPullDistance(60);
      
      navigator.vibrate?.([20, 10, 20]);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setTimeout(() => {
          setRefreshState('idle');
          setPullDistance(0);
          setIsRefreshing(false);
        }, 300);
      }
    } else {
      setRefreshState('idle');
      setPullDistance(0);
    }
  }, [refreshState, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto h-full ${className}`}
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.3, 50)}px)`,
        transition: refreshState === 'idle' ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {/* Top sentinel for intersection observer */}
      <div ref={topSentinelRef} className="h-px w-full" />
      
      {/* Pull indicator */}
      <div 
        className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none"
        style={{
          transform: `translateY(${Math.max(-70 + pullDistance * 0.7, -70)}px)`,
          opacity: refreshState === 'idle' ? 0 : Math.min(pullDistance / 40, 1),
          transition: refreshState === 'idle' ? 'all 0.3s ease-out' : 'none'
        }}
      >
        <div className="flex flex-col items-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-full p-3 shadow-lg border border-gray-200/50">
            {refreshState === 'refreshing' ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <ArrowDown 
                className="w-5 h-5 text-primary transition-transform duration-200"
                style={{
                  transform: `rotate(${refreshState === 'ready' ? 180 : Math.min(pullDistance / threshold * 180, 180)}deg)`
                }}
              />
            )}
          </div>
          
          {refreshState !== 'idle' && (
            <div className="mt-2 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded-full">
              {refreshState === 'refreshing' ? 'Refreshing...' : 
               refreshState === 'ready' ? 'Release to refresh' : 'Pull to refresh'}
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
};

export default PullToRefresh;