import React from 'react';

interface UniMarketPreloaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const UniMarketPreloader: React.FC<UniMarketPreloaderProps> = ({
  message = "Loading UniMarket...",
  size = 'md',
  fullScreen = true
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="unimarket-preloader flex flex-col items-center justify-center min-h-[200px] w-full max-w-sm mx-auto px-4">
        {/* UniMarket Logo Animation */}
        <div className="relative mb-6">
          {/* Outer rotating ring */}
          <div className={`${sizeClasses[size]} relative mx-auto`}>
            <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary unimarket-spinner"></div>
            
            {/* Inner pulsing dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full unimarket-pulse"></div>
            </div>
          </div>
        </div>

        {/* UniMarket text logo */}
        <div className="mb-4">
          <div className="text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent text-center">
            UniMarket
          </div>
        </div>

        {/* Loading message */}
        <div className="text-sm text-muted-foreground text-center mb-4 px-2">
          {message}
        </div>

        {/* Loading dots animation */}
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full unimarket-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full unimarket-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full unimarket-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

// Lightweight version for low-end devices
export const UniMarketPreloaderLite: React.FC<UniMarketPreloaderProps> = ({
  message = "Loading...",
  fullScreen = true
}) => {
  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-background z-50 flex items-center justify-center'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="unimarket-preloader flex flex-col items-center justify-center min-h-[150px] w-full max-w-xs mx-auto px-4">
        {/* Simple spinner */}
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full unimarket-spinner mb-4"></div>
        
        {/* UniMarket text */}
        <div className="text-base font-semibold text-primary mb-3 text-center">
          UniMarket
        </div>
        
        {/* Simple message */}
        <div className="text-sm text-muted-foreground text-center px-2">
          {message}
        </div>
      </div>
    </div>
  );
};

// Hook to detect device performance and choose appropriate preloader
export const useOptimizedPreloader = () => {
  const isLowEndDevice = React.useMemo(() => {
    // Check for low-end device indicators
    const deviceMemory = (navigator as any).deviceMemory;
    const hardwareConcurrency = navigator.hardwareConcurrency;
    const connection = (navigator as any).connection;
    
    return (
      deviceMemory < 2 || 
      hardwareConcurrency < 4 || 
      connection?.effectiveType === 'slow-2g' ||
      connection?.effectiveType === '2g' ||
      connection?.effectiveType === '3g'
    );
  }, []);

  return isLowEndDevice ? UniMarketPreloaderLite : UniMarketPreloader;
};