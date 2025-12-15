/**
 * Property-based tests for onboarding domain display
 * 
 * **Feature: domain-migration, Property 3: UI component domain display consistency**
 * **Validates: Requirements 1.1, 1.2, 1.4**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getCurrentDomain, generateTenantURL, validateURL } from '@/lib/domain';
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

describe('Onboarding Domain Display', () => {
  describe('Property 3: UI component domain display consistency', () => {
    it('should return consistent domain for any environment configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            isDev: fc.boolean(),
            hostname: fc.constantFrom('localhost', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital', 'custom.domain.com'),
            viteEnvironment: fc.option(fc.constantFrom('development', 'staging', 'production')),
            viteAppDomain: fc.option(fc.constantFrom('localhost:8080', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital', 'custom.override.com')),
          }),
          (detectorConfig) => {
            const detector = createMockDetector(detectorConfig);
            const currentDomain = getCurrentDomain(detector);
            
            // Property: Domain should be a non-empty string
            expect(currentDomain).toBeTruthy();
            expect(typeof currentDomain).toBe('string');
            
            // Property: Domain should be consistent when called multiple times
            const secondCall = getCurrentDomain(detector);
            expect(currentDomain).toBe(secondCall);
            
            // Property: Environment variable override should take precedence
            if (detector.viteAppDomain) {
              // Extract just the domain part (without port) for comparison
              const expectedDomain = detector.viteAppDomain.split(':')[0];
              expect(currentDomain).toBe(expectedDomain);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate consistent tenant URLs for success messages', () => {
      fc.assert(
        fc.property(
          fc.record({
            isDev: fc.boolean(),
            hostname: fc.constantFrom('localhost', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital'),
            viteEnvironment: fc.option(fc.constantFrom('development', 'staging', 'production')),
            viteAppDomain: fc.option(fc.constantFrom('localhost:8080', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital')),
          }),
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9-]+$/.test(s)),
          (detectorConfig, tenantSlug) => {
            const detector = createMockDetector(detectorConfig);
            const expectedTenantURL = generateTenantURL(tenantSlug, undefined, detector);
            const currentDomain = getCurrentDomain(detector);
            
            // Property: Generated tenant URL should be consistent with domain configuration
            expect(expectedTenantURL).toContain(currentDomain);
            expect(expectedTenantURL).toContain(tenantSlug);
            
            // Property: URL should be properly formatted and valid
            expect(validateURL(expectedTenantURL)).toBe(true);
            
            // Property: URL should follow expected pattern
            expect(expectedTenantURL).toMatch(new RegExp(`^https?://${currentDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:\\d+)?/${tenantSlug}$`));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Success message domain consistency', () => {
    it('should generate success messages with consistent domain references', () => {
      fc.assert(
        fc.property(
          fc.record({
            isDev: fc.boolean(),
            hostname: fc.constantFrom('localhost', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital'),
            viteEnvironment: fc.option(fc.constantFrom('development', 'staging', 'production')),
            viteAppDomain: fc.option(fc.constantFrom('localhost:8080', 'staging.agendai.clubemkt.digital', 'agendai.clubemkt.digital')),
          }),
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9-]+$/.test(s)),
          (detectorConfig, tenantSlug) => {
            const detector = createMockDetector(detectorConfig);
            const tenantURL = generateTenantURL(tenantSlug, undefined, detector);
            const currentDomain = getCurrentDomain(detector);
            
            // Property: Success message should contain the tenant URL
            const successMessage = `Sua página estará disponível em ${tenantURL}`;
            
            // Property: Success message should reference the correct domain
            expect(successMessage).toContain(currentDomain);
            expect(successMessage).toContain(tenantSlug);
            
            // Property: Success message should contain a valid URL
            const urlMatch = successMessage.match(/(https?:\/\/[^\s]+)/);
            expect(urlMatch).toBeTruthy();
            if (urlMatch) {
              expect(validateURL(urlMatch[1])).toBe(true);
            }
            
            // Property: The URL in the success message should be the same as generateTenantURL
            expect(successMessage).toContain(tenantURL);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});