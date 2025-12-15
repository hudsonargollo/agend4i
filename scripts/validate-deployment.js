#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Pre-deployment validation script
 * Validates Wrangler installation, authentication, environment variables, and build configuration
 */

class DeploymentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  /**
   * Check if Wrangler CLI is installed and accessible
   */
  validateWranglerInstallation() {
    this.log('Checking Wrangler installation...');
    
    try {
      const version = execSync('wrangler --version', { encoding: 'utf8', stdio: 'pipe' });
      this.log(`Wrangler version: ${version.trim()}`);
      return true;
    } catch (error) {
      this.addError('Wrangler CLI is not installed or not accessible. Please install it with: npm install -g wrangler');
      return false;
    }
  }

  /**
   * Check Wrangler authentication status
   */
  validateWranglerAuth() {
    this.log('Checking Wrangler authentication...');
    
    try {
      const whoami = execSync('wrangler whoami', { encoding: 'utf8', stdio: 'pipe' });
      this.log(`Authenticated as: ${whoami.trim()}`);
      return true;
    } catch (error) {
      this.addError('Wrangler is not authenticated. Please run: wrangler login');
      return false;
    }
  }

  /**
   * Validate wrangler.toml configuration file
   */
  validateWranglerConfig() {
    this.log('Validating wrangler.toml configuration...');
    
    const wranglerConfigPath = join(projectRoot, 'wrangler.toml');
    
    if (!existsSync(wranglerConfigPath)) {
      this.addError('wrangler.toml configuration file not found');
      return false;
    }

    try {
      const configContent = readFileSync(wranglerConfigPath, 'utf8');
      
      // Check for required configuration sections
      const requiredSections = ['name', 'compatibility_date', 'pages_build_output_dir'];
      const missingConfig = [];
      
      for (const section of requiredSections) {
        if (!configContent.includes(section)) {
          missingConfig.push(section);
        }
      }
      
      if (missingConfig.length > 0) {
        this.addError(`Missing required configuration in wrangler.toml: ${missingConfig.join(', ')}`);
        return false;
      }

      // Check for environment configurations
      if (!configContent.includes('[env.production]')) {
        this.addWarning('Production environment configuration not found in wrangler.toml');
      }
      
      if (!configContent.includes('[env.staging]')) {
        this.addWarning('Staging environment configuration not found in wrangler.toml');
      }

      this.log('wrangler.toml configuration is valid');
      return true;
    } catch (error) {
      this.addError(`Failed to read wrangler.toml: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate required environment variables for the specified environment
   */
  validateEnvironmentVariables(environment = 'production') {
    this.log(`Validating environment variables for ${environment}...`);
    
    const requiredVars = [
      'VITE_SUPABASE_PROJECT_ID',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'VITE_SUPABASE_URL',
      'VITE_APP_DOMAIN',
      'VITE_ENVIRONMENT'
    ];

    // Load environment file for the specified environment
    const envFile = environment === 'development' ? '.env.development' : 
                   environment === 'staging' ? '.env.staging' : 
                   environment === 'preview' ? '.env.preview' :
                   '.env.production';
    
    const envPath = join(projectRoot, envFile);
    
    if (!existsSync(envPath)) {
      this.addError(`Environment file ${envFile} not found`);
      return false;
    }

    try {
      const envContent = readFileSync(envPath, 'utf8');
      const missingVars = [];
      const emptyVars = [];
      
      for (const varName of requiredVars) {
        const regex = new RegExp(`^${varName}=(.*)$`, 'm');
        const match = envContent.match(regex);
        
        if (!match) {
          missingVars.push(varName);
        } else if (!match[1] || match[1].trim() === '') {
          emptyVars.push(varName);
        }
      }
      
      if (missingVars.length > 0) {
        this.addError(`Missing required environment variables: ${missingVars.join(', ')}`);
      }
      
      if (emptyVars.length > 0) {
        this.addError(`Empty environment variables: ${emptyVars.join(', ')}`);
      }
      
      if (missingVars.length === 0 && emptyVars.length === 0) {
        this.log(`All required environment variables are present for ${environment}`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.addError(`Failed to read environment file ${envFile}: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate build configuration compatibility
   */
  validateBuildConfiguration() {
    this.log('Validating build configuration...');
    
    // Check package.json
    const packageJsonPath = join(projectRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      this.addError('package.json not found');
      return false;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Check for required build scripts
      const requiredScripts = ['build', 'build:production', 'build:staging'];
      const missingScripts = [];
      
      for (const script of requiredScripts) {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          missingScripts.push(script);
        }
      }
      
      if (missingScripts.length > 0) {
        this.addError(`Missing required build scripts in package.json: ${missingScripts.join(', ')}`);
        return false;
      }

      // Check for Vite configuration
      const viteConfigPath = join(projectRoot, 'vite.config.ts');
      if (!existsSync(viteConfigPath)) {
        this.addError('vite.config.ts not found');
        return false;
      }

      // Check if wrangler is installed as dependency
      const hasWrangler = (packageJson.dependencies && packageJson.dependencies.wrangler) ||
                         (packageJson.devDependencies && packageJson.devDependencies.wrangler);
      
      if (!hasWrangler) {
        this.addWarning('Wrangler is not listed as a dependency in package.json');
      }

      this.log('Build configuration is compatible');
      return true;
    } catch (error) {
      this.addError(`Failed to validate build configuration: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if build output directory exists and is properly configured
   */
  validateBuildOutput() {
    this.log('Checking build output configuration...');
    
    const distPath = join(projectRoot, 'dist');
    
    // We don't require dist to exist before deployment, but we should check the configuration
    const wranglerConfigPath = join(projectRoot, 'wrangler.toml');
    
    if (existsSync(wranglerConfigPath)) {
      const configContent = readFileSync(wranglerConfigPath, 'utf8');
      
      if (configContent.includes('pages_build_output_dir = "dist"')) {
        this.log('Build output directory is correctly configured as "dist"');
        return true;
      } else {
        this.addWarning('Build output directory configuration may not match expected "dist" directory');
        return true; // This is a warning, not an error
      }
    }
    
    return true;
  }

  /**
   * Run all validation checks
   */
  async validate(environment = 'production') {
    this.log(`Starting pre-deployment validation for ${environment} environment...`);
    
    const checks = [
      () => this.validateWranglerInstallation(),
      () => this.validateWranglerAuth(),
      () => this.validateWranglerConfig(),
      () => this.validateEnvironmentVariables(environment),
      () => this.validateBuildConfiguration(),
      () => this.validateBuildOutput()
    ];

    let allPassed = true;
    
    for (const check of checks) {
      try {
        const result = await check();
        if (!result) {
          allPassed = false;
        }
      } catch (error) {
        this.addError(`Validation check failed: ${error.message}`);
        allPassed = false;
      }
    }

    // Summary
    this.log('\n=== Validation Summary ===');
    
    if (this.errors.length > 0) {
      this.log(`❌ ${this.errors.length} error(s) found:`);
      this.errors.forEach(error => this.log(`  • ${error}`, 'error'));
    }
    
    if (this.warnings.length > 0) {
      this.log(`⚠️  ${this.warnings.length} warning(s):`);
      this.warnings.forEach(warning => this.log(`  • ${warning}`, 'warning'));
    }
    
    if (allPassed && this.errors.length === 0) {
      this.log('✅ All validation checks passed! Ready for deployment.');
      return true;
    } else {
      this.log('❌ Validation failed. Please fix the errors above before deploying.');
      return false;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';
  
  if (!['development', 'staging', 'production', 'preview'].includes(environment)) {
    console.error('❌ Invalid environment. Use: development, staging, production, or preview');
    process.exit(1);
  }

  const validator = new DeploymentValidator();
  const isValid = await validator.validate(environment);
  
  process.exit(isValid ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

export { DeploymentValidator };