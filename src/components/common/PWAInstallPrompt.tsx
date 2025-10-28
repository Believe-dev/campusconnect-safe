import React, { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IOSInstallGuide } from "./IOSInstallGuide";
import { 
  isStandalone, 
  isIOS as checkIsIOS, 
  isSafari as checkIsSafari, 
  getInstallationMethod, 
  hasRecentlyDismissedPrompt, 
  markPromptDismissed,
  trackPWAInstallation
} from "@/utils/pwaUtils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const iOS = checkIsIOS();
    const safari = checkIsSafari();
    setIsIOS(iOS);

    // Check if already installed or recently dismissed
    if (isStandalone() || hasRecentlyDismissedPrompt()) {
      return;
    }

    const installMethod = getInstallationMethod();
    if (installMethod === 'unsupported') {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Add event listener for beforeinstallprompt (Android/Chrome)
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show prompt based on installation method
    const timer = setTimeout(() => {
      if (installMethod === 'manual') {
        // iOS Safari - show manual installation prompt
        setShowPrompt(true);
      } else if (installMethod === 'automatic' && !deferredPrompt) {
        // Other browsers without beforeinstallprompt event
        setShowPrompt(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt outcome:', outcome);
        if (outcome === "accepted") {
          trackPWAInstallation('automatic');
          setDeferredPrompt(null);
          setShowPrompt(false);
        }
      } catch (error) {
        console.error('Error showing install prompt:', error);
      }
    } else {
      // Fallback for browsers that don't support beforeinstallprompt
      alert('To install this app:\n\n1. Open browser menu (⋮)\n2. Select "Add to Home screen" or "Install app"\n3. Follow the prompts');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    markPromptDismissed();
  };

  if (!showPrompt) return null;

  return (
    <>
      <div className="force-fixed-pwa bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm mx-auto">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-black">
            Install UniMarket
          </h3>
          <p className="text-xs text-black mt-1 leading-relaxed">
            {isIOS ? (
              <span className="space-y-1">
                <div className="flex items-center gap-1">
                  <span>1. Tap the Share button</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16,6 12,2 8,6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </div>
                <div>2. Select "Add to Home Screen"</div>
                <div className="text-gray-600">Get faster access & offline features!</div>
              </span>
            ) : (
              "Install our app for faster access and offline features"
            )}
          </p>
          <div className="flex gap-2 mt-3">
            {!isIOS && (
              <Button size="sm" onClick={handleInstall} className="text-xs">
                <Download className="h-3 w-3 mr-1" />
                {deferredPrompt ? 'Install' : 'Add to Home'}
              </Button>
            )}
            {isIOS && (
              <Button 
                size="sm" 
                onClick={() => setShowIOSGuide(true)} 
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white"
              >
                Show me how
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="text-xs"
            >
              {isIOS ? 'Maybe later' : 'Later'}
            </Button>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="p-1 h-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
    
    {showIOSGuide && (
      <IOSInstallGuide onClose={() => setShowIOSGuide(false)} />
    )}
    </>
  );
};
