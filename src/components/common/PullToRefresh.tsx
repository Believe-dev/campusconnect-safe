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
        "pull-to-refresh-container relative",
        canRefresh && "can-refresh",
        className
      )}
    >
      {/* UniMarket custom loader */}
      <div 
        className="pull-to-refresh-loader"
        style={{
          transform: `translateX(-50%) translateY(${-threshold + pullDistance}px)`,
          opacity: getLoaderOpacity(),
          scale: getLoaderScale()
        }}
      >
        <div className="unimarket-loader">
          {/* Outer rotating ring */}
          <div className={cn(
            "unimarket-loader-ring",
            isRefreshing && "active"
          )} />
          
          {/* Inner UniMarket logo */}
          <div className={cn(
            "unimarket-loader-icon",
            isRefreshing && "refreshing"
          )}>
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none"
              className="unimarket-logo"
            >
              {/* University building icon with market elements */}
              <path 
                d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z" 
                fill="currentColor" 
                className="logo-shield"
              />
              <path 
                d="M8 10h8M8 13h6M8 16h4" 
                stroke="white" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                className="logo-lines"
              />
              <circle 
                cx="12" 
                cy="8" 
                r="2" 
                fill="white"
                className="logo-dot"
              />
            </svg>
          </div>
          
          {/* Floating particles */}
          <div className="unimarket-particles">
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
            <div className="particle particle-3"></div>
          </div>
        </div>
        
        {/* Status text */}
        <div className={cn(
          "pull-to-refresh-text unimarket-text",
          canRefresh && "can-refresh",
          isRefreshing && "refreshing"
        )}>
          {isRefreshing ? (
            <span className="refreshing-text">
              <span className="text-gradient">UniMarket</span> Refreshing...
            </span>
          ) : canRefresh ? (
            <span className="release-text">
              Release to refresh <span className="text-gradient">UniMarket</span>
            </span>
          ) : (
            <span className="pull-text">
              Pull to refresh
            </span>
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