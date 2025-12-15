#!/usr/bin/env node

/**
 * GitHub Secrets Validation Script
 * 
 * This script helps validate that GitHub Secrets are properly configured
 * for secure deployment to Cloudflare Pages.
 * 
 * Usage:
 *   node scripts/validate-github-secrets.js [environment]
 * 
 * Environment can be: production, staging, preview, or all (default)
 */

const fs = require('fs');
const path = require('path');

// Define required secrets for each environment
const REQUIRED_SECRETS = {
  core: [
    'CLOUDFLARE_API_TOKEN',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PROJECT_ID',
    'VITE_SUPABASE_PUBLISHABLE_KEY'
  ],
  production: [
    'CLOUDFLARE_API_TOKEN_PROD',
    'VITE_SUPABASE_URL_PROD',
    'VITE_SUPABASE_PROJECT_ID_PROD',
    'VITE_SUPABASE_PUBLISHABLE_KEY_PROD'
  ],
  staging: [
    'CLOUDFLARE_API_TOKEN_STAGING',
    'VITE_SUPABASE_URL_STAGING',
    'VITE_SUPABASE_PROJECT_ID_STAGING',
    'VITE_SUPABASE_PUBLISHABLE_KEY_STAGING'
  ]
};

// Security validation patterns
const SECURITY_PATTERNS = {
  CLOUDFLARE_API_TOKEN: /^[a-zA-Z0-9_-]{40,}$/,
  VITE_SUPABASE_URL: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/,
  VITE_SUPABASE_PROJECT_ID: /^[a-zA-Z0-9]{20}$/,
  VITE_SUPABASE_PUBLISHABLE_KEY: /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/
};

class GitHubSecretsValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validatedSecrets = new Set();
  }

  /**
   * Validate secrets for a specific environment
   */
  validateEnvironment(environment) {
    console.log(`\n🔍 Validating secrets for ${environment} environment...`);
    
    const environmentSecrets = REQUIRED_SECRETS[environment] || [];
    const coreSecrets = REQUIRED_SECRETS.core;
    
    // For environment-specific validation, check both specific and fallback secrets
    if (environment === 'production' || environment === 'staging') {
      this.validateEnvironmentSpecificSecrets(environment, environmentSecrets, coreSecrets);
    } else {
      // For core/preview, just validate core secrets
      this.validateCoreSecrets(coreSecrets);
    }
  }

  /**
   * Validate environment-specific secrets with fallback to core secrets
   */
  validateEnvironmentSpecificSecrets(environment, environmentSecrets, coreSecrets) {
    for (let i = 0; i < environmentSecrets.length; i++) {
      const envSecret = environmentSecrets[i];
      const coreSecret = coreSecrets[i];
      
      const hasEnvSecret = this.checkSecretExists(envSecret);
      const hasCoreSecret = this.checkSecretExists(coreSecret);
      
      if (hasEnvSecret) {
        console.log(`  ✅ ${envSecret} (environment-specific)`);
        this.validateSecretFormat(envSecret);
      } else if (hasCoreSecret) {
        console.log(`  ⚠️  ${coreSecret} (fallback - consider adding ${envSecret})`);
        this.warnings.push(`Consider adding environment-specific secret: ${envSecret}`);
        this.validateSecretFormat(coreSecret);
      } else {
        console.log(`  ❌ Missing both ${envSecret} and ${coreSecret}`);
        this.errors.push(`Missing required secret: ${envSecret} or ${coreSecret}`);
      }
    }
  }

  /**
   * Validate core secrets only
   */
  validateCoreSecrets(coreSecrets) {
    for (const secret of coreSecrets) {
      if (this.checkSecretExists(secret)) {
        console.log(`  ✅ ${secret}`);
        this.validateSecretFormat(secret);
      } else {
        console.log(`  ❌ ${secret}`);
        this.errors.push(`Missing required secret: ${secret}`);
      }
    }
  }

  /**
   * Check if a secret exists (simulated - in real GitHub Actions this would check actual secrets)
   */
  checkSecretExists(secretName) {
    // In a real GitHub Actions environment, this would check process.env
    // For this validation script, we simulate by checking if it would be available
    
    // Check if secret is already validated to avoid duplicates
    if (this.validatedSecrets.has(secretName)) {
      return true;
    }
    
    // Simulate secret existence based on environment variables or configuration
    const value = process.env[secretName];
    if (value && value.trim() !== '') {
      this.validatedSecrets.add(secretName);
      return true;
    }
    
    return false;
  }

  /**
   * Validate secret format for security
   */
  validateSecretFormat(secretName) {
    const value = process.env[secretName];
    if (!value) return;

    // Get the base secret name (remove environment suffix)
    const baseSecretName = secretName.replace(/_PROD$|_STAGING$/, '');
    const pattern = SECURITY_PATTERNS[baseSecretName];
    
    if (pattern && !pattern.test(value)) {
      this.warnings.push(`Secret ${secretName} format may be invalid`);
      console.log(`    ⚠️  Format validation failed for ${secretName}`);
    }
  }

  /**
   * Generate GitHub Secrets setup instructions
   */
  generateSetupInstructions() {
    console.log('\n📋 GitHub Secrets Setup Instructions:');
    console.log('\n1. Go to your GitHub repository');
    console.log('2. Navigate to Settings > Secrets and variables > Actions');
    console.log('3. Click "New repository secret" for each required secret:');
    
    console.log('\n   Core Secrets (Required):');
    for (const secret of REQUIRED_SECRETS.core) {
      console.log(`   - ${secret}`);
    }
    
    console.log('\n   Production Secrets (Recommended):');
    for (const secret of REQUIRED_SECRETS.production) {
      console.log(`   - ${secret}`);
    }
    
    console.log('\n   Staging Secrets (Recommended):');
    for (const secret of REQUIRED_SECRETS.staging) {
      console.log(`   - ${secret}`);
    }
    
    console.log('\n📖 For detailed setup instructions, see: docs/GITHUB_SECRETS_SETUP.md');
  }

  /**
   * Validate Cloudflare API token permissions (simulated)
   */
  validateCloudflareTokenPermissions() {
    console.log('\n🔐 Cloudflare API Token Security Checklist:');
    console.log('   □ Token has Cloudflare Pages:Edit permission');
    console.log('   □ Token is limited to specific account');
    console.log('   □ Token is limited to agendai.clubemkt.digital zone');
    console.log('   □ Token has expiration date set');
    console.log('   □ Token is not shared or exposed in code');
    console.log('\n   ⚠️  Verify these manually in Cloudflare Dashboard');
  }

  /**
   * Validate Supabase configuration security
   */
  validateSupabaseConfiguration() {
    console.log('\n🗄️  Supabase Configuration Security Checklist:');
    console.log('   □ Using publishable key (not service role key)');
    console.log('   □ Row Level Security (RLS) is enabled');
    console.log('   □ API keys are not expired');
    console.log('   □ Different projects for production/staging (recommended)');
    console.log('   □ Database access is properly restricted');
    console.log('\n   ⚠️  Verify these manually in Supabase Dashboard');
  }

  /**
   * Run complete validation
   */
  async validate(environment = 'all') {
    console.log('🔒 GitHub Secrets Validation for Cloudflare Pages Deployment');
    console.log('=' .repeat(60));
    
    if (environment === 'all') {
      this.validateEnvironment('core');
      this.validateEnvironment('production');
      this.validateEnvironment('staging');
    } else {
      this.validateEnvironment(environment);
    }
    
    // Additional security validations
    this.validateCloudflareTokenPermissions();
    this.validateSupabaseConfiguration();
    
    // Summary
    console.log('\n📊 Validation Summary:');
    console.log('=' .repeat(30));
    
    if (this.errors.length === 0) {
      console.log('✅ All required secrets are configured');
    } else {
      console.log(`❌ ${this.errors.length} error(s) found:`);
      for (const error of this.errors) {
        console.log(`   - ${error}`);
      }
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  ${this.warnings.length} warning(s):`);
      for (const warning of this.warnings) {
        console.log(`   - ${warning}`);
      }
    }
    
    // Generate setup instructions if there are errors
    if (this.errors.length > 0) {
      this.generateSetupInstructions();
    }
    
    console.log('\n🚀 Next Steps:');
    if (this.errors.length === 0) {
      console.log('   - Your secrets configuration looks good!');
      console.log('   - Test deployment by pushing to main or develop branch');
      console.log('   - Monitor deployment logs for any issues');
    } else {
      console.log('   - Add missing secrets to GitHub repository');
      console.log('   - Follow the setup instructions above');
      console.log('   - Re-run this validation script');
      console.log('   - Test deployment after fixing issues');
    }
    
    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'all';
  
  const validEnvironments = ['all', 'core', 'production', 'staging', 'preview'];
  if (!validEnvironments.includes(environment)) {
    console.error(`❌ Invalid environment: ${environment}`);
    console.error(`   Valid options: ${validEnvironments.join(', ')}`);
    process.exit(1);
  }
  
  const validator = new GitHubSecretsValidator();
  const result = await validator.validate(environment);
  
  // Exit with error code if validation failed
  process.exit(result.success ? 0 : 1);
}

// Export for testing
module.exports = { GitHubSecretsValidator, REQUIRED_SECRETS, SECURITY_PATTERNS };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });
}