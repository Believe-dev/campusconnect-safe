import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UniMarketPreloader, UniMarketPreloaderLite, useOptimizedPreloader } from './UniMarketPreloader';
import { useUniMarketNavigation } from '@/hooks/useUniMarketNavigation';

export const PreloaderDemo: React.FC = () => {
  const [showFullPreloader, setShowFullPreloader] = useState(false);
  const [showLitePreloader, setShowLitePreloader] = useState(false);
  const [showOptimizedPreloader, setShowOptimizedPreloader] = useState(false);
  
  const OptimizedPreloader = useOptimizedPreloader();
  const { goToMarketplace, goToProfile, goToOrders } = useUniMarketNavigation();

  const simulateLoading = (setter: (value: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 3000);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>UniMarket Preloader System Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Preloader Variants */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => simulateLoading(setShowFullPreloader)}
              variant="outline"
            >
              Show Full Preloader
            </Button>
            
            <Button 
              onClick={() => simulateLoading(setShowLitePreloader)}
              variant="outline"
            >
              Show Lite Preloader
            </Button>
            
            <Button 
              onClick={() => simulateLoading(setShowOptimizedPreloader)}
              variant="outline"
            >
              Show Optimized Preloader
            </Button>
          </div>

          {/* Navigation Examples */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Navigation with Preloader</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={goToMarketplace} className="friendly-button">
                Go to Marketplace
              </Button>
              
              <Button onClick={goToProfile} className="friendly-button">
                Go to Profile
              </Button>
              
              <Button onClick={goToOrders} className="friendly-button">
                Go to Orders
              </Button>
            </div>
          </div>

          {/* Device Info */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Device Information</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Memory: {(navigator as any).deviceMemory || 'Unknown'} GB</p>
              <p>CPU Cores: {navigator.hardwareConcurrency || 'Unknown'}</p>
              <p>Connection: {(navigator as any).connection?.effectiveType || 'Unknown'}</p>
              <p>Prefers Reduced Motion: {window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preloader Overlays */}
      {showFullPreloader && (
        <UniMarketPreloader 
          message="Demonstrating Full Preloader..." 
          size="lg" 
          fullScreen={true} 
        />
      )}

      {showLitePreloader && (
        <UniMarketPreloaderLite 
          message="Demonstrating Lite Preloader..." 
          fullScreen={true} 
        />
      )}

      {showOptimizedPreloader && (
        <OptimizedPreloader 
          message="Demonstrating Optimized Preloader..." 
          fullScreen={true} 
        />
      )}
    </div>
  );
};