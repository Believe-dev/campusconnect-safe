import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, Signal } from 'lucide-react';

export const NetworkStatus = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  if (isOnline && !isSlowConnection) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <WifiOff className="h-4 w-4 text-red-500" />
        ) : (
          <Signal className="h-4 w-4 text-orange-500" />
        )}
        <AlertDescription className="text-sm">
          {!isOnline 
            ? "You're offline. Some features may not work properly."
            : "Slow connection detected. Images and content may load slowly."
          }
        </AlertDescription>
      </div>
    </Alert>
  );
};