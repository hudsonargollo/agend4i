import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DeploymentExecutor } from '../lib/deployment-executor';

/**
 * Property-based tests for deployment URL accessibility
 * **Property 3: Successful deployment provides accessible URL**
 * **Validates: Requirements 1.4, 3.4**
 */

describe('Deployment URL Accessibility Properties', () => {
  it('should provide accessible URLs for successful deployments', async () => {
    /**
     * **Cloudflare Deployment, Property 3: Successful deployment provides accessible URL**
     * **Validates: Requirements 1.4, 3.4**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('staging', 'production', 'preview'),
        async (environment) => {
          // Create deployment executor in dry-run mode to test URL generation logic
          const executor = new DeploymentExecutor({ 
            environment, 
            dryRun: true 
          });
          
          // Execute deployment (dry run)
          const result = await executor.deploy();
          
          // Property: Successful deployment should provide accessible URL
          if (result.success) {
            // URL should be present
            expect(result.url).toBeDefined();
            expect(typeof result.url).toBe('string');
            expect(result.url.length).toBeGreaterThan(0);
            
            // URL should be a valid HTTPS URL
            expect(result.url).toMatch(/^https:\/\/.+/);
            
            // URL should match expected patterns for the environment
            if (environment === 'production') {
              // Production should use custom domain or pages.dev
              expect(result.url).toMatch(
                /^https:\/\/(agendai\.clubemkt\.digital|[a-zA-Z0-9-]+\.pages\.dev)/
              );
            } else if (environment === 'staging') {
              // Staging should use staging subdomain or pages.dev
              expect(result.url).toMatch(
                /^https:\/\/(staging\.agendai\.clubemkt\.digital|[a-zA-Z0-9-]+\.pages\.dev)/
              );
            } else {
              // Preview should use pages.dev
              expect(result.url).toMatch(/^https:\/\/[a-zA-Z0-9-]+\.pages\.dev/);
            }
            
            // Environment should match the requested environment
            expect(result.environment).toBe(environment);
            
            // Should have deployment metadata
            expect(result.totalTime).toBeGreaterThanOrEqual(0);
            expect(result.buildTime).toBeGreaterThanOrEqual(0);
            expect(result.deployTime).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should parse deployment URLs correctly from Wrangler output', () => {
    /**
     * **Cloudflare Deployment, Property 3: Successful deployment provides accessible URL**
     * **Validates: Requirements 1.4, 3.4**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          customDomain: fc.boolean(),
          environment: fc.constantFrom('staging', 'production', 'preview'),
          deploymentId: fc.hexaString({ minLength: 8, maxLength: 32 }),
          hasPreview: fc.boolean()
        }),
        (config) => {
          const executor = new DeploymentExecutor({ environment: config.environment });
          
          // Generate mock Wrangler output
          let mockOutput = '✨ Deployment complete!\n';
          
          let expectedUrl = '';
          let expectedPreviewUrl = '';
          
          if (config.customDomain) {
            if (config.environment === 'production') {
              expectedUrl = 'https://agendai.clubemkt.digital';
              mockOutput += `🌐 https://agendai.clubemkt.digital\n`;
            } else if (config.environment === 'staging') {
              expectedUrl = 'https://staging.agendai.clubemkt.digital';
              mockOutput += `🌐 https://staging.agendai.clubemkt.digital\n`;
            }
          }
          
          if (config.hasPreview || !config.customDomain) {
            const previewUrl = `https://deployment-${config.deploymentId}.pages.dev`;
            expectedPreviewUrl = previewUrl;
            mockOutput += `🔗 ${previewUrl}\n`;
            
            if (!expectedUrl) {
              expectedUrl = previewUrl;
            }
          }
          
          if (config.deploymentId) {
            mockOutput += `Deployment ID: ${config.deploymentId}\n`;
          }
          
          // Parse the output
          const result = executor.parseDeploymentOutput(mockOutput);
          
          // Property: Parser should extract valid URLs
          if (expectedUrl) {
            expect(result.url).toBe(expectedUrl);
            expect(result.url).toMatch(/^https:\/\/.+/);
          }
          
          if (expectedPreviewUrl && expectedPreviewUrl !== expectedUrl) {
            expect(result.previewUrl).toBe(expectedPreviewUrl);
            expect(result.previewUrl).toMatch(/^https:\/\/.+/);
          }
          
          if (config.deploymentId) {
            expect(result.deploymentId).toBe(config.deploymentId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle URL validation for different domain patterns', () => {
    /**
     * **Cloudflare Deployment, Property 3: Successful deployment provides accessible URL**
     * **Validates: Requirements 1.4, 3.4**
     */
    
    fc.assert(
      fc.property(
        fc.record({
          subdomain: fc.stringMatching(/^[a-z0-9-]{1,20}$/),
          deploymentHash: fc.hexaString({ minLength: 8, maxLength: 16 }),
          isCustomDomain: fc.boolean()
        }),
        (config) => {
          const executor = new DeploymentExecutor();
          
          // Generate different URL patterns
          const urls = [];
          
          if (config.isCustomDomain) {
            urls.push('https://agendai.clubemkt.digital');
            urls.push('https://staging.agendai.clubemkt.digital');
          } else {
            urls.push(`https://${config.subdomain}-${config.deploymentHash}.pages.dev`);
            urls.push(`https://deployment-${config.deploymentHash}.pages.dev`);
          }
          
          for (const url of urls) {
            const mockOutput = `✨ Success! Deployed to ${url}`;
            const result = executor.parseDeploymentOutput(mockOutput);
            
            // Property: All valid deployment URLs should be parsed correctly
            expect(result.url).toBe(url);
            expect(result.url).toMatch(/^https:\/\/.+/);
            
            // Should match expected domain patterns
            if (config.isCustomDomain) {
              expect(result.url).toMatch(/clubemkt\.digital$/);
            } else {
              expect(result.url).toMatch(/\.pages\.dev$/);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate deployment result structure consistency', async () => {
    /**
     * **Cloudflare Deployment, Property 3: Successful deployment provides accessible URL**
     * **Validates: Requirements 1.4, 3.4**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          environment: fc.constantFrom('staging', 'production', 'preview'),
          verbose: fc.boolean(),
          dryRun: fc.constant(true) // Always use dry run for testing
        }),
        async (config) => {
          const executor = new DeploymentExecutor(config);
          const result = await executor.deploy();
          
          // Property: Deployment result should have consistent structure
          expect(result).toHaveProperty('success');
          expect(typeof result.success).toBe('boolean');
          
          if (result.success) {
            // Successful deployment should have required properties
            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('environment');
            expect(result).toHaveProperty('totalTime');
            expect(result).toHaveProperty('buildTime');
            expect(result).toHaveProperty('deployTime');
            
            // URL should be accessible format
            expect(typeof result.url).toBe('string');
            expect(result.url).toMatch(/^https:\/\/.+/);
            
            // Times should be non-negative numbers
            expect(result.totalTime).toBeGreaterThanOrEqual(0);
            expect(result.buildTime).toBeGreaterThanOrEqual(0);
            expect(result.deployTime).toBeGreaterThanOrEqual(0);
            
            // Environment should match input
            expect(result.environment).toBe(config.environment);
          } else {
            // Failed deployment should have error information
            expect(result).toHaveProperty('error');
            expect(result).toHaveProperty('stage');
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});