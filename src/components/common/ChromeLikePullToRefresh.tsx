import React, { useRef } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface ChromeLikePullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const ChromeLikePullToRefresh: React.FC<ChromeLikePullToRefreshProps> = ({
  children,
  onRefresh,
  disabled = false,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    isPulling,
    pullDistance,
    isRefreshing,
    canRefresh,
    progress,
    animationDuration
  } = usePullToRefresh({
    onRefresh,
    containerRef,
    disabled
  });

  // Respect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const indicatorHeight = 56;
  const maxIndicatorOffset = 40;

  // Calculate indicator position and scale
  const indicatorOffset = Math.min(pullDistance * 0.5, maxIndicatorOffset);
  const indicatorScale = Math.min(progress * 1.2, 1);
  const indicatorOpacity = Math.min(progress * 2, 1);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ 
        // Prevent content jump during refresh
        paddingTop: isRefreshing ? indicatorHeight : 0,
        transition: prefersReducedMotion ? 'none' : `padding-top ${animationDuration}ms ease-out`
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center pointer-events-none"
        style={{
          height: indicatorHeight,
          transform: `translateY(${isRefreshing ? 0 : -indicatorHeight + indicatorOffset}px)`,
          transition: prefersReducedMotion ? 'none' : 
            `transform ${animationDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
          opacity: isRefreshing ? 1 : indicatorOpacity
        }}
        role="status"
        aria-live="polite"
        aria-label={isRefreshing ? "Refreshing content" : canRefresh ? "Release to refresh" : "Pull to refresh"}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg p-3 border border-gray-200">
          {isRefreshing ? (
            // Refreshing spinner
            <div className="relative w-6 h-6">
              <div 
                className="absolute inset-0 border-2 border-gray-200 rounded-full"
                style={{
                  animation: prefersReducedMotion ? 'none' : 'spin 1s linear infinite',
                  borderTopColor: '#059669' // university-green
                }}
              />
              <div className="absolute inset-1 bg-white rounded-full" />
            </div>
          ) : (
            // Pull progress indicator
            <div className="relative w-6 h-6">
              <svg
                className="w-6 h-6 transform -rotate-90"
                viewBox="0 0 24 24"
                style={{
                  transform: `rotate(-90deg) scale(${indicatorScale})`,
                  transition: prefersReducedMotion ? 'none' : `transform ${animationDuration}ms ease-out`
                }}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                  fill="none"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#059669"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 10}`}
                  strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress)}`}
                  style={{
                    transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 100ms ease-out'
                  }}
                />
              </svg>
              
              {/* Arrow icon in center */}
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: canRefresh ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: prefersReducedMotion ? 'none' : 'transform 200ms ease-out'
                }}
              >
                <svg className="w-3 h-3 text-university-green" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content with pull transform */}
      <div
        style={{
          transform: `translateY(${isPulling ? pullDistance : 0}px)`,
          transition: prefersReducedMotion ? 'none' : 
            isPulling ? 'none' : `transform ${animationDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
        }}
      >
        {children}
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="assertive">
        {isRefreshing && "Refreshing content"}
        {canRefresh && !isRefreshing && "Release to refresh"}
      </div>
    </div>
  );
};

export default ChromeLikePullToRefresh;