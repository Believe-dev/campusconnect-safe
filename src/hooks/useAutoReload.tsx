import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export const useAutoReload = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true);
        toast({
          title: "Update Available",
          description: "A new version is available. Refresh to update.",
          action: (
            <ToastAction altText="Refresh" onClick={() => window.location.reload()}>
              Refresh
            </ToastAction>
          ),
        });
      });

      // Check for updates periodically
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      };

      // Check for updates every 30 minutes
      const interval = setInterval(checkForUpdates, 30 * 60 * 1000);

      // Initial check
      checkForUpdates();

      return () => clearInterval(interval);
    }

    // Fallback: Check for new version by comparing build timestamp
    const checkBuildVersion = async () => {
      try {
        const response = await fetch('/manifest.json?' + Date.now());
        const manifest = await response.json();
        const currentVersion = localStorage.getItem('app_version');

        if (currentVersion && currentVersion !== manifest.version) {
          setUpdateAvailable(true);
          toast({
            title: "Update Available",
            description: "A new version is available. Refresh to update.",
            action: (
              <ToastAction
                altText="Refresh"
                onClick={() => {
                  localStorage.setItem('app_version', manifest.version);
                  window.location.reload();
                }}
              >
                Refresh
              </ToastAction>
            ),
          });
        } else if (!currentVersion) {
          localStorage.setItem('app_version', manifest.version || '1.0.0');
        }
      } catch (error) {
        // Silently handle errors
      }
    };

    const versionInterval = setInterval(checkBuildVersion, 60 * 60 * 1000); // Check every hour
    checkBuildVersion();

    return () => clearInterval(versionInterval);
  }, [toast]);

  return { updateAvailable };
};
