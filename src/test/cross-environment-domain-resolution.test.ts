/**
 * Cross-environment domain resolution tests
 * 
 * Task 9.1: Verify domain resolution in all environments
 * Tests domain configuration in development mode (localhost)
 * Tests domain configuration with staging environment variables
 * Tests domain configuration in production mode
 * Verifies environment variable overrides work correctly
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
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

describe('Cross-Environment Domain Resolution', () => {
  describe('Development Environment Tests', () => {
    it('should correctly resolve localhost domain in development mode', () => {
      const detector = createMockDetector({
        isDev: true,
        hostname: 'localhost',
        viteEnvironment: 'development',
        viteAppDomain: undefined,
      });

      const config = getDomainConfig(detector);
      const context = getEnvironmentContext(detector);
      const environment = detectEnvironment(detector);

      // Verify development environment detection
      expect(environment).toBe('development');
      expect(config.environment).toBe('development');
      expect(context.isDevelopment).toBe(true);
      expect(context.isStaging).toBe(false);
      expect(context.isProduction).toBe(false);

      // Verify development domain configuration
      expect(config.baseDomain).toBe('localhost');
      expect(config.protocol).toBe('http');
      expect(config.port).toBe(8080);
      expect(context.currentDomain).toBe('localhost');
      expect(context.baseURL).toBe('http://localhost:8080');

      // Verify URL generation works correctly
      const tenantURL = generateTenantURL('test-tenant', undefined, detector);
      const adminURL = generateAdminURL(undefined, detector);
      const baseURL = getBaseURL(detector);

      expect(tenantURL).toBe('http://localhost:8080/test-tenant');
      expect(adminURL).toBe('http://localhost:8080/app');
      expect(baseURL).toBe('http://localhost:8080');
      expect(validateURL(tenantURL)).toBe(true);
      expect(validateURL(adminURL)).toBe(true);
      expect(validateURL(baseURL)).toBe(true);
    });

    it('should handle development with custom VITE_APP_DOMAIN', () => {
      const detector = createMockDetector({
        isDev: true,
        hostname: 'localhost',
        viteEnvironment: 'development',
        viteAppDomain: 'localhost:3000',
      });

      const config = getDomainConfig(detector);
      const context = getEnvironmentContext(detector);

      // Environment variable should override default development settings
      expect(config.baseDomain).toBe('localhost');
      expect(config.protocol).toBe('http');
      expect(config.port).toBe(3000);
      expect(context.baseURL).toBe('http://localhost:3000');

      // Verify URL generation uses the override
      const tenantURL = generateTenantURL('test-tenant', undefined, detector);
      expect(tenantURL).toBe('http://localhost:3000/test-tenant');
    });

    it('should detect development from hostname alone', () => {
      const detector = createMockDetector({
        isDev: false, // Even if isDev is false
        hostname: 'localhost',
        viteEnvironment: undefined,
        viteAppDomain: undefined,
      });

      const environment = detectEnvironment(detector);
      const config = getDomainConfig(detector);

      // Should still detect as development due to localhost hostname
      expect(environment).toBe('development');
      expect(config.environment).toBe('development');
      expect(config.baseDomain).toBe('localhost');
    });
  });

  describe('Staging Environment Tests', () => {
    it('should correctly resolve staging domain', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'staging.agendai.clubemkt.digital',
        viteEnvironment: 'staging',
        viteAppDomain: undefined,
      });

      const config = getDomainConfig(detector);
      const context = getEnvironmentContext(detector);
      const environment = detectEnvironment(detector);

      // Verify staging environment detection
      expect(environment).toBe('staging');
      expect(config.environment).toBe('staging');
      expect(context.isDevelopment).toBe(false);
      expect(context.isStaging).toBe(true);
      expect(context.isProduction).toBe(false);

      // Verify staging domain configuration
      expect(config.baseDomain).toBe('staging.agendai.clubemkt.digital');
      expect(config.protocol).toBe('https');
      expect(config.port).toBeUndefined();
      expect(context.currentDomain).toBe('staging.agendai.clubemkt.digital');
      expect(context.baseURL).toBe('https://staging.agendai.clubemkt.digital');

      // Verify URL generation works correctly
      const tenantURL = generateTenantURL('test-tenant', undefined, detector);
      const adminURL = generateAdminURL(undefined, detector);
      const baseURL = getBaseURL(detector);

      expect(tenantURL).toBe('https://staging.agendai.clubemkt.digital/test-tenant');
      expect(adminURL).toBe('https://staging.agendai.clubemkt.digital/app');
      expect(baseURL).toBe('https://staging.agendai.clubemkt.digital');
      expect(validateURL(tenantURL)).toBe(true);
      expect(validateURL(adminURL)).toBe(true);
      expect(validateURL(baseURL)).toBe(true);
    });

    it('should detect staging from hostname containing "staging"', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'staging-test.example.com',
        viteEnvironment: undefined,
        viteAppDomain: undefined,
      });

      const environment = detectEnvironment(detector);
      const config = getDomainConfig(detector);

      // Should detect as staging due to hostname containing "staging"
      expect(environment).toBe('staging');
      expect(config.environment).toBe('staging');
      expect(config.baseDomain).toBe('staging.agendai.clubemkt.digital');
    });

    it('should detect staging from VITE_ENVIRONMENT variable', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'some-other-domain.com',
        viteEnvironment: 'staging',
        viteAppDomain: undefined,
      });

      const environment = detectEnvironment(detector);
      const config = getDomainConfig(detector);

      // Should detect as staging due to VITE_ENVIRONMENT
      expect(environment).toBe('staging');
      expect(config.environment).toBe('staging');
      expect(config.baseDomain).toBe('staging.agendai.clubemkt.digital');
    });

    it('should handle staging with custom VITE_APP_DOMAIN', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'staging.agendai.clubemkt.digital',
        viteEnvironment: 'staging',
        viteAppDomain: 'custom-staging.example.com',
      });

      const config = getDomainConfig(detector);
      const context = getEnvironmentContext(detector);

      // Environment variable should override default staging settings
      expect(config.baseDomain).toBe('custom-staging.example.com');
      expect(config.protocol).toBe('https');
      expect(config.port).toBeUndefined();
      expect(context.baseURL).toBe('https://custom-staging.example.com');

      // Verify URL generation uses the override
      const tenantURL = generateTenantURL('test-tenant', undefined, detector);
      expect(tenantURL).toBe('https://custom-staging.example.com/test-tenant');
    });
  });

  describe('Production Environment Tests', () => {
    it('should correctly resolve production domain', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'agendai.clubemkt.digital',
        viteEnvironment: 'production',
        viteAppDomain: undefined,
      });

      const config = getDomainConfig(detector);
      const context = getEnvironmentContext(detector);
      const environment = detectEnvironment(detector);

      // Verify production environment detection
      expect(environment).toBe('production');
      expect(config.environment).toBe('production');
      expect(context.isDevelopment).toBe(false);
      expect(context.isStaging).toBe(false);
      expect(context.isProduction).toBe(true);

      // Verify production domain configuration
      expect(config.baseDomain).toBe('agendai.clubemkt.digital');
      expect(config.protocol).toBe('https');
      expect(config.port).toBeUndefined();
      expect(context.currentDomain).toBe('agendai.clubemkt.digital');
      expect(context.baseURL).toBe('https://agendai.clubemkt.digital');

      // Verify URL generation works correctly
      const tenantURL = generateTenantURL('test-tenant', undefined, detector);
      const adminURL = generateAdminURL(undefined, detector);
      const baseURL = getBaseURL(detector);

      expect(tenantURL).toBe('https://agendai.clubemkt.digital/test-tenant');
      expect(adminURL).toBe('https://agendai.clubemkt.digital/app');
      expect(baseURL).toBe('https://agendai.clubemkt.digital');
      expect(validateURL(tenantURL)).toBe(true);
      expect(validateURL(adminURL)).toBe(true);
      expect(validateURL(baseURL)).toBe(true);
    });

    it('should default to production for unknown domains', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'unknown-domain.example.com',
        viteEnvironment: undefined,
        viteAppDomain: undefined,
      });

      const environment = detectEnvironment(detector);
      const config = getDomainConfig(detector);

      // Should default to production for unknown domains
      expect(environment).toBe('production');
      expect(config.environment).toBe('production');
      expect(config.baseDomain).toBe('agendai.clubemkt.digital');
    });

    it('should handle production with custom VITE_APP_DOMAIN', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'agendai.clubemkt.digital',
        viteEnvironment: 'production',
        viteAppDomain: 'custom-production.example.com',
      });

      const config = getDomainConfig(detector);
      const context = getEnvironmentContext(detector);

      // Environment variable should override default production settings
      expect(config.baseDomain).toBe('custom-production.example.com');
      expect(config.protocol).toBe('https');
      expect(config.port).toBeUndefined();
      expect(context.baseURL).toBe('https://custom-production.example.com');

      // Verify URL generation uses the override
      const tenantURL = generateTenantURL('test-tenant', undefined, detector);
      expect(tenantURL).toBe('https://custom-production.example.com/test-tenant');
    });
  });

  describe('Environment Variable Override Tests', () => {
    it('should handle localhost with port in VITE_APP_DOMAIN', () => {
      const testCases = [
        { domain: 'localhost:3000', expectedPort: 3000 },
        { domain: 'localhost:5173', expectedPort: 5173 },
        { domain: 'localhost:8080', expectedPort: 8080 },
      ];

      testCases.forEach(({ domain, expectedPort }) => {
        const detector = createMockDetector({
          isDev: false,
          hostname: 'production.example.com',
          viteEnvironment: 'production',
          viteAppDomain: domain,
        });

        const config = getDomainConfig(detector);

        expect(config.baseDomain).toBe('localhost');
        expect(config.protocol).toBe('http');
        expect(config.port).toBe(expectedPort);

        const baseURL = getBaseURL(detector);
        expect(baseURL).toBe(`http://localhost:${expectedPort}`);
      });
    });

    it('should handle custom domains without ports', () => {
      const testCases = [
        'custom.example.com',
        'my-app.herokuapp.com',
        'app.custom-domain.org',
      ];

      testCases.forEach((domain) => {
        const detector = createMockDetector({
          isDev: false,
          hostname: 'localhost',
          viteEnvironment: 'development',
          viteAppDomain: domain,
        });

        const config = getDomainConfig(detector);

        expect(config.baseDomain).toBe(domain);
        expect(config.protocol).toBe('https');
        expect(config.port).toBeUndefined();

        const baseURL = getBaseURL(detector);
        expect(baseURL).toBe(`https://${domain}`);
      });
    });

    it('should prioritize VITE_APP_DOMAIN over all other environment indicators', () => {
      // Test that environment variable overrides development detection
      const devDetector = createMockDetector({
        isDev: true,
        hostname: 'localhost',
        viteEnvironment: 'development',
        viteAppDomain: 'override.example.com',
      });

      const devConfig = getDomainConfig(devDetector);
      expect(devConfig.baseDomain).toBe('override.example.com');
      expect(devConfig.protocol).toBe('https');

      // Test that environment variable overrides staging detection
      const stagingDetector = createMockDetector({
        isDev: false,
        hostname: 'staging.agendai.clubemkt.digital',
        viteEnvironment: 'staging',
        viteAppDomain: 'override.example.com',
      });

      const stagingConfig = getDomainConfig(stagingDetector);
      expect(stagingConfig.baseDomain).toBe('override.example.com');
      expect(stagingConfig.protocol).toBe('https');

      // Test that environment variable overrides production detection
      const prodDetector = createMockDetector({
        isDev: false,
        hostname: 'agendai.clubemkt.digital',
        viteEnvironment: 'production',
        viteAppDomain: 'override.example.com',
      });

      const prodConfig = getDomainConfig(prodDetector);
      expect(prodConfig.baseDomain).toBe('override.example.com');
      expect(prodConfig.protocol).toBe('https');
    });
  });

  describe('URL Generation Consistency Across Environments', () => {
    it('should generate consistent URL patterns across all environments', () => {
      const environments = [
        {
          name: 'development',
          detector: createMockDetector({
            isDev: true,
            hostname: 'localhost',
            viteEnvironment: 'development',
            viteAppDomain: undefined,
          }),
          expectedBase: 'http://localhost:8080',
        },
        {
          name: 'staging',
          detector: createMockDetector({
            isDev: false,
            hostname: 'staging.agendai.clubemkt.digital',
            viteEnvironment: 'staging',
            viteAppDomain: undefined,
          }),
          expectedBase: 'https://staging.agendai.clubemkt.digital',
        },
        {
          name: 'production',
          detector: createMockDetector({
            isDev: false,
            hostname: 'agendai.clubemkt.digital',
            viteEnvironment: 'production',
            viteAppDomain: undefined,
          }),
          expectedBase: 'https://agendai.clubemkt.digital',
        },
      ];

      environments.forEach(({ name, detector, expectedBase }) => {
        const tenantSlug = 'test-tenant';
        const adminPath = '/dashboard';

        // Test basic URL generation
        const baseURL = getBaseURL(detector);
        const tenantURL = generateTenantURL(tenantSlug, undefined, detector);
        const adminURL = generateAdminURL(adminPath, detector);

        expect(baseURL).toBe(expectedBase);
        expect(tenantURL).toBe(`${expectedBase}/${tenantSlug}`);
        expect(adminURL).toBe(`${expectedBase}/app${adminPath}`);

        // Verify all URLs are valid
        expect(validateURL(baseURL)).toBe(true);
        expect(validateURL(tenantURL)).toBe(true);
        expect(validateURL(adminURL)).toBe(true);

        // Verify URL structure consistency
        expect(tenantURL.startsWith(baseURL)).toBe(true);
        expect(adminURL.startsWith(baseURL)).toBe(true);
        expect(adminURL).toContain('/app');
        expect(tenantURL).toContain(tenantSlug);
      });
    });

    it('should maintain URL structure with custom paths', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'agendai.clubemkt.digital',
        viteEnvironment: 'production',
        viteAppDomain: undefined,
      });

      const testCases = [
        { tenant: 'my-business', path: '/booking/123', expected: 'https://agendai.clubemkt.digital/my-business/booking/123' },
        { tenant: 'test-app', path: 'services', expected: 'https://agendai.clubemkt.digital/test-app/services' },
        { tenant: 'demo', path: undefined, expected: 'https://agendai.clubemkt.digital/demo' },
      ];

      testCases.forEach(({ tenant, path, expected }) => {
        const url = generateTenantURL(tenant, path, detector);
        expect(url).toBe(expected);
        expect(validateURL(url)).toBe(true);
      });

      const adminTestCases = [
        { path: '/dashboard', expected: 'https://agendai.clubemkt.digital/app/dashboard' },
        { path: 'settings', expected: 'https://agendai.clubemkt.digital/app/settings' },
        { path: undefined, expected: 'https://agendai.clubemkt.digital/app' },
      ];

      adminTestCases.forEach(({ path, expected }) => {
        const url = generateAdminURL(path, detector);
        expect(url).toBe(expected);
        expect(validateURL(url)).toBe(true);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty or invalid environment variables gracefully', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'agendai.clubemkt.digital',
        viteEnvironment: '',
        viteAppDomain: '',
      });

      const config = getDomainConfig(detector);
      const context = getEnvironmentContext(detector);

      // Should fall back to production defaults when environment variables are empty
      expect(config.environment).toBe('production');
      expect(config.baseDomain).toBe('agendai.clubemkt.digital');
      expect(context.baseURL).toBe('https://agendai.clubemkt.digital');
    });

    it('should handle malformed VITE_APP_DOMAIN gracefully', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'agendai.clubemkt.digital',
        viteEnvironment: 'production',
        viteAppDomain: 'invalid:domain:format:8080',
      });

      const config = getDomainConfig(detector);

      // Should handle malformed domain by taking the first part
      expect(config.baseDomain).toBe('invalid');
      expect(config.port).toBeNaN(); // parseInt of 'domain' should be NaN
    });

    it('should generate valid URLs even with unusual tenant slugs', () => {
      const detector = createMockDetector({
        isDev: false,
        hostname: 'agendai.clubemkt.digital',
        viteEnvironment: 'production',
        viteAppDomain: undefined,
      });

      const unusualSlugs = [
        'test-123',
        'my_business',
        'app-name-with-dashes',
        'a',
        'very-long-tenant-name-that-might-cause-issues',
      ];

      unusualSlugs.forEach((slug) => {
        const url = generateTenantURL(slug, undefined, detector);
        expect(validateURL(url)).toBe(true);
        expect(url).toContain(slug);
        expect(url).toBe(`https://agendai.clubemkt.digital/${slug}`);
      });
    });
  });
});