import { useEffect, useState } from 'react';

export const useLiteMode = () => {
  const [isLiteMode, setIsLiteMode] = useState(false);

  useEffect(() => {
    // Detect low memory devices (≤4GB) or fallback to safe mode
    const deviceMemory = (navigator as any).deviceMemory;
    const isLowMemory = deviceMemory ? deviceMemory <= 4 : true; // Fallback to safe mode
    
    setIsLiteMode(isLowMemory);
    
    if (isLowMemory) {
      document.body.classList.add('lite-mode');
    }

    return () => {
      document.body.classList.remove('lite-mode');
    };
  }, []);

  return { isLiteMode };
};