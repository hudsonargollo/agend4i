/**
 * Caching Strategy Implementation for AgendAi Marketing Experience
 * Implements appropriate cache headers and strategies for different asset types
 */

export interface CacheConfig {
  maxAge: number;
  staleWhileRevalidate?: number;
  immutable?: boolean;
  noCache?: boolean;
}

export const CACHE_STRATEGIES = {
  // Static assets (images, fonts, etc.) - long cache with immutable flag
  STATIC_ASSETS: {
    maxAge: 31536000, // 1 year
    immutable: true,
  } as CacheConfig,

  // CSS and JS bundles - long cache but can be updated
  BUNDLES: {
    maxAge: 31536000, // 1 year
    staleWhileRevalidate: 86400, // 1 day
  } as CacheConfig,

  // HTML pages - short cache with stale-while-revalidate
  HTML_PAGES: {
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 1 day
  } as CacheConfig,

  // API responses - very short cache
  API_RESPONSES: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes
  } as CacheConfig,

  // Dynamic content - no cache
  DYNAMIC_CONTENT: {
    maxAge: 0,
    noCache: true,
  } as CacheConfig,
} as const;

/**
 * Generate Cache-Control header value from cache config
 */
export function generateCacheControlHeader(config: CacheConfig): string {
  const directives: string[] = [];

  if (config.noCache) {
    directives.push('no-cache', 'no-store', 'must-revalidate');
    return directives.join(', ');
  }

  directives.push(`max-age=${config.maxAge}`);

  if (config.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  if (config.immutable) {
    directives.push('immutable');
  }

  // Add public directive for cacheable content
  if (config.maxAge > 0) {
    directives.push('public');
  }

  return directives.join(', ');
}

/**
 * Get appropriate cache strategy based on file extension or content type
 */
export function getCacheStrategyForAsset(filePath: string): CacheConfig {
  const extension = filePath.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'svg':
    case 'ico':
    case 'woff':
    case 'woff2':
    case 'ttf':
    case 'eot':
      return CACHE_STRATEGIES.STATIC_ASSETS;

    case 'js':
    case 'css':
      return CACHE_STRATEGIES.BUNDLES;

    case 'html':
      return CACHE_STRATEGIES.HTML_PAGES;

    case 'json':
      // API responses or config files
      return filePath.includes('api/') 
        ? CACHE_STRATEGIES.API_RESPONSES 
        : CACHE_STRATEGIES.BUNDLES;

    default:
      return CACHE_STRATEGIES.DYNAMIC_CONTENT;
  }
}

/**
 * Service Worker registration and cache management
 */
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  async register(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('Service Worker registered successfully:', this.registration);

        // Listen for updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, notify user
                this.notifyUpdate();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async unregister(): Promise<void> {
    if (this.registration) {
      await this.registration.unregister();
      this.registration = null;
    }
  }

  private notifyUpdate(): void {
    // Could integrate with toast system or custom notification
    console.log('New content available! Please refresh the page.');
  }

  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
  }
}

/**
 * Preload critical resources with appropriate caching
 */
export function preloadCriticalResources(): void {
  const criticalResources = [
    // Critical CSS
    { href: '/assets/index.css', as: 'style' },
    // Critical fonts
    { href: '/fonts/inter-variable.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
    // Hero image
    { href: '/images/hero-dashboard.webp', as: 'image' },
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.href;
    link.as = resource.as;
    
    if (resource.type) {
      link.type = resource.type;
    }
    
    if (resource.crossorigin) {
      link.crossOrigin = resource.crossorigin;
    }

    document.head.appendChild(link);
  });
}

/**
 * CDN cache configuration for different environments
 */
export const CDN_CACHE_RULES = {
  production: {
    staticAssets: {
      ttl: 31536000, // 1 year
      browserTtl: 31536000,
      edgeTtl: 31536000,
    },
    htmlPages: {
      ttl: 3600, // 1 hour
      browserTtl: 0, // Always revalidate in browser
      edgeTtl: 3600,
    },
    apiResponses: {
      ttl: 300, // 5 minutes
      browserTtl: 0,
      edgeTtl: 300,
    },
  },
  staging: {
    staticAssets: {
      ttl: 86400, // 1 day
      browserTtl: 86400,
      edgeTtl: 86400,
    },
    htmlPages: {
      ttl: 300, // 5 minutes
      browserTtl: 0,
      edgeTtl: 300,
    },
    apiResponses: {
      ttl: 60, // 1 minute
      browserTtl: 0,
      edgeTtl: 60,
    },
  },
} as const;