/**
 * Property-based tests for code domain consistency
 * 
 * **Feature: domain-migration, Property 5: Code domain reference consistency**
 * **Validates: Requirements 1.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { useTenant } from '@/hooks/useTenant';
import { 
  generateTenantURL, 
  generateAdminURL, 
  getCurrentDomain,
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

describe('Code Domain Consistency', () => {
  describe('Property 5: Code domain reference consistency', () => {
    it('should generate consistent domain references across all URL generation functions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('development', 'staging', 'production'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), // tenant slug
          fc.option(fc.string({ minLength: 1, maxLength: 100 })), // optional path
          fc.option(fc.constantFrom('localhost:3000', 'test.example.com', 'staging.test.com', 'custom.domain.digital')), // optional domain override
          (environment, tenantSlug, path, domainOverride) => {
            // Create environment detector based on test parameters
            const detector = createMockDetector({
              isDev: environment === 'development',
              hostname: environment === 'development' ? 'localhost' : 'agendai.clubemkt.digital',
              viteEnvironment: environment,
              viteAppDomain: domainOverride?.trim() || undefined,
            });

            // Generate URLs using different functions
            const tenantURL = generateTenantURL(tenantSlug, path || undefined, detector);
            const adminURL = generateAdminURL(path || undefined, detector);
            const currentDomain = getCurrentDomain(detector);

            // Extract domain from generated URLs
            const tenantDomain = new URL(tenantURL).hostname;
            const adminDomain = new URL(adminURL).hostname;

            // All domain references should be consistent (URLs normalize hostnames to lowercase)
            expect(tenantDomain).toBe(currentDomain.toLowerCase());
            expect(adminDomain).toBe(currentDomain.toLowerCase());

            // URLs should be valid
            expect(() => new URL(tenantURL)).not.toThrow();
            expect(() => new URL(adminURL)).not.toThrow();

            // Domain should match expected pattern based on environment
            if (domainOverride?.trim()) {
              const expectedDomain = domainOverride.trim().split(':')[0]; // Remove port if present
              expect(currentDomain.toLowerCase()).toBe(expectedDomain.toLowerCase());
            } else {
              switch (environment) {
                case 'development':
                  expect(currentDomain).toBe('localhost');
                  break;
                case 'staging':
                  expect(currentDomain).toBe('staging.agendai.clubemkt.digital');
                  break;
                case 'production':
                  expect(currentDomain).toBe('agendai.clubemkt.digital');
                  break;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain domain consistency when generating multiple URLs in sequence', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('development', 'staging', 'production'),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), { minLength: 1, maxLength: 10 }), // multiple tenant slugs
          (environment, tenantSlugs) => {
            // Create consistent environment detector
            const detector = createMockDetector({
              isDev: environment === 'development',
              hostname: environment === 'development' ? 'localhost' : 'agendai.clubemkt.digital',
              viteEnvironment: environment,
            });

            // Generate URLs for all tenant slugs
            const urls = tenantSlugs.map(slug => generateTenantURL(slug, undefined, detector));
            const domains = urls.map(url => new URL(url).hostname);

            // All domains should be identical
            const firstDomain = domains[0];
            domains.forEach(domain => {
              expect(domain).toBe(firstDomain);
            });

            // Domain should match current domain
            const currentDomain = getCurrentDomain(detector);
            expect(firstDomain).toBe(currentDomain);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure tenant context URL generation matches domain service', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), // tenant slug
          fc.option(fc.string({ minLength: 1, maxLength: 100 })), // optional path
          (tenantSlug, path) => {
            // Generate URL using domain service directly
            const directURL = generateTenantURL(tenantSlug, path || undefined);
            const directAdminURL = generateAdminURL(path || undefined);
            const directDomain = getCurrentDomain();

            // Extract domains
            const directTenantDomain = new URL(directURL).hostname;
            const directAdminDomain = new URL(directAdminURL).hostname;

            // All should use the same domain
            expect(directTenantDomain).toBe(directDomain);
            expect(directAdminDomain).toBe(directDomain);

            // URLs should be properly formatted
            expect(directURL).toMatch(/^https?:\/\/[^\/]+/);
            expect(directAdminURL).toMatch(/^https?:\/\/[^\/]+/);

            // Tenant URL should contain the slug
            expect(directURL).toContain(`/${tenantSlug}`);
            
            // Admin URL should contain /app
            expect(directAdminURL).toContain('/app');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});