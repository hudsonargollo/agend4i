/**
 * Property-Based Test: Multi-environment configuration support
 * **Feature: cloudflare-deployment, Property 7: Multi-environment configuration support**
 * **Validates: Requirements 2.5**
 * 
 * This test verifies that the system supports independent deployment with environment-specific settings
 * for staging and production environments as specified in Requirements 2.5.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  getEnvironmentConfig,
  getDeploymentConfig,
  validateEnvironmentConfig,
  generateWranglerEnvConfig,
  generateEnvFileContent,
  isValidEnvironment,
  getSupportedEnvironments,
  type Environment,
  type EnvironmentConfig,
  type DeploymentEnvironmentConfig
} from '@/lib/environment-config';

describe('Multi-environment configuration support', () => {
  // Generator for valid environments (excluding development for deployment focus)
  const deploymentEnvironmentArbitrary = fc.constantFrom('staging', 'production', 'preview');
  
  // Generator for all supported environments
  const allEnvironmentArbitrary = fc.constantFrom('development', 'staging', 'production', 'preview');

  it('**Property 7: Multi-environment configuration support** - should support independent deployment with environment-specific settings', () => {
    fc.assert(
      fc.property(
        deploymentEnvironmentArbitrary,
        (environment) => {
          // Get environment configuration
          const envConfig = getEnvironmentConfig(environment);
          const deployConfig = getDeploymentConfig(environment);
          
          // Property: Each environment should have independent configuration
          expect(envConfig).toBeDefined();
          expect(envConfig.name).toBe(environment);
          expect(deployConfig).toBeDefined();
          expect(deployConfig.environment).toBe(environment);
          
          // Property: Environment-specific settings should be unique
          expect(envConfig.domain).toBeTruthy();
          expect(envConfig.wranglerProjectName).toBeTruthy();
          expect(envConfig.wranglerProjectName).toContain(environment);
          
          // Property: Each environment should have its own deployment configuration
          expect(deployConfig.buildCommand).toBeTruthy();
          expect(deployConfig.deployCommand).toBeTruthy();
          expect(deployConfig.verificationUrl).toBeDefined();
          
          // Property: Environment variables should be environment-specific
          expect(envConfig.environmentVariables.VITE_ENVIRONMENT).toBe(environment);
          expect(envConfig.environmentVariables.VITE_APP_DOMAIN).toBeTruthy();
          
          // Property: Production and staging should have custom domains
          if (environment === 'production' || environment === 'staging') {
            expect(envConfig.customDomain).toBeTruthy();
            expect(envConfig.routes).toBeDefined();
            expect(envConfig.routes!.length).toBeGreaterThan(0);
            expect(deployConfig.requiresCustomDomain).toBe(true);
          }
          
          // Property: Configuration should be valid
          const validation = validateEnvironmentConfig(environment);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate independent wrangler configurations for each environment', () => {
    fc.assert(
      fc.property(
        deploymentEnvironmentArbitrary,
        (environment) => {
          const wranglerConfig = generateWranglerEnvConfig(environment);
          
          // Property: Each environment should generate unique wrangler configuration
          expect(wranglerConfig).toContain(`[env.${environment}]`);
          expect(wranglerConfig).toContain(`name = "agendai-saas-${environment}"`);
          expect(wranglerConfig).toContain(`VITE_ENVIRONMENT = "${environment}"`);
          
          // Property: Environment-specific domain configuration
          const envConfig = getEnvironmentConfig(environment);
          expect(wranglerConfig).toContain(`VITE_APP_DOMAIN = "${envConfig.domain}"`);
          
          // Property: Custom domain environments should have routes
          if (environment === 'production' || environment === 'staging') {
            expect(wranglerConfig).toContain('routes = [');
            expect(wranglerConfig).toContain(envConfig.customDomain!);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate independent environment files for each environment', () => {
    fc.assert(
      fc.property(
        allEnvironmentArbitrary,
        (environment) => {
          const envFileContent = generateEnvFileContent(environment);
          
          // Property: Each environment should generate unique env file content
          expect(envFileContent).toContain(`# ${environment.charAt(0).toUpperCase() + environment.slice(1)} Environment Configuration`);
          expect(envFileContent).toContain(`VITE_ENVIRONMENT=${environment}`);
          
          // Property: Environment-specific domain should be included
          const envConfig = getEnvironmentConfig(environment);
          expect(envFileContent).toContain(`VITE_APP_DOMAIN=${envConfig.domain}`);
          
          // Property: All required environment variables should be present
          const requiredVars = [
            'VITE_ENVIRONMENT',
            'VITE_APP_DOMAIN',
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_PROJECT_ID',
            'VITE_SUPABASE_PUBLISHABLE_KEY'
          ];
          
          for (const varName of requiredVars) {
            expect(envFileContent).toContain(`${varName}=`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain configuration isolation between environments', () => {
    fc.assert(
      fc.property(
        fc.tuple(deploymentEnvironmentArbitrary, deploymentEnvironmentArbitrary).filter(([env1, env2]) => env1 !== env2),
        ([env1, env2]) => {
          const config1 = getEnvironmentConfig(env1);
          const config2 = getEnvironmentConfig(env2);
          const deployConfig1 = getDeploymentConfig(env1);
          const deployConfig2 = getDeploymentConfig(env2);
          
          // Property: Different environments should have different configurations
          expect(config1.name).not.toBe(config2.name);
          expect(config1.wranglerProjectName).not.toBe(config2.wranglerProjectName);
          expect(deployConfig1.deployCommand).not.toBe(deployConfig2.deployCommand);
          
          // Property: Environment variables should be environment-specific
          expect(config1.environmentVariables.VITE_ENVIRONMENT).toBe(env1);
          expect(config2.environmentVariables.VITE_ENVIRONMENT).toBe(env2);
          
          // Property: Domains should be different (except for shared supabase)
          if (env1 !== 'preview' && env2 !== 'preview') {
            expect(config1.domain).not.toBe(config2.domain);
          }
          
          // Property: Custom domains should be different when present
          if (config1.customDomain && config2.customDomain) {
            expect(config1.customDomain).not.toBe(config2.customDomain);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate environment configurations independently', () => {
    fc.assert(
      fc.property(
        allEnvironmentArbitrary,
        (environment) => {
          const validation = validateEnvironmentConfig(environment);
          
          // Property: Each environment should validate independently
          expect(validation).toBeDefined();
          expect(validation.valid).toBeDefined();
          expect(validation.errors).toBeDefined();
          expect(validation.warnings).toBeDefined();
          
          // Property: Valid environments should pass validation
          if (isValidEnvironment(environment)) {
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
          }
          
          // Property: Production and staging may have warnings but should be valid
          if (environment === 'production' || environment === 'staging') {
            expect(validation.valid).toBe(true);
            // Warnings are acceptable for custom domain setup
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should support all required environments', () => {
    const supportedEnvironments = getSupportedEnvironments();
    
    // Property: All required environments should be supported
    expect(supportedEnvironments).toContain('development');
    expect(supportedEnvironments).toContain('staging');
    expect(supportedEnvironments).toContain('production');
    expect(supportedEnvironments).toContain('preview');
    
    // Property: Each supported environment should be valid
    for (const env of supportedEnvironments) {
      expect(isValidEnvironment(env)).toBe(true);
      
      // Should be able to get configuration without errors
      expect(() => getEnvironmentConfig(env)).not.toThrow();
      expect(() => getDeploymentConfig(env)).not.toThrow();
    }
  });

  it('should handle environment-specific deployment requirements', () => {
    fc.assert(
      fc.property(
        deploymentEnvironmentArbitrary,
        (environment) => {
          const deployConfig = getDeploymentConfig(environment);
          const envConfig = getEnvironmentConfig(environment);
          
          // Property: Environment-specific deployment commands should be correct
          expect(deployConfig.deployCommand).toContain('wrangler pages deploy');
          
          if (environment !== 'preview') {
            expect(deployConfig.deployCommand).toContain(`--env ${environment}`);
          }
          
          // Property: Build commands should be environment-appropriate
          if (environment === 'development') {
            expect(deployConfig.buildCommand).toContain('dev');
          } else if (environment === 'preview') {
            // Preview uses generic build command
            expect(deployConfig.buildCommand).toBe('npm run build');
          } else {
            expect(deployConfig.buildCommand).toContain(environment);
          }
          
          // Property: Verification URLs should match environment domains
          if (deployConfig.verificationUrl) {
            if (environment === 'development') {
              expect(deployConfig.verificationUrl).toContain('localhost');
            } else {
              expect(deployConfig.verificationUrl).toContain('https://');
              if (envConfig.customDomain) {
                expect(deployConfig.verificationUrl).toContain(envConfig.customDomain);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});