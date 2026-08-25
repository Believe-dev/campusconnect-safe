import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, RefreshCw } from 'lucide-react';
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';

interface CompressedImageUploadProps {
  onUpload: (url: string) => void;
  bucket: string;
  path: string;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  label?: string;
}

export const CompressedImageUpload = ({ 
  onUpload, 
  bucket, 
  path, 
  uploading, 
  setUploading,
  label = "Upload Photo"
}: CompressedImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isLowMemory } = useMemoryOptimization();
  const [retryCount, setRetryCount] = useState(0);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Aggressive compression for low-end phones
        const maxSize = isLowMemory ? 300 : 600;
        const quality = isLowMemory ? 0.3 : 0.6;
        
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw with image smoothing disabled for better performance
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], 'compressed.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadWithRetry = async (file: File, attempt = 1): Promise<string> => {
    const maxRetries = 3;
    
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { 
          upsert: true,
          cacheControl: '3600'
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return uploadWithRetry(file, attempt + 1);
      }
      throw error;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setRetryCount(0);
    
    try {
      // Compress image
      const compressedFile = await compressImage(file);
      
      // Check size limit for low-memory devices
      const maxSize = isLowMemory ? 500 * 1024 : 1024 * 1024; // 500KB vs 1MB
      if (compressedFile.size > maxSize) {
        throw new Error(`File too large. Max size: ${Math.round(maxSize / 1024)}KB`);
      }
      
      // Upload with retry
      const url = await uploadWithRetry(compressedFile);
      
      onUpload(url);
      
      toast({
        title: "Upload Successful",
        description: "Your image has been uploaded.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
        action: retryCount < 2 ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setRetryCount(prev => prev + 1);
              handleFileSelect(event);
            }}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        ) : undefined
      });
    } finally {
      setUploading(false);
    }
    
    // Reset input
    event.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*;capture=camera"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? 'Uploading...' : label}
      </Button>
      
      {isLowMemory && (
        <p className="text-xs text-muted-foreground mt-1 text-center">
          Max 500KB • Optimized for your device
        </p>
      )}
    </>
  );
};