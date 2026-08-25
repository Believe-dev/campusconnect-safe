import { useEffect, useState } from 'react';

export const useMemoryOptimization = () => {
  const [isLowMemory, setIsLowMemory] = useState(false);

  useEffect(() => {
    // Detect low memory devices
    const checkMemory = () => {
      const memory = (navigator as any).deviceMemory;
      const connection = (navigator as any).connection;
      
      // Consider low memory if:
      // - Device memory < 2GB
      // - Slow connection
      // - Limited hardware concurrency
      const lowMemoryIndicators = [
        memory && memory < 2,
        connection && connection.effectiveType === '2g',
        navigator.hardwareConcurrency < 4
      ].filter(Boolean).length;

      setIsLowMemory(lowMemoryIndicators >= 1);
    };

    checkMemory();
  }, []);

  return { isLowMemory };
};