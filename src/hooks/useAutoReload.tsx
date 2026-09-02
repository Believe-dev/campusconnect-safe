import { useEffect } from 'react';

export const useAutoReload = () => {
  useEffect(() => {
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
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
          // Silently adopt the new version marker; the updated assets are
          // picked up naturally on the user's next navigation/reload.
          localStorage.setItem('app_version', manifest.version);
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
  }, []);
};
