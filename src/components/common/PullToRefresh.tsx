import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  className
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current || window.scrollY > 0) return;
    
    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    if (distance > 0) {
      e.preventDefault();
      const dampedDistance = Math.min(distance * 0.5, threshold * 1.5);
      const newCanRefresh = dampedDistance >= threshold;
      
      // Trigger haptic feedback when threshold is reached
      if (newCanRefresh && !canRefresh && 'vibrate' in navigator) {
        navigator.vibrate(50); // Short vibration
      }
      
      setPullDistance(dampedDistance);
      setCanRefresh(newCanRefresh);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setCanRefresh(false);
      }
    } else {
      setPullDistance(0);
      setCanRefresh(false);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canRefresh, isRefreshing]);

  const getLoaderScale = () => {
    if (isRefreshing) return 1;
    return Math.min(pullDistance / threshold, 1);
  };

  const getLoaderOpacity = () => {
    if (isRefreshing) return 1;
    return Math.min(pullDistance / (threshold * 0.5), 1);
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "pull-to-refresh-container relative overflow-hidden",
        canRefresh && "can-refresh",
        className
      )}
    >
      {/* Snapchat-style loader */}
      <div 
        className="pull-to-refresh-loader"
        style={{
          transform: `translateX(-50%) translateY(${-threshold + pullDistance}px)`,
          opacity: getLoaderOpacity(),
          scale: getLoaderScale()
        }}
      >
        <div className="snapchat-loader">
          {/* Outer ring */}
          <div className={cn(
            "snapchat-loader-ring",
            isRefreshing && "active"
          )} />
          
          {/* Inner Snapchat ghost icon */}
          <div className={cn(
            "snapchat-loader-icon",
            isRefreshing && "refreshing"
          )}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              {/* Snapchat ghost shape */}
              <path d="M12 2.5c-4.5 0-8 3.5-8 8 0 2.5 1 4.5 2.5 6l-1 3.5c-.2.7.3 1.4 1 1.4.3 0 .6-.1.8-.3L9 19.5c.9.3 1.9.5 3 .5s2.1-.2 3-.5l1.7 1.6c.2.2.5.3.8.3.7 0 1.2-.7 1-1.4l-1-3.5c1.5-1.5 2.5-3.5 2.5-6 0-4.5-3.5-8-8-8z" />
              {/* Eyes */}
              <circle cx="9.5" cy="9" r="1" fill="white" />
              <circle cx="14.5" cy="9" r="1" fill="white" />
              {/* Mouth */}
              <ellipse cx="12" cy="13" rx="2" ry="1" fill="white" />
            </svg>
          </div>
        </div>
        
        {/* Status text */}
        <div className={cn(
          "pull-to-refresh-text",
          canRefresh && "can-refresh",
          isRefreshing && "refreshing"
        )}>
          {isRefreshing ? (
            "Refreshing..."
          ) : canRefresh ? (
            "Release to refresh"
          ) : (
            "Pull to refresh"
          )}
        </div>
      </div>

      {/* Content */}
      <div 
        className={cn(
          "pull-to-refresh-content relative z-10",
          isDragging.current && "dragging"
        )}
        style={{
          transform: `translateY(${isRefreshing ? threshold : pullDistance}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;