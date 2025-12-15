#!/usr/bin/env node

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Environment Configuration Manager
 * Manages environment-specific configurations for different deployment targets
 */

class EnvironmentManager {
  constructor() {
    this.projectRoot = projectRoot;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Environment configurations
   */
  getEnvironmentConfigs() {
    return {
      development: {
        name: 'development',
        domain: 'localhost:8080',
        wranglerProjectName: 'agendai-saas-dev',
        environmentVariables: {
          VITE_ENVIRONMENT: 'development',
          VITE_APP_DOMAIN: 'localhost:8080',
          VITE_SUPABASE_URL: 'https://ucmedbalujyknisrnudb.supabase.co',
          VITE_SUPABASE_PROJECT_ID: 'ucmedbalujyknisrnudb',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWp5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y'
        }
      },
      staging: {
        name: 'staging',
        domain: 'staging.agendai.clubemkt.digital',
        wranglerProjectName: 'agendai-saas-staging',
        customDomain: 'staging.agendai.clubemkt.digital',
        routes: [
          { pattern: 'staging.agendai.clubemkt.digital', customDomain: true },
          { pattern: 'staging.agendai.clubemkt.digital/*', customDomain: true }
        ],
        environmentVariables: {
          VITE_ENVIRONMENT: 'staging',
          VITE_APP_DOMAIN: 'staging.agendai.clubemkt.digital',
          VITE_SUPABASE_URL: 'https://ucmedbalujyknisrnudb.supabase.co',
          VITE_SUPABASE_PROJECT_ID: 'ucmedbalujyknisrnudb',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWp5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y'
        }
      },
      production: {
        name: 'production',
        domain: 'agendai.clubemkt.digital',
        wranglerProjectName: 'agendai-saas-production',
        customDomain: 'agendai.clubemkt.digital',
        routes: [
          { pattern: 'agendai.clubemkt.digital', customDomain: true },
          { pattern: 'agendai.clubemkt.digital/*', customDomain: true }
        ],
        environmentVariables: {
          VITE_ENVIRONMENT: 'production',
          VITE_APP_DOMAIN: 'agendai.clubemkt.digital',
          VITE_SUPABASE_URL: 'https://ucmedbalujyknisrnudb.supabase.co',
          VITE_SUPABASE_PROJECT_ID: 'ucmedbalujyknisrnudb',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWp5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y'
        }
      },
      preview: {
        name: 'preview',
        domain: 'preview.pages.dev',
        wranglerProjectName: 'agendai-saas-preview',
        environmentVariables: {
          VITE_ENVIRONMENT: 'preview',
          VITE_APP_DOMAIN: 'preview.pages.dev',
          VITE_SUPABASE_URL: 'https://ucmedbalujyknisrnudb.supabase.co',
          VITE_SUPABASE_PROJECT_ID: 'ucmedbalujyknisrnudb',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWp5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y'
        }
      }
    };
  }

  /**
   * Generate environment file content
   */
  generateEnvFileContent(environment) {
    const configs = this.getEnvironmentConfigs();
    const config = configs[environment];
    
    if (!config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    let content = `# ${environment.charAt(0).toUpperCase() + environment.slice(1)} Environment Configuration\n`;
    content += `# This file is used when deploying to ${environment} environment\n\n`;
    
    for (const [key, value] of Object.entries(config.environmentVariables)) {
      content += `${key}=${value}\n`;
    }
    
    return content;
  }

  /**
   * Generate wrangler.toml configuration
   */
  generateWranglerConfig() {
    const configs = this.getEnvironmentConfigs();
    
    let toml = 'name = "agendai-saas"\n';
    toml += 'compatibility_date = "2024-12-15"\n\n';
    
    // Pages configuration
    toml += '# Pages configuration\n';
    toml += 'pages_build_output_dir = "dist"\n\n';
    
    // SPA routing configuration
    toml += '# SPA routing configuration - serve index.html for all routes\n';
    toml += '[[redirects]]\n';
    toml += 'from = "/*"\n';
    toml += 'to = "/index.html"\n';
    toml += 'status = 200\n\n';
    
    // Global environment variables
    toml += '# Environment variables (these will be set in Cloudflare Pages dashboard)\n';
    toml += '[vars]\n';
    toml += 'VITE_ENVIRONMENT = "production"\n\n';
    
    // Environment-specific configurations
    for (const [envName, config] of Object.entries(configs)) {
      if (envName === 'development') continue; // Skip development for wrangler config
      
      toml += `[env.${envName}]\n`;
      toml += `name = "${config.wranglerProjectName}"\n`;
      
      if (config.routes && config.routes.length > 0) {
        toml += 'routes = [\n';
        for (const route of config.routes) {
          toml += `  { pattern = "${route.pattern}"`;
          if (route.customDomain) {
            toml += ', custom_domain = true';
          }
          toml += ' },\n';
        }
        toml += ']\n';
      }
      
      toml += '\n';
      toml += `[env.${envName}.vars]\n`;
      for (const [key, value] of Object.entries(config.environmentVariables)) {
        toml += `${key} = "${value}"\n`;
      }
      toml += '\n';
    }
    
    return toml;
  }

  /**
   * Create environment files
   */
  createEnvironmentFiles() {
    this.log('Creating environment-specific configuration files...');
    
    const environments = ['development', 'staging', 'production'];
    
    for (const env of environments) {
      const filename = env === 'development' ? '.env.development' : 
                     env === 'staging' ? '.env.staging' : 
                     '.env.production';
      
      const filepath = join(this.projectRoot, filename);
      const content = this.generateEnvFileContent(env);
      
      writeFileSync(filepath, content, 'utf8');
      this.log(`Created ${filename}`, 'success');
    }
  }

  /**
   * Update wrangler.toml configuration
   */
  updateWranglerConfig() {
    this.log('Updating wrangler.toml configuration...');
    
    const wranglerPath = join(this.projectRoot, 'wrangler.toml');
    const content = this.generateWranglerConfig();
    
    // Backup existing file if it exists
    if (existsSync(wranglerPath)) {
      const backupPath = `${wranglerPath}.backup.${Date.now()}`;
      const { copyFileSync } = await import('fs');
      copyFileSync(wranglerPath, backupPath);
      this.log(`Existing wrangler.toml backed up to ${backupPath}`, 'info');
    }
    
    writeFileSync(wranglerPath, content, 'utf8');
    this.log('Updated wrangler.toml', 'success');
  }

  /**
   * Validate environment configuration
   */
  validateEnvironment(environment) {
    this.log(`Validating ${environment} environment configuration...`);
    
    const configs = this.getEnvironmentConfigs();
    const config = configs[environment];
    
    if (!config) {
      this.log(`Unknown environment: ${environment}`, 'error');
      return false;
    }
    
    const errors = [];
    const warnings = [];
    
    // Check required fields
    if (!config.domain) {
      errors.push('Domain is required');
    }
    
    if (!config.wranglerProjectName) {
      errors.push('Wrangler project name is required');
    }
    
    // Check environment variables
    const requiredVars = [
      'VITE_ENVIRONMENT',
      'VITE_APP_DOMAIN',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PROJECT_ID',
      'VITE_SUPABASE_PUBLISHABLE_KEY'
    ];
    
    for (const varName of requiredVars) {
      if (!config.environmentVariables[varName]) {
        errors.push(`Missing environment variable: ${varName}`);
      }
    }
    
    // Environment-specific validations
    if (environment === 'production' || environment === 'staging') {
      if (!config.customDomain) {
        warnings.push(`Custom domain not configured for ${environment}`);
      }
      
      if (!config.routes || config.routes.length === 0) {
        warnings.push(`No routes configured for ${environment}`);
      }
    }
    
    // Report results
    if (errors.length > 0) {
      this.log(`❌ ${errors.length} error(s) found:`, 'error');
      errors.forEach(error => this.log(`  • ${error}`, 'error'));
    }
    
    if (warnings.length > 0) {
      this.log(`⚠️  ${warnings.length} warning(s):`, 'warning');
      warnings.forEach(warning => this.log(`  • ${warning}`, 'warning'));
    }
    
    if (errors.length === 0) {
      this.log(`✅ ${environment} environment configuration is valid`, 'success');
      return true;
    }
    
    return false;
  }

  /**
   * List all environments
   */
  listEnvironments() {
    this.log('Available environments:');
    
    const configs = this.getEnvironmentConfigs();
    
    for (const [envName, config] of Object.entries(configs)) {
      console.log(`\n📋 ${envName.toUpperCase()}`);
      console.log(`   Domain: ${config.domain}`);
      console.log(`   Wrangler Project: ${config.wranglerProjectName}`);
      if (config.customDomain) {
        console.log(`   Custom Domain: ${config.customDomain}`);
      }
      
      const isValid = this.validateEnvironment(envName);
      console.log(`   Status: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }
  }

  /**
   * Initialize all environment configurations
   */
  initializeAll() {
    this.log('Initializing environment-specific configurations...');
    
    try {
      // Create environment files
      this.createEnvironmentFiles();
      
      // Update wrangler configuration
      this.updateWranglerConfig();
      
      // Validate all environments
      const environments = ['development', 'staging', 'production', 'preview'];
      let allValid = true;
      
      for (const env of environments) {
        const isValid = this.validateEnvironment(env);
        if (!isValid) {
          allValid = false;
        }
      }
      
      if (allValid) {
        this.log('🎉 All environment configurations initialized successfully!', 'success');
      } else {
        this.log('⚠️  Some environment configurations have issues. Please review the warnings above.', 'warning');
      }
      
    } catch (error) {
      this.log(`Failed to initialize configurations: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Show configuration summary
   */
  showSummary() {
    this.log('Environment Configuration Summary:');
    
    const configs = this.getEnvironmentConfigs();
    
    console.log('\n📊 DEPLOYMENT TARGETS:');
    console.log('┌─────────────┬─────────────────────────────────────┬──────────────────────────────┐');
    console.log('│ Environment │ Domain                              │ Wrangler Project             │');
    console.log('├─────────────┼─────────────────────────────────────┼──────────────────────────────┤');
    
    for (const [envName, config] of Object.entries(configs)) {
      const env = envName.padEnd(11);
      const domain = config.domain.padEnd(35);
      const project = config.wranglerProjectName.padEnd(28);
      console.log(`│ ${env} │ ${domain} │ ${project} │`);
    }
    
    console.log('└─────────────┴─────────────────────────────────────┴──────────────────────────────┘');
    
    console.log('\n🔧 DEPLOYMENT COMMANDS:');
    console.log('  npm run deploy:staging     - Deploy to staging environment');
    console.log('  npm run deploy:production  - Deploy to production environment');
    console.log('  npm run deploy:preview     - Deploy preview build');
    
    console.log('\n🌐 CUSTOM DOMAINS:');
    console.log('  Production: agendai.clubemkt.digital');
    console.log('  Staging:    staging.agendai.clubemkt.digital');
    
    console.log('\n📁 CONFIGURATION FILES:');
    console.log('  .env.development  - Development environment variables');
    console.log('  .env.staging      - Staging environment variables');
    console.log('  .env.production   - Production environment variables');
    console.log('  wrangler.toml     - Cloudflare Pages configuration');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const environment = args[1];
  
  const manager = new EnvironmentManager();
  
  try {
    switch (command) {
      case 'init':
        manager.initializeAll();
        break;
        
      case 'list':
        manager.listEnvironments();
        break;
        
      case 'validate':
        if (!environment) {
          console.error('❌ Environment name required. Use: development, staging, production, or preview');
          process.exit(1);
        }
        const isValid = manager.validateEnvironment(environment);
        process.exit(isValid ? 0 : 1);
        break;
        
      case 'create-env':
        manager.createEnvironmentFiles();
        break;
        
      case 'update-wrangler':
        manager.updateWranglerConfig();
        break;
        
      case 'summary':
        manager.showSummary();
        break;
        
      case 'help':
      default:
        console.log('Environment Configuration Manager');
        console.log('');
        console.log('Usage: node scripts/environment-manager.js <command> [environment]');
        console.log('');
        console.log('Commands:');
        console.log('  init              Initialize all environment configurations');
        console.log('  list              List all available environments');
        console.log('  validate <env>    Validate specific environment configuration');
        console.log('  create-env        Create environment files (.env.*)');
        console.log('  update-wrangler   Update wrangler.toml configuration');
        console.log('  summary           Show configuration summary');
        console.log('  help              Show this help message');
        console.log('');
        console.log('Environments: development, staging, production, preview');
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Environment manager failed:', error);
    process.exit(1);
  });
}

export { EnvironmentManager };