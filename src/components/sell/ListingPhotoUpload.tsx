import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMemoryOptimization } from "@/hooks/useMemoryOptimization";
import { uploadProductImageToR2 } from "@/utils/r2Upload";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, X } from "lucide-react";

interface ListingPhotoUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

// Replaces three separate bordered "Upload Image" boxes with a single
// drag-and-drop grid: existing photos as removable thumbnails (first one
// badged "Cover"), one open "Add" tile for the remaining slots. Compression
// logic is the same as the old ProductImageUpload (canvas downscale, more
// aggressive on low-memory devices) - just no longer tied to a fixed
// per-index slot, so a drop of multiple files fills the next open ones.
export const ListingPhotoUpload = ({ images, onChange, maxImages = 3 }: ListingPhotoUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isLowMemory } = useMemoryOptimization();
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const compressImage = (file: File): Promise<File> =>
    new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        const maxSize = isLowMemory ? 300 : 600;
        const quality = isLowMemory ? 0.3 : 0.6;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            resolve(
              blob
                ? new File([blob], "compressed.jpg", { type: "image/jpeg", lastModified: Date.now() })
                : file
            );
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });

  const uploadWithRetry = async (file: File, attempt = 1): Promise<string> => {
    try {
      return await uploadProductImageToR2(file);
    } catch (error) {
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        return uploadWithRetry(file, attempt + 1);
      }
      throw error;
    }
  };

  const uploadOne = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please select an image file", variant: "destructive" });
      return null;
    }
    try {
      const compressed = await compressImage(file);
      const maxSize = isLowMemory ? 500 * 1024 : 1024 * 1024;
      if (compressed.size > maxSize) {
        throw new Error(`File too large. Max size: ${Math.round(maxSize / 1024)}KB`);
      }
      return await uploadWithRetry(compressed);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const openSlots = maxImages - images.length;
    if (openSlots <= 0) return;
    const toUpload = Array.from(files).slice(0, openSlots);
    if (toUpload.length === 0) return;

    setUploadingCount((c) => c + toUpload.length);
    const results = await Promise.all(toUpload.map(uploadOne));
    setUploadingCount((c) => c - toUpload.length);

    const uploaded = results.filter((url): url is string => !!url);
    if (uploaded.length > 0) {
      onChange([...images, ...uploaded]);
    }
  };

  const removeAt = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const openSlots = Math.max(0, maxImages - images.length);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {images.map((url, index) => (
          <div key={url} className="relative aspect-square overflow-hidden rounded-2xl bg-flora-chip shadow-card">
            <img src={url} alt={`Product photo ${index + 1}`} className="h-full w-full object-cover" />
            {index === 0 && (
              <span className="absolute left-2 top-2 rounded-full bg-flora-ink/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="Remove photo"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {Array.from({ length: Math.min(openSlots, uploadingCount) }).map((_, i) => (
          <div
            key={`uploading-${i}`}
            className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-flora-ink/15 bg-flora-chip/40"
          >
            <Loader2 className="h-5 w-5 animate-spin text-flora-muted" />
          </div>
        ))}

        {openSlots > uploadingCount && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-flora-muted transition",
              isDragging
                ? "border-flora-leaf bg-flora-tagBg/60"
                : "border-flora-ink/20 bg-flora-chip/40 hover:border-flora-leaf hover:bg-flora-chip"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs font-medium">{images.length === 0 ? "Add photos" : "Add"}</span>
          </label>
        )}
      </div>

      <p className="mt-3 text-xs text-flora-muted">
        {images.length}/{maxImages} photos
        {images.length === 0 && " — at least 1 is required. Drag & drop or tap to upload."}
        {isLowMemory && images.length > 0 && " • Optimized for your device"}
      </p>
    </div>
  );
};

export default ListingPhotoUpload;
