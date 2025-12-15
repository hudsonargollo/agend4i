/**
 * Property-based tests for tenant routing preservation
 * 
 * **Feature: domain-migration, Property 6: Tenant routing pattern preservation**
 * **Validates: Requirements 3.1, 3.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  generateTenantURL, 
  generateAdminURL,
  type EnvironmentDetector 
} from '@/lib/domain';

// Helper function to create mock environment detector
function createMockDetector(overrides: Partial<EnvironmentDetector> = {}): EnvironmentDetector {
  return {
    isDev: false,
    hostname: 'localhost',
    viteEnvironment: undefined,
    viteAppDomain: undefined,
    ...overrides,
  };
}

describe('Tenant Routing Preservation', () => {
  describe('Property 6: Tenant routing pattern preservation', () => {
    it('should maintain /{tenant} pattern for all tenant URLs regardless of domain', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('development', 'staging', 'production'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), // tenant slug
          fc.option(fc.string({ minLength: 1, maxLength: 100 })), // optional path
          (environment, tenantSlug, path) => {
            // Create environment detector
            const detector = createMockDetector({
              isDev: environment === 'development',
              hostname: environment === 'development' ? 'localhost' : 'agendai.clubemkt.digital',
              viteEnvironment: environment,
            });

            // Generate tenant URL
            const tenantURL = generateTenantURL(tenantSlug, path || undefined, detector);
            const url = new URL(tenantURL);

            // URL should contain the tenant slug as the first path segment
            const pathSegments = url.pathname.split('/').filter(Boolean);
            expect(pathSegments.length).toBeGreaterThan(0);
            expect(pathSegments[0]).toBe(tenantSlug);

            // If additional path is provided and results in valid path segments
            if (path && path.trim() && pathSegments.length > 1) {
              // The tenant slug should always be first
              expect(pathSegments[0]).toBe(tenantSlug);
            }

            // URL should be valid and properly formatted
            expect(url.protocol).toMatch(/^https?:$/);
            expect(url.hostname).toBeTruthy();
            expect(url.pathname).toContain(`/${tenantSlug}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve tenant routing pattern across different environments', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), // tenant slug
          fc.option(fc.string({ minLength: 1, maxLength: 100 })), // optional path
          (tenantSlug, path) => {
            const environments: Array<{ env: string; detector: EnvironmentDetector }> = [
              {
                env: 'development',
                detector: createMockDetector({
                  isDev: true,
                  hostname: 'localhost',
                  viteEnvironment: 'development',
                })
              },
              {
                env: 'staging',
                detector: createMockDetector({
                  isDev: false,
                  hostname: 'staging.agendai.clubemkt.digital',
                  viteEnvironment: 'staging',
                })
              },
              {
                env: 'production',
                detector: createMockDetector({
                  isDev: false,
                  hostname: 'agendai.clubemkt.digital',
                  viteEnvironment: 'production',
                })
              }
            ];

            // Generate URLs for all environments
            const urls = environments.map(({ detector }) => 
              generateTenantURL(tenantSlug, path || undefined, detector)
            );

            // Extract path patterns from all URLs
            const pathPatterns = urls.map(url => new URL(url).pathname);

            // All path patterns should be identical (only domain should differ)
            const firstPattern = pathPatterns[0];
            pathPatterns.forEach(pattern => {
              expect(pattern).toBe(firstPattern);
            });

            // All should start with /{tenantSlug}
            pathPatterns.forEach(pattern => {
              expect(pattern).toMatch(new RegExp(`^/${tenantSlug}(/.*)?$`));
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure admin URLs maintain /app pattern and do not interfere with tenant routing', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('development', 'staging', 'production'),
          fc.option(fc.string({ minLength: 1, maxLength: 100 })), // optional admin path
          (environment, adminPath) => {
            // Create environment detector
            const detector = createMockDetector({
              isDev: environment === 'development',
              hostname: environment === 'development' ? 'localhost' : 'agendai.clubemkt.digital',
              viteEnvironment: environment,
            });

            // Generate admin URL
            const adminURL = generateAdminURL(adminPath || undefined, detector);
            const url = new URL(adminURL);

            // URL should contain /app as the first path segment
            const pathSegments = url.pathname.split('/').filter(Boolean);
            expect(pathSegments.length).toBeGreaterThan(0);
            expect(pathSegments[0]).toBe('app');

            // If additional path is provided and results in valid path segments
            if (adminPath && adminPath.trim() && pathSegments.length > 1) {
              // /app should always be first
              expect(pathSegments[0]).toBe('app');
            }

            // URL should be valid and properly formatted
            expect(url.protocol).toMatch(/^https?:$/);
            expect(url.hostname).toBeTruthy();
            expect(url.pathname).toContain('/app');

            // Admin URL should always start with 'app' (not a tenant slug)
            expect(pathSegments[0]).toBe('app'); // Should always be 'app'
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain routing consistency when generating multiple tenant URLs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('development', 'staging', 'production'),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), { minLength: 1, maxLength: 10 }), // multiple tenant slugs
          (environment, tenantSlugs) => {
            // Create environment detector
            const detector = createMockDetector({
              isDev: environment === 'development',
              hostname: environment === 'development' ? 'localhost' : 'agendai.clubemkt.digital',
              viteEnvironment: environment,
            });

            // Generate URLs for all tenant slugs
            const urls = tenantSlugs.map(slug => generateTenantURL(slug, undefined, detector));

            // Each URL should follow the correct pattern
            urls.forEach((url, index) => {
              const urlObj = new URL(url);
              const pathSegments = urlObj.pathname.split('/').filter(Boolean);
              
              // First segment should be the tenant slug
              expect(pathSegments[0]).toBe(tenantSlugs[index]);
              
              // URL should be valid
              expect(urlObj.protocol).toMatch(/^https?:$/);
              expect(urlObj.hostname).toBeTruthy();
            });

            // All URLs should use the same domain
            const domains = urls.map(url => new URL(url).hostname);
            const firstDomain = domains[0];
            domains.forEach(domain => {
              expect(domain).toBe(firstDomain);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in paths while preserving tenant routing', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), // tenant slug
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => /^[a-zA-Z0-9/_-]+$/.test(s)), // path with allowed characters
          (tenantSlug, path) => {
            // Generate tenant URL with path
            const tenantURL = generateTenantURL(tenantSlug, path);
            const url = new URL(tenantURL);

            // URL should be valid
            expect(() => new URL(tenantURL)).not.toThrow();

            // First path segment should still be the tenant slug
            const pathSegments = url.pathname.split('/').filter(Boolean);
            expect(pathSegments[0]).toBe(tenantSlug);

            // URL should contain the tenant slug
            expect(url.pathname).toContain(`/${tenantSlug}`);

            // Path should be properly encoded
            expect(url.pathname).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});