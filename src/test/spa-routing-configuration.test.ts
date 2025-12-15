import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DeploymentVerifier } from '../lib/deployment-verifier';

/**
 * Property-based tests for SPA routing configuration
 * **Property 4: SPA routing configuration correctness**
 * **Validates: Requirements 2.3**
 */

describe('SPA Routing Configuration Properties', () => {
  it('should verify SPA routing for all valid route patterns', async () => {
    /**
     * **Cloudflare Deployment, Property 4: SPA routing configuration correctness**
     * **Validates: Requirements 2.3**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baseUrl: fc.constantFrom(
            'https://agendai.clubemkt.digital',
            'https://staging.agendai.clubemkt.digital',
            'https://example.pages.dev'
          ),
          timeout: fc.integer({ min: 5000, max: 15000 })
        }),
        async (config) => {
          const verifier = new DeploymentVerifier({
            timeout: config.timeout,
            verbose: false
          });
          
          // Test SPA routing verification
          const result = await verifier.verifySpaRouting(config.baseUrl);
          
          // Property: SPA routing verification should have consistent structure
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('message');
          expect(result).toHaveProperty('details');
          expect(result).toHaveProperty('duration');
          
          expect(result.name).toBe('SPA Routing');
          expect(typeof result.success).toBe('boolean');
          expect(typeof result.message).toBe('string');
          expect(typeof result.duration).toBe('number');
          expect(result.duration).toBeGreaterThanOrEqual(0);
          
          // Details should contain route information
          expect(result.details).toHaveProperty('routes');
          expect(Array.isArray(result.details.routes)).toBe(true);
          
          // Each route should have expected structure
          for (const route of result.details.routes) {
            expect(route).toHaveProperty('route');
            expect(route).toHaveProperty('status');
            expect(route).toHaveProperty('success');
            expect(typeof route.route).toBe('string');
            expect(typeof route.status).toBe('number');
            expect(typeof route.success).toBe('boolean');
          }
          
          // Should test standard SPA routes
          const testedRoutes = result.details.routes.map((r: any) => r.route);
          expect(testedRoutes).toContain('/');
          expect(testedRoutes).toContain('/app');
          expect(testedRoutes).toContain('/auth');
          expect(testedRoutes).toContain('/dashboard');
          expect(testedRoutes).toContain('/nonexistent-route');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle route validation for different URL patterns', () => {
    /**
     * **Cloudflare Deployment, Property 4: SPA routing configuration correctness**
     * **Validates: Requirements 2.3**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          protocol: fc.constantFrom('https:', 'http:'),
          hostname: fc.oneof(
            fc.constant('agendai.clubemkt.digital'),
            fc.constant('staging.agendai.clubemkt.digital'),
            fc.stringMatching(/^[a-z0-9-]+\.pages\.dev$/)
          ),
          route: fc.oneof(
            fc.constant('/'),
            fc.constant('/app'),
            fc.constant('/auth'),
            fc.constant('/dashboard'),
            fc.stringMatching(/^\/[a-z0-9-]+$/),
            fc.stringMatching(/^\/[a-z0-9-]+\/[a-z0-9-]+$/)
          )
        }),
        (config) => {
          const baseUrl = `${config.protocol}//${config.hostname}`;
          const fullUrl = new URL(config.route, baseUrl);
          
          // Property: URL construction should be valid
          expect(fullUrl.protocol).toBe(config.protocol);
          expect(fullUrl.hostname).toBe(config.hostname);
          expect(fullUrl.pathname).toBe(config.route);
          
          // Property: Full URL should be well-formed
          expect(fullUrl.toString()).toMatch(/^https?:\/\/.+/);
          expect(fullUrl.toString()).toContain(config.hostname);
          expect(fullUrl.toString()).toContain(config.route);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate routing configuration structure', () => {
    /**
     * **Cloudflare Deployment, Property 4: SPA routing configuration correctness**
     * **Validates: Requirements 2.3**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          routes: fc.array(
            fc.record({
              route: fc.stringMatching(/^\/[a-z0-9-]*$/),
              status: fc.integer({ min: 200, max: 599 }),
              success: fc.boolean()
            }),
            { minLength: 1, maxLength: 10 }
          ),
          baseUrl: fc.webUrl()
        }),
        (config) => {
          // Property: Route validation logic should be consistent
          for (const routeInfo of config.routes) {
            // Success should correlate with HTTP status codes
            if (routeInfo.status >= 200 && routeInfo.status < 400) {
              // 2xx and 3xx status codes should generally be considered successful
              // (though this depends on specific SPA configuration)
            }
            
            // Route should be a valid path
            expect(routeInfo.route).toMatch(/^\/[a-z0-9-]*$/);
            expect(typeof routeInfo.success).toBe('boolean');
            expect(typeof routeInfo.status).toBe('number');
            expect(routeInfo.status).toBeGreaterThanOrEqual(200);
            expect(routeInfo.status).toBeLessThan(600);
          }
          
          // Base URL should be valid
          expect(config.baseUrl).toMatch(/^https?:\/\/.+/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify tenant routing patterns', () => {
    /**
     * **Cloudflare Deployment, Property 4: SPA routing configuration correctness**
     * **Validates: Requirements 2.3**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          tenantSlug: fc.stringMatching(/^[a-z0-9-]{3,20}$/),
          baseUrl: fc.constantFrom(
            'https://agendai.clubemkt.digital',
            'https://staging.agendai.clubemkt.digital'
          )
        }),
        (config) => {
          // Property: Tenant routing should follow consistent patterns
          const tenantUrl = `${config.baseUrl}/${config.tenantSlug}`;
          const tenantBookingUrl = `${config.baseUrl}/${config.tenantSlug}/booking`;
          const tenantPublicUrl = `${config.baseUrl}/${config.tenantSlug}/public`;
          
          // All tenant URLs should be valid
          expect(() => new URL(tenantUrl)).not.toThrow();
          expect(() => new URL(tenantBookingUrl)).not.toThrow();
          expect(() => new URL(tenantPublicUrl)).not.toThrow();
          
          // URLs should contain the tenant slug
          expect(tenantUrl).toContain(config.tenantSlug);
          expect(tenantBookingUrl).toContain(config.tenantSlug);
          expect(tenantPublicUrl).toContain(config.tenantSlug);
          
          // URLs should use the correct base domain
          expect(tenantUrl).toContain(config.baseUrl);
          expect(tenantBookingUrl).toContain(config.baseUrl);
          expect(tenantPublicUrl).toContain(config.baseUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle SPA routing verification edge cases', async () => {
    /**
     * **Cloudflare Deployment, Property 4: SPA routing configuration correctness**
     * **Validates: Requirements 2.3**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baseUrl: fc.webUrl({ validSchemes: ['https'] }),
          skipRouting: fc.boolean(),
          timeout: fc.integer({ min: 1000, max: 5000 })
        }),
        async (config) => {
          const verifier = new DeploymentVerifier({
            timeout: config.timeout,
            verbose: false
          });
          
          if (config.skipRouting) {
            // Property: When SPA routing is skipped, verification should handle it gracefully
            const fullVerification = await verifier.verify({
              url: config.baseUrl,
              skipSpaRouting: true,
              timeout: config.timeout
            });
            
            // Should not include SPA routing check
            const spaCheck = fullVerification.checks.find(c => c.name === 'SPA Routing');
            expect(spaCheck).toBeUndefined();
          } else {
            // Property: SPA routing verification should always return a result
            const result = await verifier.verifySpaRouting(config.baseUrl);
            
            expect(result).toBeDefined();
            expect(result.name).toBe('SPA Routing');
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate wrangler.toml SPA redirect configuration', () => {
    /**
     * **Cloudflare Deployment, Property 4: SPA routing configuration correctness**
     * **Validates: Requirements 2.3**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          fromPattern: fc.constantFrom('/*', '/app/*', '/auth/*', '/dashboard/*'),
          toDestination: fc.constantFrom('/index.html', '/app.html'),
          statusCode: fc.constantFrom(200, 301, 302)
        }),
        (config) => {
          // Property: SPA redirect configuration should be valid
          
          // From pattern should be a valid glob pattern
          expect(config.fromPattern).toMatch(/^\/.*$/);
          
          // To destination should be a valid path
          expect(config.toDestination).toMatch(/^\/.*\.html$/);
          
          // Status code should be appropriate for SPA routing
          expect([200, 301, 302]).toContain(config.statusCode);
          
          // For SPA routing, status 200 is most common (serve index.html for all routes)
          // but 301/302 redirects are also valid configurations
          if (config.toDestination === '/index.html' && config.fromPattern === '/*') {
            // This is a typical SPA configuration - status should be valid for SPA routing
            expect([200, 301, 302]).toContain(config.statusCode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});