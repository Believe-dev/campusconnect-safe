import React from "react";
import { X, Share, Plus, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IOSInstallGuideProps {
  onClose: () => void;
}

export const IOSInstallGuide: React.FC<IOSInstallGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 relative">
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 p-2"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Install UniMarket
          </h2>
          <p className="text-sm text-gray-600">
            Add UniMarket to your home screen for quick access
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-sm font-semibold text-blue-600">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Tap the Share button
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Share className="h-4 w-4 text-blue-500" />
                <span>Look for this icon in Safari's toolbar</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-sm font-semibold text-blue-600">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Select "Add to Home Screen"
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Plus className="h-4 w-4 text-blue-500" />
                <span>Scroll down in the share menu to find this option</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-sm font-semibold text-blue-600">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Tap "Add" to confirm
              </p>
              <p className="text-xs text-gray-600">
                UniMarket will appear on your home screen like a native app
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">Benefits</span>
          </div>
          <ul className="text-xs text-green-700 space-y-1">
            <li>• Faster loading times</li>
            <li>• Works offline</li>
            <li>• Full-screen experience</li>
            <li>• Push notifications</li>
          </ul>
        </div>

        <Button 
          onClick={onClose}
          className="w-full mt-4"
        >
          Got it!
        </Button>
      </div>
    </div>
  );
};