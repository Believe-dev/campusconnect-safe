import { useEffect, useState, useCallback } from 'react';

interface PerformanceMetrics {
  isLowEndDevice: boolean;
  connectionType: string;
  deviceMemory: number;
  hardwareConcurrency: number;
  shouldReduceAnimations: boolean;
  shouldLimitImages: boolean;
  shouldUseVirtualization: boolean;
}

export const usePerformanceOptimization = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    isLowEndDevice: false,
    connectionType: 'unknown',
    deviceMemory: 4,
    hardwareConcurrency: 4,
    shouldReduceAnimations: false,
    shouldLimitImages: false,
    shouldUseVirtualization: false,
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const detectDeviceCapabilities = () => {
      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      const deviceMemory = nav.deviceMemory || 4;
      const hardwareConcurrency = nav.hardwareConcurrency || 4;
      const connectionType = connection?.effectiveType || 'unknown';
      
      // Determine if device is low-end
      const isLowEndDevice = 
        deviceMemory < 2 || 
        hardwareConcurrency < 4 || 
        connectionType === '2g' ||
        connectionType === 'slow-2g';

      // Performance optimizations based on device capabilities
      const shouldReduceAnimations = 
        isLowEndDevice || 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      const shouldLimitImages = 
        isLowEndDevice || 
        connectionType === '2g' || 
        connectionType === 'slow-2g';
      
      const shouldUseVirtualization = 
        isLowEndDevice || deviceMemory < 4;

      setMetrics({
        isLowEndDevice,
        connectionType,
        deviceMemory,
        hardwareConcurrency,
        shouldReduceAnimations,
        shouldLimitImages,
        shouldUseVirtualization,
      });

      // Apply performance optimizations to DOM
      if (shouldReduceAnimations) {
        document.body.classList.add('reduce-motion');
      }
      
      if (isLowEndDevice) {
        document.body.classList.add('low-end-device');
      }
    };

    detectDeviceCapabilities();

    // Listen for connection changes
    const handleConnectionChange = () => {
      detectDeviceCapabilities();
    };

    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const optimizeForDevice = useCallback((config: {
    enableAnimations?: boolean;
    imageQuality?: number;
    cacheSize?: number;
  }) => {
    const { enableAnimations = true, imageQuality = 75, cacheSize = 50 } = config;
    
    return {
      animations: enableAnimations && !metrics.shouldReduceAnimations,
      imageQuality: metrics.shouldLimitImages ? Math.min(imageQuality, 60) : imageQuality,
      cacheSize: metrics.isLowEndDevice ? Math.min(cacheSize, 20) : cacheSize,
      lazyLoading: true,
      prefetch: !metrics.isLowEndDevice && isOnline,
    };
  }, [metrics, isOnline]);

  const getOptimalChunkSize = useCallback((totalItems: number) => {
    if (metrics.isLowEndDevice) {
      return Math.min(10, totalItems);
    }
    if (metrics.deviceMemory < 4) {
      return Math.min(20, totalItems);
    }
    return Math.min(50, totalItems);
  }, [metrics]);

  return {
    metrics,
    isOnline,
    optimizeForDevice,
    getOptimalChunkSize,
  };
};