import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface SimpleImageUploadProps {
  onUpload: (url: string) => void;
  bucket: string;
  path: string;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}

export const SimpleImageUpload = ({ onUpload, bucket, path, uploading, setUploading }: SimpleImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxSize = 400; // Very small for low-end phones
        let { width, height } = img;
        
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
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', 0.5); // Very low quality for compatibility
      };
      
      img.src = URL.createObjectURL(file);
    });
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
    
    try {
      // Compress image for low-end phones
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], 'image.jpg', { type: 'image/jpeg' });
      
      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, compressedFile, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      onUpload(urlData.publicUrl);
      
      toast({
        title: "Upload Successful",
        description: "Your image has been uploaded.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Please try again with a smaller image.",
        variant: "destructive",
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
        accept="image/*"
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
        {uploading ? 'Uploading...' : 'Upload Photo'}
      </Button>
    </>
  );
};