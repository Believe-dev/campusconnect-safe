/**
 * PWA utility functions for installation detection and management
 */

/**
 * Check if the app is running in standalone mode (installed as PWA)
 */
export const isStandalone = (): boolean => {
  // Check for display-mode: standalone
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for iOS standalone mode
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  // Check for Android TWA (Trusted Web Activity)
  if (document.referrer.includes('android-app://')) {
    return true;
  }
  
  return false;
};

/**
 * Check if the device is iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

/**
 * Check if the browser is Safari
 */
export const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

/**
 * Check if PWA installation is supported
 */
export const isPWAInstallSupported = (): boolean => {
  // iOS Safari supports manual installation
  if (isIOS() && isSafari()) {
    return true;
  }
  
  // Check for beforeinstallprompt support (Chrome/Edge)
  return 'beforeinstallprompt' in window;
};

/**
 * Get the appropriate installation method for the current platform
 */
export const getInstallationMethod = (): 'automatic' | 'manual' | 'unsupported' => {
  if (isStandalone()) {
    return 'unsupported'; // Already installed
  }
  
  if (isIOS() && isSafari()) {
    return 'manual'; // iOS requires manual installation
  }
  
  if ('beforeinstallprompt' in window) {
    return 'automatic'; // Chrome/Edge automatic prompt
  }
  
  return 'unsupported';
};

/**
 * Check if the user has dismissed the PWA prompt recently
 */
export const hasRecentlyDismissedPrompt = (): boolean => {
  const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
  if (!dismissedTime) return false;
  
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return parseInt(dismissedTime) > oneDayAgo;
};

/**
 * Mark the PWA prompt as dismissed
 */
export const markPromptDismissed = (): void => {
  localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
};

/**
 * Clear the PWA prompt dismissal flag
 */
export const clearPromptDismissal = (): void => {
  localStorage.removeItem('pwa-prompt-dismissed');
};

/**
 * Get PWA installation instructions for iOS
 */
export const getIOSInstallInstructions = (): string[] => {
  return [
    'Tap the Share button in Safari',
    'Scroll down and select "Add to Home Screen"',
    'Tap "Add" to install UniMarket',
    'Find the app icon on your home screen'
  ];
};

/**
 * Track PWA installation events
 */
export const trackPWAInstallation = (method: 'automatic' | 'manual'): void => {
  // Track installation for analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'pwa_install', {
      method: method,
      platform: isIOS() ? 'ios' : 'android'
    });
  }
  
  console.log(`PWA installed via ${method} method`);
};