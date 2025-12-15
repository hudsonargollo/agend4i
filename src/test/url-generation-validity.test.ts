/**
 * Property-based tests for URL generation validity
 * 
 * **Feature: domain-migration, Property 8: URL generation validity**
 * **Validates: Requirements 3.3, 4.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateURL,
  generateTenantURL,
  generateAdminURL,
  validateURL,
  getDomainConfig,
  type EnvironmentDetector,
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

describe('URL Generation Validity', () => {
  describe('Property 8: URL generation validity', () => {
    it('should generate valid URLs for all tenant and admin configurations', () => {
      // Test specific known cases first
      const testCases = [
        { env: 'development', isDev: true, hostname: 'localhost', domain: 'localhost' },
        { env: 'staging', isDev: false, hostname: 'staging.agendai.clubemkt.digital', domain: 'staging.agendai.clubemkt.digital' },
        { env: 'production', isDev: false, hostname: 'agendai.clubemkt.digital', domain: 'agendai.clubemkt.digital' }
      ];

      testCases.forEach(({ env, isDev, hostname, domain }) => {
        const detector = createMockDetector({
          isDev,
          hostname,
          viteEnvironment: env,
          viteAppDomain: undefined,
        });

        // Test tenant URLs
        const tenantURL = generateTenantURL('test-tenant', undefined, detector);
        expect(validateURL(tenantURL)).toBe(true);
        expect(tenantURL).toContain('test-tenant');
        expect(tenantURL).toContain(domain);

        // Test admin URLs
        const adminURL = generateAdminURL(undefined, detector);
        expect(validateURL(adminURL)).toBe(true);
        expect(adminURL).toContain('/app');
        expect(adminURL).toContain(domain);

        // Test base URLs
        const baseURL = generateURL({}, detector);
        expect(validateURL(baseURL)).toBe(true);
        expect(baseURL).toContain(domain);
      });
    });

    it('should generate valid URLs with property-based testing', () => {
      fc.assert(
        fc.property(
          // Generate valid tenant slugs (alphanumeric with hyphens)
          fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-'), { minLength: 1, maxLength: 20 })
            .filter(s => s.length > 0 && !s.startsWith('-') && !s.endsWith('-')),
          // Generate optional paths
          fc.option(fc.stringOf(fc.constantFrom('/', 'a', 'b', '1', '2', '-'), { minLength: 1, maxLength: 10 })),
          // Generate environment configurations
          fc.record({
            isDev: fc.boolean(),
            hostname: fc.constantFrom('localhost', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital'),
            viteEnvironment: fc.option(fc.constantFrom('development', 'staging', 'production')),
            viteAppDomain: fc.option(fc.constantFrom('localhost:8080', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital'))
          }),
          (tenantSlug, optionalPath, envConfig) => {
            const detector = createMockDetector(envConfig);
            
            // Test tenant URL generation
            const tenantURL = generateTenantURL(tenantSlug, optionalPath || undefined, detector);
            
            // Test admin URL generation
            const adminURL = generateAdminURL(optionalPath || undefined, detector);
            
            // Test general URL generation
            const generalURL = generateURL({
              tenant: tenantSlug,
              path: optionalPath || undefined,
              admin: false
            }, detector);
            
            // Property: All generated URLs must be valid
            expect(validateURL(tenantURL)).toBe(true);
            expect(validateURL(adminURL)).toBe(true);
            expect(validateURL(generalURL)).toBe(true);
            
            // Property: URLs must contain expected components
            expect(tenantURL).toContain(tenantSlug);
            expect(adminURL).toContain('/app');
            expect(generalURL).toContain(tenantSlug);
            
            // Property: URLs must have proper protocol
            expect(tenantURL.startsWith('http://') || tenantURL.startsWith('https://')).toBe(true);
            expect(adminURL.startsWith('http://') || adminURL.startsWith('https://')).toBe(true);
            expect(generalURL.startsWith('http://') || generalURL.startsWith('https://')).toBe(true);
            
            // Property: URLs with paths should include the normalized path
            if (optionalPath) {
              // Normalize the path the same way the generateURL function does
              let normalizedPath = optionalPath.replace(/^\/+/, '');
              normalizedPath = normalizedPath.replace(/\/+/g, '/');
              
              // Only check if the normalized path is not empty
              if (normalizedPath) {
                expect(tenantURL).toContain(normalizedPath);
                expect(adminURL).toContain(normalizedPath);
                expect(generalURL).toContain(normalizedPath);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle environment variable overrides correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('localhost:8080', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital'),
          fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-'), { minLength: 1, maxLength: 15 })
            .filter(s => s.length > 0 && !s.startsWith('-') && !s.endsWith('-')),
          (customDomain, tenantSlug) => {
            const detector = createMockDetector({
              isDev: false,
              hostname: 'original.domain.com',
              viteEnvironment: undefined,
              viteAppDomain: customDomain,
            });
            
            const tenantURL = generateTenantURL(tenantSlug, undefined, detector);
            const adminURL = generateAdminURL(undefined, detector);
            
            // Property: URLs with environment overrides must be valid
            expect(validateURL(tenantURL)).toBe(true);
            expect(validateURL(adminURL)).toBe(true);
            
            // Property: URLs must use the override domain
            const expectedDomain = customDomain.split(':')[0];
            expect(tenantURL).toContain(expectedDomain);
            expect(adminURL).toContain(expectedDomain);
            
            // Property: Protocol should be determined correctly
            if (customDomain.includes('localhost')) {
              expect(tenantURL.startsWith('http://')).toBe(true);
              expect(adminURL.startsWith('http://')).toBe(true);
            } else {
              expect(tenantURL.startsWith('https://')).toBe(true);
              expect(adminURL.startsWith('https://')).toBe(true);
            }
            
            // Property: Tenant slug should be preserved in URL
            expect(tenantURL).toContain(tenantSlug);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate properly formatted URLs with correct structure', () => {
      fc.assert(
        fc.property(
          // Generate URL generation options
          fc.record({
            tenant: fc.option(fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-'), { minLength: 1, maxLength: 20 })
              .filter(s => s.length > 0 && !s.startsWith('-') && !s.endsWith('-'))),
            path: fc.option(fc.stringOf(fc.constantFrom('/', 'a', 'b', '1', '2', '-'), { minLength: 1, maxLength: 15 })),
            admin: fc.boolean(),
          }),
          // Generate environment detector
          fc.record({
            isDev: fc.boolean(),
            hostname: fc.constantFrom('localhost', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital'),
            viteEnvironment: fc.option(fc.constantFrom('development', 'staging', 'production')),
            viteAppDomain: fc.option(fc.constantFrom('localhost:8080', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital'))
          }),
          (urlOptions, envConfig) => {
            const detector = createMockDetector(envConfig);
            const generatedURL = generateURL(urlOptions, detector);
            
            // Property: Generated URL must be valid
            expect(validateURL(generatedURL)).toBe(true);
            
            // Property: URL must have proper structure
            const urlObj = new URL(generatedURL);
            expect(['http:', 'https:']).toContain(urlObj.protocol);
            expect(urlObj.hostname).toBeTruthy();
            
            // Property: Admin URLs must contain /app path
            if (urlOptions.admin) {
              expect(generatedURL).toContain('/app');
            }
            
            // Property: Tenant URLs must contain tenant slug
            if (urlOptions.tenant) {
              expect(generatedURL).toContain(urlOptions.tenant);
            }
            
            // Property: URLs with paths must include the normalized path
            if (urlOptions.path) {
              // Normalize the path the same way the generateURL function does
              let normalizedPath = urlOptions.path.replace(/^\/+/, '');
              normalizedPath = normalizedPath.replace(/\/+/g, '/');
              
              // Only check if the normalized path is not empty
              if (normalizedPath) {
                expect(generatedURL).toContain(normalizedPath);
              }
            }
            
            // Property: URL should not have double slashes (except after protocol)
            const pathPart = generatedURL.replace(/^https?:\/\//, '');
            expect(pathPart).not.toContain('//');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});