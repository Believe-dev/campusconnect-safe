import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, Wifi, X } from 'lucide-react';

/**
 * Single source of truth for connection-state banners — this used to be
 * two separate components (OfflineNotification + NetworkNotification) that
 * could both render at once on the offline case, with different styling,
 * copy, and dismiss behavior. useNetworkStatus already covers both cases
 * this needs (offline via online/offline events, slow via
 * navigator.connection.effectiveType), so one component is enough.
 */
export const NetworkNotification = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  // Offline stays visible until back online or dismissed — auto-hiding it
  // after 5s while still offline would be actively misleading. Only the
  // slow-connection case is a transient heads-up that clears itself.
  useEffect(() => {
    if (!isOnline) {
      setDismissed(false);
      return;
    }
    if (isSlowConnection) {
      setDismissed(false);
      const timer = setTimeout(() => setDismissed(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSlowConnection]);

  if (dismissed || (isOnline && !isSlowConnection)) return null;

  return (
    <div className="fixed left-4 right-4 top-20 z-50 mx-auto max-w-sm md:left-auto">
      <div
        className={`flex items-center gap-3 rounded-2xl p-3.5 shadow-floating ${
          !isOnline ? 'bg-red-50' : 'bg-amber-50'
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            !isOnline ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {!isOnline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
        </span>
        <p className={`flex-1 text-sm font-medium ${!isOnline ? 'text-red-800' : 'text-amber-800'}`}>
          {!isOnline ? "You're offline — some features may not work." : 'Your connection is slow right now.'}
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
            !isOnline ? 'text-red-500 hover:bg-red-100' : 'text-amber-500 hover:bg-amber-100'
          }`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default NetworkNotification;
