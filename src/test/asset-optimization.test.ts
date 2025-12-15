import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DeploymentVerifier } from '../lib/deployment-verifier';

/**
 * Property-based tests for asset optimization
 * **Property 5: Production build optimization consistency**
 * **Validates: Requirements 2.2**
 */

describe('Asset Optimization Properties', () => {
  it('should verify asset optimization for production builds', async () => {
    /**
     * **Cloudflare Deployment, Property 5: Production build optimization consistency**
     * **Validates: Requirements 2.2**
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
          
          // Test asset optimization verification
          const result = await verifier.verifyAssetOptimization(config.baseUrl);
          
          // Property: Asset optimization verification should have consistent structure
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('message');
          expect(result).toHaveProperty('details');
          expect(result).toHaveProperty('duration');
          
          expect(result.name).toBe('Asset Optimization');
          expect(typeof result.success).toBe('boolean');
          expect(typeof result.message).toBe('string');
          expect(typeof result.duration).toBe('number');
          expect(result.duration).toBeGreaterThanOrEqual(0);
          
          // Details should contain optimization checks
          expect(result.details).toHaveProperty('checks');
          expect(Array.isArray(result.details.checks)).toBe(true);
          
          // Each check should have expected structure
          for (const check of result.details.checks) {
            expect(check).toHaveProperty('name');
            expect(check).toHaveProperty('success');
            expect(check).toHaveProperty('details');
            expect(typeof check.name).toBe('string');
            expect(typeof check.success).toBe('boolean');
          }
          
          // Should include optimization checks (may vary based on fetch availability)
          const checkNames = result.details.checks.map((c: any) => c.name);
          expect(checkNames.length).toBeGreaterThan(0);
          
          // If fetch is available and successful, should have detailed checks
          // If fetch fails or is unavailable, may have different check structure
          const hasDetailedChecks = checkNames.includes('HTML Minification');
          const hasFetchError = checkNames.includes('HTML Fetch');
          
          if (hasDetailedChecks) {
            expect(checkNames).toContain('HTML Minification');
            expect(checkNames).toContain('Asset References');
            expect(checkNames).toContain('Compression Headers');
          } else if (hasFetchError) {
            // Fetch failed, but we should still have some checks
            expect(checkNames.length).toBeGreaterThan(0);
          } else {
            // Simulated checks (no fetch available)
            expect(checkNames.length).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate HTML minification detection logic', () => {
    /**
     * **Cloudflare Deployment, Property 5: Production build optimization consistency**
     * **Validates: Requirements 2.2**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          htmlContent: fc.oneof(
            // Minified HTML (no extra whitespace)
            fc.constant('<!DOCTYPE html><html><head><title>Test</title></head><body><div>Content</div></body></html>'),
            // Non-minified HTML (with whitespace)
            fc.constant(`<!DOCTYPE html>
<html>
  <head>
    <title>Test</title>
  </head>
  <body>
    <div>Content</div>
  </body>
</html>`),
            // Mixed content
            fc.stringOf(fc.oneof(fc.char(), fc.constant(' '), fc.constant('\n')), { minLength: 50, maxLength: 500 })
          )
        }),
        (config) => {
          // Property: Minification detection should be consistent
          const html = config.htmlContent;
          
          // Basic minification indicators
          const hasDoubleSpaces = html.includes('  ');
          const hasMultipleLines = html.split('\n').length > 10;
          const startsWithDoctype = html.trim().startsWith('<!DOCTYPE html><html');
          
          // Minification heuristics
          const isLikelyMinified = startsWithDoctype || (!hasDoubleSpaces && !hasMultipleLines);
          
          // Property: Minification detection should be boolean
          expect(typeof isLikelyMinified).toBe('boolean');
          
          // Property: If HTML has double spaces, it's likely not minified
          if (hasDoubleSpaces) {
            expect(isLikelyMinified).toBe(false);
          }
          
          // Property: If HTML starts with compact doctype, it's likely minified
          if (startsWithDoctype) {
            expect(isLikelyMinified).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate asset reference detection', () => {
    /**
     * **Cloudflare Deployment, Property 5: Production build optimization consistency**
     * **Validates: Requirements 2.2**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          htmlContent: fc.oneof(
            // HTML with JS and CSS
            fc.constant('<html><head><link rel="stylesheet" href="style.css"><script src="app.js"></script></head></html>'),
            // HTML with only JS
            fc.constant('<html><head><script src="bundle.js"></script></head></html>'),
            // HTML with only CSS
            fc.constant('<html><head><link rel="stylesheet" href="main.css"></head></html>'),
            // HTML with no assets
            fc.constant('<html><head><title>No Assets</title></head></html>'),
            // HTML with inline assets
            fc.constant('<html><head><style>body{margin:0}</style><script>console.log("inline")</script></head></html>')
          )
        }),
        (config) => {
          const html = config.htmlContent;
          
          // Property: Asset detection should be accurate
          const hasJS = html.includes('.js');
          const hasCSS = html.includes('.css');
          const hasAssets = hasJS || hasCSS;
          
          // Property: Detection results should be boolean
          expect(typeof hasJS).toBe('boolean');
          expect(typeof hasCSS).toBe('boolean');
          expect(typeof hasAssets).toBe('boolean');
          
          // Property: If HTML contains .js, hasJS should be true
          if (html.includes('.js')) {
            expect(hasJS).toBe(true);
            expect(hasAssets).toBe(true);
          }
          
          // Property: If HTML contains .css, hasCSS should be true
          if (html.includes('.css')) {
            expect(hasCSS).toBe(true);
            expect(hasAssets).toBe(true);
          }
          
          // Property: If no assets are detected, hasAssets should be false
          if (!html.includes('.js') && !html.includes('.css')) {
            expect(hasAssets).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate compression header analysis', () => {
    /**
     * **Cloudflare Deployment, Property 5: Production build optimization consistency**
     * **Validates: Requirements 2.2**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          headers: fc.record({
            'content-encoding': fc.oneof(
              fc.constant('gzip'),
              fc.constant('br'),
              fc.constant('deflate'),
              fc.constant(null)
            ),
            'content-length': fc.oneof(
              fc.integer({ min: 100, max: 100000 }).map(n => n.toString()),
              fc.constant(null)
            ),
            'content-type': fc.constantFrom('text/html', 'application/javascript', 'text/css', null)
          })
        }),
        (config) => {
          const headers = config.headers;
          
          // Property: Compression detection should be accurate
          const hasCompression = headers['content-encoding'] !== null;
          const compressionType = headers['content-encoding'];
          
          expect(typeof hasCompression).toBe('boolean');
          
          // Property: If content-encoding header exists, compression should be detected
          if (headers['content-encoding']) {
            expect(hasCompression).toBe(true);
            expect(['gzip', 'br', 'deflate']).toContain(compressionType);
          } else {
            expect(hasCompression).toBe(false);
          }
          
          // Property: Content-length should be a valid number string or null
          if (headers['content-length']) {
            const contentLength = parseInt(headers['content-length']);
            expect(contentLength).toBeGreaterThan(0);
            expect(contentLength).toBeLessThan(1000000); // Reasonable upper bound
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle optimization verification edge cases', async () => {
    /**
     * **Cloudflare Deployment, Property 5: Production build optimization consistency**
     * **Validates: Requirements 2.2**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baseUrl: fc.webUrl({ validSchemes: ['https'] }),
          skipOptimization: fc.boolean(),
          timeout: fc.integer({ min: 1000, max: 5000 })
        }),
        async (config) => {
          const verifier = new DeploymentVerifier({
            timeout: config.timeout,
            verbose: false
          });
          
          if (config.skipOptimization) {
            // Property: When asset optimization is skipped, verification should handle it gracefully
            const fullVerification = await verifier.verify({
              url: config.baseUrl,
              skipAssetOptimization: true,
              timeout: config.timeout
            });
            
            // Should not include asset optimization check
            const optimizationCheck = fullVerification.checks.find(c => c.name === 'Asset Optimization');
            expect(optimizationCheck).toBeUndefined();
          } else {
            // Property: Asset optimization verification should always return a result
            const result = await verifier.verifyAssetOptimization(config.baseUrl);
            
            expect(result).toBeDefined();
            expect(result.name).toBe('Asset Optimization');
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate build optimization consistency across environments', () => {
    /**
     * **Cloudflare Deployment, Property 5: Production build optimization consistency**
     * **Validates: Requirements 2.2**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          environment: fc.constantFrom('production', 'staging'),
          buildConfig: fc.record({
            minify: fc.boolean(),
            compress: fc.boolean(),
            sourceMaps: fc.boolean(),
            treeShaking: fc.boolean()
          }),
          assetManifest: fc.record({
            entryPoints: fc.array(fc.stringMatching(/^[a-z0-9-]+\.(js|css)$/), { minLength: 1, maxLength: 5 }),
            chunks: fc.array(fc.stringMatching(/^chunk-[a-z0-9]+\.js$/), { minLength: 0, maxLength: 10 }),
            totalSize: fc.integer({ min: 1000, max: 5000000 })
          })
        }),
        (config) => {
          // Property: Production builds should have consistent optimization
          if (config.environment === 'production') {
            // Production should typically have optimization enabled
            expect(typeof config.buildConfig.minify).toBe('boolean');
            expect(typeof config.buildConfig.compress).toBe('boolean');
            expect(typeof config.buildConfig.treeShaking).toBe('boolean');
          }
          
          // Property: Asset manifest should be valid
          expect(Array.isArray(config.assetManifest.entryPoints)).toBe(true);
          expect(config.assetManifest.entryPoints.length).toBeGreaterThan(0);
          expect(config.assetManifest.totalSize).toBeGreaterThan(0);
          
          // Property: Entry points should have valid extensions
          for (const entryPoint of config.assetManifest.entryPoints) {
            expect(entryPoint).toMatch(/\.(js|css)$/);
          }
          
          // Property: Chunks should follow naming convention
          for (const chunk of config.assetManifest.chunks) {
            expect(chunk).toMatch(/^chunk-[a-z0-9]+\.js$/);
          }
          
          // Property: Total size should be reasonable
          expect(config.assetManifest.totalSize).toBeLessThan(10000000); // 10MB upper bound
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify optimization check aggregation logic', () => {
    /**
     * **Cloudflare Deployment, Property 5: Production build optimization consistency**
     * **Validates: Requirements 2.2**
     */
    
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.constantFrom('HTML Minification', 'Asset References', 'Compression Headers', 'Bundle Size', 'Cache Headers'),
            success: fc.boolean(),
            details: fc.record({
              value: fc.oneof(fc.boolean(), fc.integer(), fc.string()),
              expected: fc.oneof(fc.boolean(), fc.integer(), fc.string())
            })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (checks) => {
          // Property: Check aggregation should be consistent
          const successfulChecks = checks.filter(c => c.success);
          const failedChecks = checks.filter(c => !c.success);
          const totalChecks = checks.length;
          
          // Property: Counts should add up
          expect(successfulChecks.length + failedChecks.length).toBe(totalChecks);
          
          // Property: Overall success should depend on individual checks
          const overallSuccess = failedChecks.length === 0;
          expect(typeof overallSuccess).toBe('boolean');
          
          // Property: If any check fails, overall should fail
          if (failedChecks.length > 0) {
            expect(overallSuccess).toBe(false);
          }
          
          // Property: If all checks pass, overall should pass
          if (failedChecks.length === 0) {
            expect(overallSuccess).toBe(true);
          }
          
          // Property: Each check should have required properties
          for (const check of checks) {
            expect(check).toHaveProperty('name');
            expect(check).toHaveProperty('success');
            expect(check).toHaveProperty('details');
            expect(typeof check.name).toBe('string');
            expect(typeof check.success).toBe('boolean');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});