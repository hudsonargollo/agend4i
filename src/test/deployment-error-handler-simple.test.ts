import { describe, it, expect } from 'vitest';
import * as ErrorHandlerModule from '../lib/deployment-error-handler';
const { DeploymentErrorHandler } = ErrorHandlerModule;

/**
 * Simple test to verify DeploymentErrorHandler import and basic functionality
 * **Property 10: Deployment failure recovery**
 * **Validates: Requirements 3.5, 4.5**
 */

describe('Deployment Error Handler - Simple Test', () => {
  it('Property 10: Should create error handler and classify errors correctly', () => {
    const errorHandler = new DeploymentErrorHandler();
    
    // Test network error classification
    const networkError = errorHandler.classifyError('ECONNRESET: Connection reset', 'deployment');
    expect(networkError.type).toBe('network');
    expect(networkError.retryable).toBe(true);
    expect(networkError.stage).toBe('deployment');
    
    // Test authentication error classification
    const authError = errorHandler.classifyError('Unauthorized: Invalid token', 'deployment');
    expect(authError.type).toBe('authentication');
    expect(authError.retryable).toBe(false);
    
    // Test build error classification
    const buildError = errorHandler.classifyError('Build failed: TypeScript error', 'build');
    expect(buildError.type).toBe('build');
    expect(buildError.retryable).toBe(false);
    expect(buildError.stage).toBe('build');
    
    // Test retry delay calculation
    const delay1 = errorHandler.calculateRetryDelay(1);
    const delay2 = errorHandler.calculateRetryDelay(2);
    expect(delay2).toBeGreaterThan(delay1);
    
    // Test rollback info when no history
    const rollbackInfo = errorHandler.getRollbackInfo();
    expect(rollbackInfo.rollbackAvailable).toBe(false);
    
    // Test recording deployment and rollback availability
    errorHandler.recordDeployment('test-123', 'https://test.pages.dev', true);
    const rollbackInfoAfter = errorHandler.getRollbackInfo();
    expect(rollbackInfoAfter.rollbackAvailable).toBe(true);
    expect(rollbackInfoAfter.previousUrl).toBe('https://test.pages.dev');
  });

  it('Property 10a: Should provide recovery actions for different error types', async () => {
    const errorHandler = new DeploymentErrorHandler();
    
    // Test network error recovery
    const networkError = errorHandler.classifyError('ECONNRESET', 'deployment');
    const networkActions = errorHandler.getRecoveryActions(networkError);
    expect(networkActions.length).toBeGreaterThan(0);
    expect(networkActions.some(action => action.type === 'retry')).toBe(true);
    
    // Test authentication error recovery
    const authError = errorHandler.classifyError('Unauthorized', 'deployment');
    const authActions = errorHandler.getRecoveryActions(authError);
    expect(authActions.length).toBeGreaterThan(0);
    expect(authActions.some(action => action.type === 'manual')).toBe(true);
    
    // Test error report generation
    const report = errorHandler.generateErrorReport(networkError);
    expect(report).toContain('DEPLOYMENT ERROR REPORT');
    expect(report).toContain('NETWORK');
    expect(report).toContain('RECOVERY OPTIONS');
  });

  it('Property 10b: Should handle deployment error with comprehensive information', async () => {
    const errorHandler = new DeploymentErrorHandler();
    
    const result = await errorHandler.handleDeploymentError(
      new Error('Network timeout occurred'),
      'deployment'
    );
    
    expect(result.error).toBeDefined();
    expect(result.error.type).toBe('network');
    expect(result.report).toBeDefined();
    expect(result.recoveryActions).toBeDefined();
    expect(result.rollbackInfo).toBeDefined();
    
    expect(result.recoveryActions.length).toBeGreaterThan(0);
    expect(result.report.length).toBeGreaterThan(0);
  });
});