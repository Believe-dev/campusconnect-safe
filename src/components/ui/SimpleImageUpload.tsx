import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleImageUploadProps {
  onImageSelect?: (file: File) => void;
  onUpload?: (url: string) => void;
  bucket?: string;
  path?: string;
  uploading?: boolean;
  setUploading?: (uploading: boolean) => void;
  accept?: string;
  className?: string;
}

export const SimpleImageUpload = ({
  onImageSelect,
  onUpload,
  bucket,
  path,
  uploading,
  setUploading,
  accept = "image/*",
  className,
}: SimpleImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setSelectedFile(file);

    // Call the callback with the file
    onImageSelect?.(file);

    // Reset input
    event.target.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed border-border rounded-xl p-6 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 min-h-[140px] flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10",
          className
        )}
      >
        {preview ? (
          <div className="flex items-center space-y-4 w-full">
            <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted border-2 border-border shadow-sm">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground font-medium truncate max-w-[180px]">
                {selectedFile?.name}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="h-8 px-4 text-xs bg-white/80 hover:bg-white border-border hover:border-primary/50 transition-all"
              >
                Change Image
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 text-muted-foreground">
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
              <ImageIcon className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                Click to upload image
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
