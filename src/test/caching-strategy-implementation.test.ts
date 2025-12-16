/**
 * Property-Based Tests for Caching Strategy Implementation
 * **Feature: marketing-experience, Property 18: Caching Strategy Implementation**
 * **Validates: Requirements 7.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  generateCacheControlHeader, 
  getCacheStrategyForAsset, 
  CACHE_STRATEGIES,
  type CacheConfig 
} from '../lib/caching-strategy';

describe('Caching Strategy Implementation', () => {
  /**
   * **Feature: marketing-experience, Property 18: Caching Strategy Implementation**
   * For any asset type, the system should implement appropriate caching strategies
   * based on asset type and update frequency
   */
  it('should generate valid Cache-Control headers for all cache configurations', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxAge: fc.integer({ min: 0, max: 31536000 }), // 0 to 1 year
          staleWhileRevalidate: fc.option(fc.integer({ min: 60, max: 86400 })), // 1 minute to 1 day
          immutable: fc.option(fc.boolean()),
          noCache: fc.option(fc.boolean()),
        }),
        (config: CacheConfig) => {
          const header = generateCacheControlHeader(config);
          
          // Header should be a non-empty string
          expect(header).toBeTruthy();
          expect(typeof header).toBe('string');
          
          if (config.noCache) {
            // No-cache configurations should include proper directives
            expect(header).toContain('no-cache');
            expect(header).toContain('no-store');
            expect(header).toContain('must-revalidate');
          } else {
            // Cacheable configurations should include max-age
            expect(header).toContain(`max-age=${config.maxAge}`);
            
            if (config.maxAge > 0) {
              expect(header).toContain('public');
            }
            
            if (config.staleWhileRevalidate) {
              expect(header).toContain(`stale-while-revalidate=${config.staleWhileRevalidate}`);
            }
            
            if (config.immutable) {
              expect(header).toContain('immutable');
            }
          }
          
          // Header should not contain invalid characters
          expect(header).not.toContain('undefined');
          expect(header).not.toContain('null');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return appropriate cache strategies for different asset types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Static assets
          fc.constantFrom('image.jpg', 'photo.jpeg', 'icon.png', 'logo.webp', 'graphic.svg', 'favicon.ico'),
          fc.constantFrom('font.woff', 'font.woff2', 'font.ttf', 'font.eot'),
          // Bundles
          fc.constantFrom('app.js', 'main.css', 'chunk-123.js', 'styles.css'),
          // HTML pages
          fc.constantFrom('index.html', 'about.html', 'contact.html'),
          // API responses
          fc.constantFrom('api/users.json', 'api/data.json', 'config.json'),
          // Unknown types
          fc.constantFrom('file.txt', 'document.pdf', 'data.xml')
        ),
        (filePath: string) => {
          const strategy = getCacheStrategyForAsset(filePath);
          
          // Strategy should be a valid cache config
          expect(strategy).toBeDefined();
          expect(typeof strategy.maxAge).toBe('number');
          expect(strategy.maxAge).toBeGreaterThanOrEqual(0);
          
          const extension = filePath.split('.').pop()?.toLowerCase();
          
          // Verify appropriate strategies for different asset types
          if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'].includes(extension || '')) {
            // Static assets should have long cache times
            expect(strategy.maxAge).toBeGreaterThanOrEqual(86400); // At least 1 day
            expect(strategy).toEqual(CACHE_STRATEGIES.STATIC_ASSETS);
          } else if (['js', 'css'].includes(extension || '')) {
            // Bundles should have long cache with stale-while-revalidate
            expect(strategy.maxAge).toBeGreaterThanOrEqual(86400); // At least 1 day
            expect(strategy).toEqual(CACHE_STRATEGIES.BUNDLES);
          } else if (extension === 'html') {
            // HTML should have shorter cache
            expect(strategy.maxAge).toBeLessThanOrEqual(3600); // At most 1 hour
            expect(strategy).toEqual(CACHE_STRATEGIES.HTML_PAGES);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure static assets have immutable flag for optimal caching', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'image.jpg', 'photo.jpeg', 'icon.png', 'logo.webp', 'graphic.svg',
          'font.woff', 'font.woff2', 'font.ttf', 'favicon.ico'
        ),
        (staticAsset: string) => {
          const strategy = getCacheStrategyForAsset(staticAsset);
          const header = generateCacheControlHeader(strategy);
          
          // Static assets should be immutable for optimal caching
          expect(strategy.immutable).toBe(true);
          expect(header).toContain('immutable');
          
          // Should have long cache time
          expect(strategy.maxAge).toBe(31536000); // 1 year
          expect(header).toContain('max-age=31536000');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure dynamic content has no-cache strategy', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('file.txt', 'document.pdf', 'data.xml', 'unknown.xyz'),
        (dynamicFile: string) => {
          const strategy = getCacheStrategyForAsset(dynamicFile);
          
          // Dynamic content should not be cached
          expect(strategy.maxAge).toBe(0);
          expect(strategy.noCache).toBe(true);
          
          const header = generateCacheControlHeader(strategy);
          expect(header).toContain('no-cache');
          expect(header).toContain('no-store');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate consistent cache headers for the same configuration', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxAge: fc.integer({ min: 0, max: 31536000 }),
          staleWhileRevalidate: fc.option(fc.integer({ min: 60, max: 86400 })),
          immutable: fc.option(fc.boolean()),
          noCache: fc.option(fc.boolean()),
        }),
        (config: CacheConfig) => {
          const header1 = generateCacheControlHeader(config);
          const header2 = generateCacheControlHeader(config);
          
          // Same configuration should produce identical headers
          expect(header1).toBe(header2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases in cache configuration gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          maxAge: fc.oneof(
            fc.constant(0),
            fc.constant(1),
            fc.constant(31536000),
            fc.integer({ min: 0, max: 31536000 })
          ),
          staleWhileRevalidate: fc.option(fc.oneof(
            fc.constant(0),
            fc.constant(1),
            fc.constant(86400)
          )),
          immutable: fc.option(fc.boolean()),
          noCache: fc.option(fc.boolean()),
        }),
        (config: CacheConfig) => {
          // Should not throw errors for any valid configuration
          expect(() => generateCacheControlHeader(config)).not.toThrow();
          
          const header = generateCacheControlHeader(config);
          expect(typeof header).toBe('string');
          expect(header.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});