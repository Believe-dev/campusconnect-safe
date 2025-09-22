import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface StableImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
}

export const StableImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  priority = false,
  objectFit = 'cover'
}: StableImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, shouldLoad]);

  return (
    <div 
      className={cn('relative overflow-hidden', className)}
      style={{ 
        width, 
        height,
        backfaceVisibility: 'hidden',
        willChange: 'transform'
      }}
    >
      {/* Stable placeholder */}
      <div 
        className="absolute inset-0 bg-muted"
        style={{ width, height }}
      />
      
      {/* Actual image */}
      {shouldLoad && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            'absolute inset-0 transition-opacity duration-200',
            isLoaded && !hasError ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            width,
            height,
            objectFit,
            backfaceVisibility: 'hidden',
            willChange: 'transform'
          }}
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div 
          className="absolute inset-0 bg-muted flex items-center justify-center"
          style={{ width, height }}
        >
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      )}
    </div>
  );
};