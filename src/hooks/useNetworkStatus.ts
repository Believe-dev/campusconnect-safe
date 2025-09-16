import { useState, useEffect } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Check connection speed
    const checkConnectionSpeed = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        const slowTypes = ['slow-2g', '2g', '3g'];
        setIsSlowConnection(slowTypes.includes(connection.effectiveType));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkConnectionSpeed();
    
    // Check connection speed periodically
    const interval = setInterval(checkConnectionSpeed, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isSlowConnection };
};