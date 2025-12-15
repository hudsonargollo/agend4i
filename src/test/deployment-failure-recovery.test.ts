import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { DeploymentErrorHandler } from '../lib/deployment-error-handler';
import type { DeploymentError } from '../lib/deployment-error-handler';

type DeploymentStage = 'pre-validation' | 'build' | 'deployment' | 'post-validation';

/**
 * Property-based tests for deployment failure recovery
 * **Property 10: Deployment failure recovery**
 * **Validates: Requirements 3.5, 4.5**
 */

describe('Deployment Failure Recovery', () => {
  let errorHandler: DeploymentErrorHandler;

  beforeEach(() => {
    errorHandler = new DeploymentErrorHandler({
      verbose: false,
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 100, // Faster for tests
        maxDelay: 1000,
        backoffMultiplier: 2
      }
    });
  });

  /**
   * **Cloudflare Deployment, Property 10: Deployment failure recovery**
   * **Validates: Requirements 3.5, 4.5**
   */
  it('Property 10: For any deployment error, the system should provide recovery options and rollback information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          errorType: fc.constantFrom('network', 'authentication', 'build', 'configuration', 'quota', 'validation'),
          errorMessage: fc.oneof(
            // Network errors
            fc.constantFrom(
              'ECONNRESET: Connection reset by peer',
              'ENOTFOUND: DNS lookup failed',
              'ETIMEDOUT: Request timeout',
              'Network error occurred'
            ),
            // Authentication errors
            fc.constantFrom(
              'Unauthorized: Invalid API token',
              'Authentication failed: Please run wrangler login',
              'Token expired: Re-authenticate required'
            ),
            // Build errors
            fc.constantFrom(
              'Build failed: TypeScript compilation error',
              'Module not found: Missing dependency',
              'Syntax error in source code'
            ),
            // Configuration errors
            fc.constantFrom(
              'Invalid wrangler.toml configuration',
              'Missing environment variable: VITE_SUPABASE_URL',
              'Project not found in Cloudflare'
            ),
            // Quota errors
            fc.constantFrom(
              'Quota exceeded: Daily deployment limit reached',
              'Rate limit exceeded: Too many requests',
              'File size limit exceeded'
            ),
            // Validation errors
            fc.constantFrom(
              'Validation failed: Missing required fields',
              'Invalid configuration: Check settings',
              'Setup incomplete: Missing prerequisites'
            )
          ),
          stage: fc.constantFrom<DeploymentStage>('pre-validation', 'build', 'deployment', 'post-validation'),
          hasHistory: fc.boolean()
        }),
        async (config) => {
          // Setup deployment history if needed
          if (config.hasHistory) {
            errorHandler.recordDeployment(
              'test-deployment-123',
              'https://test.pages.dev',
              true
            );
          }

          // Create error based on configuration
          const error = new Error(config.errorMessage);
          
          // Handle the deployment error
          const result = await errorHandler.handleDeploymentError(error, config.stage);

          // Property assertions: Every error should provide comprehensive recovery information
          
          // 1. Error should be properly classified
          expect(result.error).toBeDefined();
          expect(result.error.type).toBeDefined();
          expect(['network', 'authentication', 'build', 'configuration', 'quota', 'validation', 'unknown']).toContain(result.error.type);
          expect(result.error.stage).toBe(config.stage);
          expect(result.error.message).toBe(config.errorMessage);
          expect(result.error.timestamp).toBeInstanceOf(Date);

          // 2. Recovery actions should always be provided
          expect(result.recoveryActions).toBeDefined();
          expect(Array.isArray(result.recoveryActions)).toBe(true);
          expect(result.recoveryActions.length).toBeGreaterThan(0);

          // 3. Each recovery action should have required properties
          result.recoveryActions.forEach(action => {
            expect(action.type).toBeDefined();
            expect(['retry', 'rollback', 'manual', 'skip']).toContain(action.type);
            expect(action.description).toBeDefined();
            expect(typeof action.description).toBe('string');
            expect(action.description.length).toBeGreaterThan(0);
            expect(typeof action.automated).toBe('boolean');
          });

          // 4. Error report should be comprehensive
          expect(result.report).toBeDefined();
          expect(typeof result.report).toBe('string');
          expect(result.report.length).toBeGreaterThan(0);
          expect(result.report).toContain('DEPLOYMENT ERROR REPORT');
          expect(result.report).toContain(config.errorMessage);

          // 5. Rollback information should be consistent
          expect(result.rollbackInfo).toBeDefined();
          expect(typeof result.rollbackInfo.rollbackAvailable).toBe('boolean');
          
          if (config.hasHistory) {
            // If we have deployment history, rollback should be available
            expect(result.rollbackInfo.rollbackAvailable).toBe(true);
            expect(result.rollbackInfo.previousUrl).toBeDefined();
            expect(result.rollbackInfo.previousDeploymentId).toBeDefined();
          }

          // 6. Retryable errors should have retry actions
          if (result.error.retryable) {
            const hasRetryAction = result.recoveryActions.some(action => action.type === 'retry');
            expect(hasRetryAction).toBe(true);
          }

          // 7. Recoverable errors with history should have rollback actions
          if (result.error.recoverable && config.hasHistory) {
            const hasRollbackAction = result.recoveryActions.some(action => action.type === 'rollback');
            expect(hasRollbackAction).toBe(true);
          }

          // 8. Error classification should be consistent with message content
          const errorMessage = config.errorMessage.toLowerCase();
          if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
            expect(result.error.type).toBe('network');
            expect(result.error.retryable).toBe(true);
          }
          if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('token')) {
            expect(result.error.type).toBe('authentication');
            expect(result.error.retryable).toBe(false);
          }
          if (errorMessage.includes('build') || errorMessage.includes('compilation') || errorMessage.includes('syntax')) {
            expect(result.error.type).toBe('build');
            expect(result.error.retryable).toBe(false);
          }
        }
      ),
      { numRuns: 50 } // Run 50 iterations to test various combinations
    );
  });

  /**
   * Test retry logic with exponential backoff
   */
  it('Property 10a: Retry logic should implement exponential backoff for retryable errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          attemptNumber: fc.integer({ min: 1, max: 5 }),
          baseDelay: fc.integer({ min: 100, max: 2000 }),
          maxDelay: fc.integer({ min: 5000, max: 30000 }),
          backoffMultiplier: fc.float({ min: 1.5, max: 3.0 })
        }),
        async (config) => {
          const handler = new DeploymentErrorHandler({
            retryConfig: {
              maxAttempts: 5,
              baseDelay: config.baseDelay,
              maxDelay: config.maxDelay,
              backoffMultiplier: config.backoffMultiplier
            }
          });

          const delay = handler.calculateRetryDelay(config.attemptNumber);

          // Property: Delay should increase exponentially but not exceed max
          const expectedDelay = Math.min(
            config.baseDelay * Math.pow(config.backoffMultiplier, config.attemptNumber - 1),
            config.maxDelay
          );

          expect(delay).toBe(expectedDelay);
          expect(delay).toBeLessThanOrEqual(config.maxDelay);
          expect(delay).toBeGreaterThanOrEqual(config.baseDelay);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Test error classification consistency
   */
  it('Property 10b: Error classification should be deterministic and consistent', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorMessage: fc.oneof(
            fc.constantFrom(
              'ECONNRESET',
              'ENOTFOUND', 
              'ETIMEDOUT',
              'network error',
              'unauthorized',
              'authentication failed',
              'build failed',
              'compilation error',
              'quota exceeded',
              'rate limit',
              'validation failed',
              'configuration invalid'
            ),
            fc.string({ minLength: 10, maxLength: 100 })
          ),
          stage: fc.constantFrom<DeploymentStage>('pre-validation', 'build', 'deployment', 'post-validation')
        }),
        (config) => {
          const error1 = errorHandler.classifyError(config.errorMessage, config.stage);
          const error2 = errorHandler.classifyError(config.errorMessage, config.stage);

          // Property: Classification should be deterministic
          expect(error1.type).toBe(error2.type);
          expect(error1.retryable).toBe(error2.retryable);
          expect(error1.recoverable).toBe(error2.recoverable);
          expect(error1.stage).toBe(error2.stage);
          expect(error1.message).toBe(error2.message);

          // Property: Error should have valid properties
          expect(['network', 'authentication', 'build', 'configuration', 'quota', 'validation', 'unknown']).toContain(error1.type);
          expect(typeof error1.retryable).toBe('boolean');
          expect(typeof error1.recoverable).toBe('boolean');
          expect(error1.timestamp).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test rollback availability logic
   */
  it('Property 10c: Rollback should only be available when there is successful deployment history', () => {
    fc.assert(
      fc.property(
        fc.record({
          deploymentHistory: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              url: fc.webUrl({ validSchemes: ['https'] }),
              success: fc.boolean()
            }),
            { minLength: 0, maxLength: 10 }
          )
        }),
        (config) => {
          // Clear existing history
          const handler = new DeploymentErrorHandler();
          
          // Add deployment history
          config.deploymentHistory.forEach(deployment => {
            handler.recordDeployment(deployment.id, deployment.url, deployment.success);
          });

          const rollbackInfo = handler.getRollbackInfo();
          const hasSuccessfulDeployment = config.deploymentHistory.some(d => d.success);

          // Property: Rollback should be available only if there's a successful deployment
          expect(rollbackInfo.rollbackAvailable).toBe(hasSuccessfulDeployment);

          if (hasSuccessfulDeployment) {
            expect(rollbackInfo.previousDeploymentId).toBeDefined();
            expect(rollbackInfo.previousUrl).toBeDefined();
            expect(rollbackInfo.rollbackCommand).toBeDefined();
          } else {
            expect(rollbackInfo.previousDeploymentId).toBeUndefined();
            expect(rollbackInfo.previousUrl).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});