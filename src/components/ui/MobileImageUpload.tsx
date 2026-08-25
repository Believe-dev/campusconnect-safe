import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';

interface MobileImageUploadProps {
  onUpload: (url: string) => void;
  bucket: string;
  path: string;
  accept?: string;
  maxSize?: number;
  className?: string;
  children?: React.ReactNode;
}

export const MobileImageUpload = ({
  onUpload,
  bucket,
  path,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxSize = 2 * 1024 * 1024,
  className = "",
  children
}: MobileImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const { isLowMemory } = useMemoryOptimization();
  
  const { uploadImage, uploading } = useImageUpload({
    maxSize,
    quality: isLowMemory ? 0.6 : 0.8,
    maxWidth: isLowMemory ? 600 : 1200,
    maxHeight: isLowMemory ? 600 : 1200
  });

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    
    const url = await uploadImage(file, bucket, path);
    if (url) {
      onUpload(url);
    }
    setShowOptions(false);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input
    event.target.value = '';
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  // Check if device supports camera
  const hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        disabled={uploading}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
        disabled={uploading}
      />

      {children ? (
        <div onClick={() => setShowOptions(true)} className="cursor-pointer">
          {children}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowOptions(true)}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Photo'}
        </Button>
      )}

      {/* Mobile-friendly options */}
      {showOptions && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-lg p-4 space-y-3">
            <div className="text-center">
              <h3 className="font-medium">Select Photo</h3>
              <p className="text-sm text-muted-foreground">
                Choose how to add your photo
              </p>
            </div>
            
            <div className="space-y-2">
              {hasCamera && (
                <Button
                  variant="outline"
                  onClick={triggerCamera}
                  disabled={uploading}
                  className="w-full justify-start"
                >
                  <Camera className="h-4 w-4 mr-3" />
                  Take Photo
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={triggerFileSelect}
                disabled={uploading}
                className="w-full justify-start"
              >
                <ImageIcon className="h-4 w-4 mr-3" />
                Choose from Gallery
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setShowOptions(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              Max size: {Math.round(maxSize / (1024 * 1024))}MB
              {isLowMemory && " • Optimized for your device"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};