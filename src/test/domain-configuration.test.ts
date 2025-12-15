/**
 * Property-based tests for domain configuration service
 * 
 * **Feature: domain-migration, Property 1: Environment-appropriate domain resolution**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
 * 
 * **Feature: domain-migration, Property 2: Environment variable override precedence**
 * **Validates: Requirements 2.4**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  detectEnvironment,
  getDomainConfig,
  getEnvironmentContext,
  generateURL,
  generateTenantURL,
  generateAdminURL,
  getCurrentDomain,
  getBaseURL,
  validateURL,
  type Environment,
  type URLGenerationOptions,
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

describe('Domain Configuration Service', () => {
  describe('Property 1: Environment-appropriate domain resolution', () => {
    it('should resolve correct domain for development environment', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // DEV flag
          fc.constantFrom('localhost', '127.0.0.1'), // development hostnames
          (devFlag, hostname) => {
            // Create mock detector for development environment
            const detector = createMockDetector({
              isDev: devFlag,
              hostname,
              viteEnvironment: undefined,
              viteAppDomain: undefined,
            });
            
            const config = getDomainConfig(detector);
            const context = getEnvironmentContext(detector);
            
            // In development, should use localhost with http and port 8080
            if (devFlag || hostname === 'localhost') {
              expect(config.environment).toBe('development');
              expect(config.baseDomain).toBe('localhost');
              expect(config.protocol).toBe('http');
              expect(config.port).toBe(8080);
              expect(context.isDevelopment).toBe(true);
              expect(context.baseURL).toBe('http://localhost:8080');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should resolve correct domain for staging environment', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('staging.agendai.clubemkt.digital', 'staging-test.example.com'),
          fc.constantFrom('staging', undefined),
          (hostname, viteEnv) => {
            // Create mock detector for staging environment
            const detector = createMockDetector({
              isDev: false,
              hostname,
              viteEnvironment: viteEnv,
              viteAppDomain: undefined,
            });
            
            const config = getDomainConfig(detector);
            const context = getEnvironmentContext(detector);
            
            // Should detect staging when hostname contains 'staging' or VITE_ENVIRONMENT is 'staging'
            if (hostname.includes('staging') || viteEnv === 'staging') {
              expect(config.environment).toBe('staging');
              expect(config.baseDomain).toBe('staging.agendai.clubemkt.digital');
              expect(config.protocol).toBe('https');
              expect(config.port).toBeUndefined();
              expect(context.isStaging).toBe(true);
              expect(context.baseURL).toBe('https://staging.agendai.clubemkt.digital');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should resolve correct domain for production environment', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('agendai.clubemkt.digital', 'example.com', 'production.example.com'),
          (hostname) => {
            // Create mock detector for production environment (default case)
            const detector = createMockDetector({
              isDev: false,
              hostname,
              viteEnvironment: undefined,
              viteAppDomain: undefined,
            });
            
            const config = getDomainConfig(detector);
            const context = getEnvironmentContext(detector);
            
            // Should default to production when not development or staging
            if (!hostname.includes('localhost') && !hostname.includes('staging')) {
              expect(config.environment).toBe('production');
              expect(config.baseDomain).toBe('agendai.clubemkt.digital');
              expect(config.protocol).toBe('https');
              expect(config.port).toBeUndefined();
              expect(context.isProduction).toBe(true);
              expect(context.baseURL).toBe('https://agendai.clubemkt.digital');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Environment variable override precedence', () => {
    it('should override domain configuration when VITE_APP_DOMAIN is set', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('custom.domain.com', 'override.example.org', 'localhost:3000'),
          fc.constantFrom('development', 'staging', 'production'),
          (customDomain, environment) => {
            // Create mock detector with custom domain override
            let detector: EnvironmentDetector;
            
            if (environment === 'development') {
              detector = createMockDetector({
                isDev: true,
                hostname: 'localhost',
                viteEnvironment: undefined,
                viteAppDomain: customDomain,
              });
            } else if (environment === 'staging') {
              detector = createMockDetector({
                isDev: false,
                hostname: 'staging.example.com',
                viteEnvironment: 'staging',
                viteAppDomain: customDomain,
              });
            } else {
              detector = createMockDetector({
                isDev: false,
                hostname: 'production.example.com',
                viteEnvironment: undefined,
                viteAppDomain: customDomain,
              });
            }
            
            const config = getDomainConfig(detector);
            
            // Environment variable should always override
            // Extract domain part (without port) for comparison
            const expectedDomain = customDomain.split(':')[0];
            expect(config.baseDomain).toBe(expectedDomain);
            
            // Protocol should be determined by domain content
            if (customDomain.includes('localhost')) {
              expect(config.protocol).toBe('http');
              // Port should be extracted from customDomain if present
              const portPart = customDomain.split(':')[1];
              if (portPart) {
                expect(config.port).toBe(parseInt(portPart, 10));
              }
            } else {
              expect(config.protocol).toBe('https');
              expect(config.port).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('URL Generation Properties', () => {
    it('should generate valid URLs for all tenant slugs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9-_]+$/.test(s)),
          fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          (tenantSlug, path) => {
            // Create mock detector for production environment
            const detector = createMockDetector({
              isDev: false,
              hostname: 'agendai.clubemkt.digital',
              viteEnvironment: undefined,
              viteAppDomain: undefined,
            });
            
            const tenantURL = generateTenantURL(tenantSlug, path || undefined, detector);
            
            // Should be a valid URL
            expect(validateURL(tenantURL)).toBe(true);
            
            // Should contain the tenant slug
            expect(tenantURL).toContain(tenantSlug);
            
            // Should use the correct domain
            expect(tenantURL).toContain('agendai.clubemkt.digital');
            
            // Should use https in production
            expect(tenantURL.startsWith('https://')).toBe(true);
            
            // If path is provided, should contain it
            if (path) {
              expect(tenantURL).toContain(path);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate valid admin URLs', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          (path) => {
            // Create mock detector for production environment
            const detector = createMockDetector({
              isDev: false,
              hostname: 'agendai.clubemkt.digital',
              viteEnvironment: undefined,
              viteAppDomain: undefined,
            });
            
            const adminURL = generateAdminURL(path || undefined, detector);
            
            // Should be a valid URL
            expect(validateURL(adminURL)).toBe(true);
            
            // Should contain /app for admin interface
            expect(adminURL).toContain('/app');
            
            // Should use the correct domain
            expect(adminURL).toContain('agendai.clubemkt.digital');
            
            // Should use https in production
            expect(adminURL.startsWith('https://')).toBe(true);
            
            // If path is provided, should contain it
            if (path) {
              expect(adminURL).toContain(path);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});