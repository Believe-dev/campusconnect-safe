import React, { useState, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fallback?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 75,
  sizes,
  fallback = '/placeholder.svg',
  className,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    setCurrentSrc(fallback);
    onError?.();
  }, [fallback, onError]);

  // Generate WebP and responsive sources
  const generateSrcSet = (baseSrc: string) => {
    if (!baseSrc || baseSrc.startsWith('data:') || baseSrc.includes('placeholder')) {
      return baseSrc;
    }

    // For Supabase storage URLs, generate responsive variants
    if (baseSrc.includes('supabase.co/storage')) {
      const baseUrl = baseSrc.split('?')[0];
      const sizes = [320, 640, 768, 1024, 1280];
      
      return sizes
        .map(size => `${baseUrl}?width=${size}&quality=${quality} ${size}w`)
        .join(', ');
    }

    return baseSrc;
  };

  const srcSet = generateSrcSet(currentSrc);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse"
          style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}
        />
      )}
      
      <picture>
        {/* WebP source for modern browsers */}
        {!hasError && !currentSrc.includes('placeholder') && (
          <source
            srcSet={srcSet.replace(/\.(jpg|jpeg|png)/gi, '.webp')}
            sizes={sizes}
            type="image/webp"
          />
        )}
        
        {/* AVIF source for even better compression */}
        {!hasError && !currentSrc.includes('placeholder') && (
          <source
            srcSet={srcSet.replace(/\.(jpg|jpeg|png)/gi, '.avif')}
            sizes={sizes}
            type="image/avif"
          />
        )}
        
        {/* Fallback image */}
        <img
          src={currentSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            'max-w-full h-auto'
          )}
          {...props}
        />
      </picture>
      
      {/* Loading skeleton overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted loading-shimmer" />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export { OptimizedImage };