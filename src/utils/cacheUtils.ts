// Cache busting utilities

export const getCacheKey = (key: string): string => {
  const buildTime = (window as any).__BUILD_TIME__ || Date.now();
  return `${key}_${buildTime}`;
};

export const clearAllCaches = async (): Promise<void> => {
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear service worker caches if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    

  } catch (error) {
    console.error('Error clearing caches:', error);
  }
};

export const forceReload = (): void => {
  // Force reload without cache
  window.location.reload();
};

// Add version check to detect updates
export const checkForUpdates = (): void => {
  const currentVersion = (window as any).__BUILD_TIME__;
  const storedVersion = localStorage.getItem('app_version');
  
  if (storedVersion && storedVersion !== currentVersion) {

    clearAllCaches().then(() => {
      localStorage.setItem('app_version', currentVersion);
      forceReload();
    });
  } else if (!storedVersion) {
    localStorage.setItem('app_version', currentVersion);
  }
};