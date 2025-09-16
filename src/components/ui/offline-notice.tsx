import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';

export const OfflineNotice = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <Alert className="mb-4 border-red-200 bg-red-50">
      <WifiOff className="h-4 w-4 text-red-500" />
      <AlertDescription className="text-red-700">
        No internet connection. You're viewing cached content. Some features may not work properly.
      </AlertDescription>
    </Alert>
  );
};