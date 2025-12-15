/**
 * Property-based tests for dashboard domain display
 * 
 * **Feature: domain-migration, Property 3: UI component domain display consistency**
 * **Validates: Requirements 1.1, 1.2, 1.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateTenantURL, getCurrentDomain } from '@/lib/domain';
import type { EnvironmentDetector } from '@/lib/domain';

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

describe('Dashboard Domain Display', () => {

  describe('Property 3: UI component domain display consistency', () => {
    it('should display domain consistently across all environments', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('development', 'staging', 'production'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-_]+$/.test(s)),
          (environment, tenantSlug) => {
            // Create environment-specific detector
            let detector: EnvironmentDetector;
            
            if (environment === 'development') {
              detector = createMockDetector({
                isDev: true,
                hostname: 'localhost',
                viteEnvironment: undefined,
                viteAppDomain: undefined,
              });
            } else if (environment === 'staging') {
              detector = createMockDetector({
                isDev: false,
                hostname: 'staging.agendai.clubemkt.digital',
                viteEnvironment: 'staging',
                viteAppDomain: undefined,
              });
            } else {
              detector = createMockDetector({
                isDev: false,
                hostname: 'agendai.clubemkt.digital',
                viteEnvironment: undefined,
                viteAppDomain: undefined,
              });
            }
            
            // Get expected domain and URL using the same logic as Dashboard component
            const expectedDomain = getCurrentDomain(detector);
            const expectedURL = generateTenantURL(tenantSlug, undefined, detector);
            
            // Property: The domain should be appropriate for the environment
            if (environment === 'development') {
              expect(expectedDomain).toBe('localhost');
              expect(expectedURL).toMatch(/^http:\/\/localhost:8080\/.+$/);
            } else if (environment === 'staging') {
              expect(expectedDomain).toBe('staging.agendai.clubemkt.digital');
              expect(expectedURL).toMatch(/^https:\/\/staging\.agendai\.clubemkt\.digital\/.+$/);
            } else {
              expect(expectedDomain).toBe('agendai.clubemkt.digital');
              expect(expectedURL).toMatch(/^https:\/\/agendai\.clubemkt\.digital\/.+$/);
            }
            
            // Property: The URL should contain the tenant slug
            expect(expectedURL).toContain(tenantSlug);
            
            // Property: The URL should be properly formatted
            expect(() => new URL(expectedURL)).not.toThrow();
            
            // Property: The domain in the URL should match the expected domain
            const urlDomain = new URL(expectedURL).hostname;
            expect(expectedDomain).toBe(urlDomain);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate consistent tenant URLs for copy functionality', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-_]+$/.test(s)),
          fc.constantFrom('development', 'staging', 'production'),
          (tenantSlug, environment) => {
            // Create environment-specific detector
            let detector: EnvironmentDetector;
            
            if (environment === 'development') {
              detector = createMockDetector({
                isDev: true,
                hostname: 'localhost',
                viteEnvironment: undefined,
                viteAppDomain: undefined,
              });
            } else if (environment === 'staging') {
              detector = createMockDetector({
                isDev: false,
                hostname: 'staging.agendai.clubemkt.digital',
                viteEnvironment: 'staging',
                viteAppDomain: undefined,
              });
            } else {
              detector = createMockDetector({
                isDev: false,
                hostname: 'agendai.clubemkt.digital',
                viteEnvironment: undefined,
                viteAppDomain: undefined,
              });
            }
            
            // Generate URL using the same logic as Dashboard component
            const generatedURL = generateTenantURL(tenantSlug, undefined, detector);
            const currentDomain = getCurrentDomain(detector);
            
            // Property: Generated URL should be valid
            expect(() => new URL(generatedURL)).not.toThrow();
            
            // Property: URL should contain the tenant slug
            expect(generatedURL).toContain(tenantSlug);
            
            // Property: URL should use the correct domain for the environment
            const urlObj = new URL(generatedURL);
            expect(urlObj.hostname).toBe(currentDomain);
            
            // Property: URL should use appropriate protocol for environment
            if (environment === 'development') {
              expect(urlObj.protocol).toBe('http:');
              expect(urlObj.port).toBe('8080');
            } else {
              expect(urlObj.protocol).toBe('https:');
              expect(urlObj.port).toBe('');
            }
            
            // Property: URL path should be just the tenant slug
            expect(urlObj.pathname).toBe(`/${tenantSlug}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle environment variable overrides in dashboard display', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-_]+$/.test(s)),
          fc.constantFrom(
            'custom.example.com',
            'override.domain.org',
            'test.clubemkt.digital',
            'localhost:3000',
            'staging.custom.com'
          ),
          (tenantSlug, customDomain) => {
            // Create detector with custom domain override
            const detector = createMockDetector({
              isDev: false,
              hostname: 'production.example.com',
              viteEnvironment: undefined,
              viteAppDomain: customDomain,
            });
            
            const expectedDomain = getCurrentDomain(detector);
            const expectedURL = generateTenantURL(tenantSlug, undefined, detector);
            
            // Property: Custom domain should override default configuration
            const expectedBaseDomain = customDomain.split(':')[0];
            expect(expectedDomain).toBe(expectedBaseDomain);
            
            // Property: Generated URL should use the custom domain
            expect(expectedURL).toContain(expectedBaseDomain);
            
            // Property: URL should be valid with custom domain
            expect(() => new URL(expectedURL)).not.toThrow();
            
            // Property: URL should contain tenant slug with custom domain
            expect(expectedURL).toContain(tenantSlug);
            
            const urlObj = new URL(expectedURL);
            expect(urlObj.hostname).toBe(expectedBaseDomain);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});