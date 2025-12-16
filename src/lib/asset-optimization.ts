/**
 * Asset Optimization Utilities
 * Handles responsive image sizing, WebP format serving, and lazy loading configuration
 */

export interface ImageSizeConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface AssetOptimizationConfig {
  formats: string[];
  sizes: ImageSizeConfig;
  quality: number;
  lazyLoadThreshold: number;
  lazyLoadRootMargin: string;
}

export const DEFAULT_ASSET_CONFIG: AssetOptimizationConfig = {
  formats: ['webp', 'jpg', 'png'],
  sizes: {
    mobile: 768,
    tablet: 1024,
    desktop: 1920
  },
  quality: 85,
  lazyLoadThreshold: 0.1,
  lazyLoadRootMargin: '50px'
};

/**
 * Generate responsive image sizes string for different device types
 */
export const generateSizesString = (config: Partial<ImageSizeConfig> = {}): string => {
  const sizes = { ...DEFAULT_ASSET_CONFIG.sizes, ...config };
  
  return [
    `(max-width: 768px) ${sizes.mobile}px`,
    `(max-width: 1024px) ${sizes.tablet}px`,
    `${sizes.desktop}px`
  ].join(', ');
};

/**
 * Check if WebP format is supported by the browser
 */
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Generate optimized image URL based on device capabilities and size requirements
 */
export const getOptimizedImageUrl = (
  baseSrc: string,
  width: number,
  format: 'webp' | 'jpg' | 'png' = 'webp',
  quality: number = DEFAULT_ASSET_CONFIG.quality
): string => {
  // For now, return the base source since we don't have an image optimization service
  // In production, this would integrate with services like Cloudinary, ImageKit, or Next.js Image Optimization
  const extension = baseSrc.split('.').pop();
  const baseName = baseSrc.replace(`.${extension}`, '');
  
  if (format === 'webp') {
    return `${baseName}.webp`;
  }
  
  return baseSrc;
};

/**
 * Preload critical images for better performance
 */
export const preloadImage = (src: string, as: 'image' = 'image'): void => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = src;
  document.head.appendChild(link);
};

/**
 * Check if an element is below the fold (for lazy loading decisions)
 */
export const isBelowFold = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.top > window.innerHeight;
};

/**
 * Get appropriate image dimensions for current device
 */
export const getDeviceImageSize = (): number => {
  const width = window.innerWidth;
  
  if (width < 768) {
    return DEFAULT_ASSET_CONFIG.sizes.mobile;
  } else if (width < 1024) {
    return DEFAULT_ASSET_CONFIG.sizes.tablet;
  } else {
    return DEFAULT_ASSET_CONFIG.sizes.desktop;
  }
};