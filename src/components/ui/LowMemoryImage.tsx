import { useState, useRef, useEffect } from 'react';
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';

interface LowMemoryImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export const LowMemoryImage = ({ src, alt, width, height, className }: LowMemoryImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { isLowMemory } = useMemoryOptimization();

  useEffect(() => {
    if (shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: isLowMemory ? '50px' : '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [shouldLoad, isLowMemory]);

  // Low quality placeholder for low memory devices
  const placeholder = isLowMemory 
    ? `data:image/svg+xml;base64,${btoa(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/></svg>`)}`
    : undefined;

  return (
    <div 
      ref={imgRef}
      className={className}
      style={{ width, height, backgroundColor: '#f3f4f6' }}
    >
      {shouldLoad ? (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setIsLoaded(true)}
          style={{
            width,
            height,
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: isLowMemory ? 'none' : 'opacity 0.2s'
          }}
          loading="lazy"
        />
      ) : (
        placeholder && <img src={placeholder} alt="" style={{ width, height }} />
      )}
    </div>
  );
};