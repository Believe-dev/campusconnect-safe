import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';

export const NetworkNotification = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!isOnline || isSlowConnection) {
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSlowConnection]);

  if (!showNotification) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Alert className="bg-orange-50 border-orange-200">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          {!isOnline 
            ? "You're offline. Some features may not work."
            : "Your network connection is slow."
          }
        </AlertDescription>
      </Alert>
    </div>
  );
};