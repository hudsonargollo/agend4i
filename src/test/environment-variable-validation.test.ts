import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DeploymentValidator } from '../../scripts/validate-deployment.js';

/**
 * **Feature: cloudflare-deployment, Property 2: Environment variable validation gates deployment**
 * **Validates: Requirements 1.3, 2.4**
 * 
 * Property: For any deployment configuration, all required environment variables 
 * should be validated and deployment should only proceed when all are present and valid
 */

describe('Environment Variable Validation Property Tests', () => {
  const testDir = join(process.cwd(), 'test-temp');
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create temporary test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    process.chdir(testDir);
  });

  afterEach(() => {
    // Cleanup
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      try {
        // Clean up test files
        const filesToClean = ['.env.production', '.env.staging', '.env.development', 'package.json', 'wrangler.toml'];
        filesToClean.forEach(file => {
          if (existsSync(file)) {
            unlinkSync(file);
          }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  // Generator for required environment variables
  const requiredEnvVarsArbitrary = fc.constantFrom(
    'VITE_SUPABASE_PROJECT_ID',
    'VITE_SUPABASE_PUBLISHABLE_KEY', 
    'VITE_SUPABASE_URL',
    'VITE_APP_DOMAIN'
  );

  // Generator for valid environment variable values
  const validEnvValueArbitrary = fc.string({ minLength: 1, maxLength: 200 })
    .filter(s => s.trim().length > 0 && !s.includes('\n'));

  // Generator for environment names
  const environmentArbitrary = fc.constantFrom('production', 'staging', 'development');

  // Generator for complete valid environment configuration
  const validEnvConfigArbitrary = fc.record({
    VITE_SUPABASE_PROJECT_ID: validEnvValueArbitrary,
    VITE_SUPABASE_PUBLISHABLE_KEY: validEnvValueArbitrary,
    VITE_SUPABASE_URL: validEnvValueArbitrary,
    VITE_APP_DOMAIN: validEnvValueArbitrary
  });

  it('should pass validation when all required environment variables are present and valid', () => {
    fc.assert(fc.property(
      environmentArbitrary,
      validEnvConfigArbitrary,
      async (environment, envConfig) => {
        // Create environment file with all required variables
        const envFileName = environment === 'development' ? '.env.development' :
                           environment === 'staging' ? '.env.staging' : '.env.production';
        
        const envContent = Object.entries(envConfig)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        writeFileSync(envFileName, envContent);

        const validator = new DeploymentValidator();
        const result = validator.validateEnvironmentVariables(environment);
        
        // When all required variables are present and valid, validation should pass
        expect(result).toBe(true);
        expect(validator.errors.length).toBe(0);
      }
    ), { numRuns: 100 });
  });

  it('should fail validation when required environment variables are missing', () => {
    fc.assert(fc.property(
      environmentArbitrary,
      validEnvConfigArbitrary,
      fc.array(requiredEnvVarsArbitrary, { minLength: 1, maxLength: 4 }),
      async (environment, envConfig, varsToRemove) => {
        // Remove some required variables
        const incompleteConfig = { ...envConfig };
        varsToRemove.forEach(varName => {
          delete incompleteConfig[varName];
        });

        const envFileName = environment === 'development' ? '.env.development' :
                           environment === 'staging' ? '.env.staging' : '.env.production';
        
        const envContent = Object.entries(incompleteConfig)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        writeFileSync(envFileName, envContent);

        const validator = new DeploymentValidator();
        const result = validator.validateEnvironmentVariables(environment);
        
        // When required variables are missing, validation should fail
        expect(result).toBe(false);
        expect(validator.errors.length).toBeGreaterThan(0);
        
        // Should report missing variables
        const errorMessage = validator.errors.join(' ');
        varsToRemove.forEach(varName => {
          expect(errorMessage).toContain(varName);
        });
      }
    ), { numRuns: 100 });
  });

  it('should fail validation when required environment variables are empty', () => {
    fc.assert(fc.property(
      environmentArbitrary,
      validEnvConfigArbitrary,
      fc.array(requiredEnvVarsArbitrary, { minLength: 1, maxLength: 4 }),
      async (environment, envConfig, varsToEmpty) => {
        // Make some required variables empty
        const configWithEmptyVars = { ...envConfig };
        varsToEmpty.forEach(varName => {
          configWithEmptyVars[varName] = '';
        });

        const envFileName = environment === 'development' ? '.env.development' :
                           environment === 'staging' ? '.env.staging' : '.env.production';
        
        const envContent = Object.entries(configWithEmptyVars)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        writeFileSync(envFileName, envContent);

        const validator = new DeploymentValidator();
        const result = validator.validateEnvironmentVariables(environment);
        
        // When required variables are empty, validation should fail
        expect(result).toBe(false);
        expect(validator.errors.length).toBeGreaterThan(0);
        
        // Should report empty variables
        const errorMessage = validator.errors.join(' ');
        varsToEmpty.forEach(varName => {
          expect(errorMessage).toContain(varName);
        });
      }
    ), { numRuns: 100 });
  });

  it('should fail validation when environment file does not exist', () => {
    fc.assert(fc.property(
      environmentArbitrary,
      async (environment) => {
        // Don't create any environment file
        
        const validator = new DeploymentValidator();
        const result = validator.validateEnvironmentVariables(environment);
        
        // When environment file doesn't exist, validation should fail
        expect(result).toBe(false);
        expect(validator.errors.length).toBeGreaterThan(0);
        
        // Should report missing environment file
        const errorMessage = validator.errors.join(' ');
        expect(errorMessage).toContain('not found');
      }
    ), { numRuns: 50 });
  });

  it('should validate different environments independently', () => {
    fc.assert(fc.property(
      validEnvConfigArbitrary,
      validEnvConfigArbitrary,
      async (prodConfig, stagingConfig) => {
        // Create different configurations for production and staging
        const prodContent = Object.entries(prodConfig)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        const stagingContent = Object.entries(stagingConfig)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        writeFileSync('.env.production', prodContent);
        writeFileSync('.env.staging', stagingContent);

        const validator1 = new DeploymentValidator();
        const validator2 = new DeploymentValidator();
        
        const prodResult = validator1.validateEnvironmentVariables('production');
        const stagingResult = validator2.validateEnvironmentVariables('staging');
        
        // Both should pass validation independently
        expect(prodResult).toBe(true);
        expect(stagingResult).toBe(true);
        expect(validator1.errors.length).toBe(0);
        expect(validator2.errors.length).toBe(0);
      }
    ), { numRuns: 50 });
  });

  it('should handle whitespace-only values as empty', () => {
    fc.assert(fc.property(
      environmentArbitrary,
      validEnvConfigArbitrary,
      fc.array(requiredEnvVarsArbitrary, { minLength: 1, maxLength: 4 }),
      fc.string().filter(s => s.trim() === '' && s.length > 0), // whitespace-only strings
      async (environment, envConfig, varsToMakeWhitespace, whitespaceValue) => {
        // Make some required variables whitespace-only
        const configWithWhitespace = { ...envConfig };
        varsToMakeWhitespace.forEach(varName => {
          configWithWhitespace[varName] = whitespaceValue;
        });

        const envFileName = environment === 'development' ? '.env.development' :
                           environment === 'staging' ? '.env.staging' : '.env.production';
        
        const envContent = Object.entries(configWithWhitespace)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        writeFileSync(envFileName, envContent);

        const validator = new DeploymentValidator();
        const result = validator.validateEnvironmentVariables(environment);
        
        // Whitespace-only values should be treated as empty and fail validation
        expect(result).toBe(false);
        expect(validator.errors.length).toBeGreaterThan(0);
      }
    ), { numRuns: 50 });
  });
});