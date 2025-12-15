import { describe, it, expect } from 'vitest';

describe('Debug Import', () => {
  it('should show what is imported', async () => {
    try {
      const module = await import('../lib/deployment-error-handler');
      console.log('Module contents:', Object.keys(module));
      console.log('DeploymentErrorHandler:', module.DeploymentErrorHandler);
      console.log('Type of DeploymentErrorHandler:', typeof module.DeploymentErrorHandler);
      
      expect(module).toBeDefined();
    } catch (error) {
      console.log('Import error:', error);
      throw error;
    }
  });

  it('should try direct import', () => {
    try {
      // Try require instead
      const module = require('../lib/deployment-error-handler');
      console.log('Require module contents:', Object.keys(module));
      console.log('Require DeploymentErrorHandler:', module.DeploymentErrorHandler);
    } catch (error) {
      console.log('Require error:', error);
    }
  });
});