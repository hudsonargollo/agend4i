import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fallback?: string;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  className,
  fallback,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // Generate WebP source with fallback
  const generateSources = (baseSrc: string) => {
    const extension = baseSrc.split('.').pop();
    const baseName = baseSrc.replace(`.${extension}`, '');
    
    return {
      webp: `${baseName}.webp`,
      original: baseSrc
    };
  };

  const sources = generateSources(src);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Placeholder while loading */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-deep-purple/10 animate-pulse rounded-lg" />
      )}

      {/* Main image with WebP support */}
      {(isInView || priority) && (
        <picture>
          <source srcSet={sources.webp} type="image/webp" sizes={sizes} />
          <img
            ref={imgRef}
            src={error && fallback ? fallback : sources.original}
            alt={alt}
            sizes={sizes}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading={priority ? 'eager' : 'lazy'}
            {...props}
          />
        </picture>
      )}

      {/* Error fallback */}
      {error && !fallback && (
        <div className="absolute inset-0 bg-glass-surface flex items-center justify-center text-text-secondary text-sm">
          Image unavailable
        </div>
      )}
    </div>
  );
};

export { ResponsiveImage };