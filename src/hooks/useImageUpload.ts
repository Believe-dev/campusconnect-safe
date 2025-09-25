import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseImageUploadOptions {
  maxSize?: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const {
    maxSize = 2 * 1024 * 1024, // 2MB for low-end phones
    quality = 0.7,
    maxWidth = 800,
    maxHeight = 800
  } = options;
  
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (
    file: File,
    bucket: string,
    path: string
  ): Promise<string | null> => {
    if (!file) return null;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return null;
    }

    setUploading(true);
    
    try {
      let processedFile = file;
      
      // Compress if file is too large
      if (file.size > maxSize) {
        console.log('Compressing image:', file.size, 'bytes');
        processedFile = await compressImage(file);
        console.log('Compressed to:', processedFile.size, 'bytes');
      }

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, processedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadImage,
    uploading,
    compressImage
  };
};