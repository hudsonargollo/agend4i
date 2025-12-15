/**
 * Wrangler Configuration Manager
 * Handles generation and management of environment-specific wrangler.toml configurations
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { 
  Environment, 
  getEnvironmentConfig, 
  getDeploymentConfig,
  getSupportedEnvironments,
  isValidEnvironment
} from './environment-config';

export interface WranglerConfig {
  name: string;
  compatibilityDate: string;
  pagesBuildOutputDir: string;
  environments: Record<string, WranglerEnvironmentConfig>;
  vars: Record<string, string>;
  redirects: WranglerRedirect[];
}

export interface WranglerEnvironmentConfig {
  name: string;
  routes?: WranglerRoute[];
  vars: Record<string, string>;
}

export interface WranglerRoute {
  pattern: string;
  customDomain?: boolean;
}

export interface WranglerRedirect {
  from: string;
  to: string;
  status: number;
}

export class WranglerConfigManager {
  private projectRoot: string;
  private configPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = join(projectRoot, 'wrangler.toml');
  }

  /**
   * Generate complete wrangler.toml configuration with all environments
   */
  generateCompleteConfig(): WranglerConfig {
    const config: WranglerConfig = {
      name: 'agendai-saas',
      compatibilityDate: '2024-12-15',
      pagesBuildOutputDir: 'dist',
      environments: {},
      vars: {
        VITE_ENVIRONMENT: 'production'
      },
      redirects: [
        {
          from: '/*',
          to: '/index.html',
          status: 200
        }
      ]
    };

    // Add environment-specific configurations
    const environments = getSupportedEnvironments();
    for (const env of environments) {
      if (env === 'development') continue; // Skip development for wrangler config
      
      const envConfig = getEnvironmentConfig(env);
      config.environments[env] = {
        name: envConfig.wranglerProjectName,
        routes: envConfig.routes,
        vars: envConfig.environmentVariables
      };
    }

    return config;
  }

  /**
   * Convert WranglerConfig to TOML string
   */
  configToToml(config: WranglerConfig): string {
    let toml = '';
    
    // Basic configuration
    toml += `name = "${config.name}"\n`;
    toml += `compatibility_date = "${config.compatibilityDate}"\n\n`;
    
    // Pages configuration
    toml += '# Pages configuration\n';
    toml += `pages_build_output_dir = "${config.pagesBuildOutputDir}"\n\n`;
    
    // SPA routing configuration
    toml += '# SPA routing configuration - serve index.html for all routes\n';
    for (const redirect of config.redirects) {
      toml += '[[redirects]]\n';
      toml += `from = "${redirect.from}"\n`;
      toml += `to = "${redirect.to}"\n`;
      toml += `status = ${redirect.status}\n\n`;
    }
    
    // Global environment variables
    toml += '# Environment variables (these will be set in Cloudflare Pages dashboard)\n';
    toml += '[vars]\n';
    for (const [key, value] of Object.entries(config.vars)) {
      toml += `${key} = "${value}"\n`;
    }
    toml += '\n';
    
    // Environment-specific configurations
    for (const [envName, envConfig] of Object.entries(config.environments)) {
      toml += `[env.${envName}]\n`;
      toml += `name = "${envConfig.name}"\n`;
      
      if (envConfig.routes && envConfig.routes.length > 0) {
        toml += 'routes = [\n';
        for (const route of envConfig.routes) {
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
      for (const [key, value] of Object.entries(envConfig.vars)) {
        toml += `${key} = "${value}"\n`;
      }
      toml += '\n';
    }
    
    return toml;
  }

  /**
   * Write wrangler.toml configuration to file
   */
  writeConfig(config?: WranglerConfig): void {
    const configToWrite = config || this.generateCompleteConfig();
    const tomlContent = this.configToToml(configToWrite);
    
    writeFileSync(this.configPath, tomlContent, 'utf8');
  }

  /**
   * Read existing wrangler.toml configuration
   */
  readConfig(): string | null {
    if (!existsSync(this.configPath)) {
      return null;
    }
    
    return readFileSync(this.configPath, 'utf8');
  }

  /**
   * Backup existing configuration
   */
  backupConfig(): string | null {
    const existingConfig = this.readConfig();
    if (existingConfig) {
      const backupPath = `${this.configPath}.backup.${Date.now()}`;
      writeFileSync(backupPath, existingConfig, 'utf8');
      return backupPath;
    }
    return null;
  }

  /**
   * Update configuration for specific environment
   */
  updateEnvironmentConfig(environment: Environment): void {
    if (!isValidEnvironment(environment)) {
      throw new Error(`Invalid environment: ${environment}`);
    }

    const config = this.generateCompleteConfig();
    this.writeConfig(config);
  }

  /**
   * Validate wrangler configuration for environment
   */
  validateConfigForEnvironment(environment: Environment): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const config = this.generateCompleteConfig();
      
      // Check if environment exists in config
      if (environment !== 'development' && !config.environments[environment]) {
        errors.push(`Environment ${environment} not found in configuration`);
        return { valid: false, errors, warnings };
      }

      // Validate environment-specific configuration
      if (environment !== 'development') {
        const envConfig = config.environments[environment];
        
        if (!envConfig.name) {
          errors.push(`Missing project name for ${environment} environment`);
        }

        // Check for custom domain configuration in production/staging
        if ((environment === 'production' || environment === 'staging')) {
          if (!envConfig.routes || envConfig.routes.length === 0) {
            warnings.push(`No custom domain routes configured for ${environment}`);
          } else {
            const hasCustomDomain = envConfig.routes.some(route => route.customDomain);
            if (!hasCustomDomain) {
              warnings.push(`No custom domain routes found for ${environment}`);
            }
          }
        }

        // Validate environment variables
        const requiredVars = [
          'VITE_ENVIRONMENT',
          'VITE_APP_DOMAIN',
          'VITE_SUPABASE_URL',
          'VITE_SUPABASE_PROJECT_ID',
          'VITE_SUPABASE_PUBLISHABLE_KEY'
        ];

        for (const varName of requiredVars) {
          if (!envConfig.vars[varName]) {
            errors.push(`Missing environment variable ${varName} for ${environment}`);
          }
        }
      }

      // Validate global configuration
      if (!config.name) {
        errors.push('Missing project name in global configuration');
      }

      if (!config.compatibilityDate) {
        errors.push('Missing compatibility date in global configuration');
      }

      if (!config.pagesBuildOutputDir) {
        errors.push('Missing pages build output directory configuration');
      }

      // Check for SPA routing configuration
      const hasSpaRouting = config.redirects.some(
        redirect => redirect.from === '/*' && redirect.to === '/index.html' && redirect.status === 200
      );
      
      if (!hasSpaRouting) {
        warnings.push('SPA routing configuration not found - may cause 404 errors for client-side routes');
      }

    } catch (error) {
      errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate environment-specific deployment command
   */
  getDeploymentCommand(environment: Environment): string {
    const deployConfig = getDeploymentConfig(environment);
    return deployConfig.deployCommand;
  }

  /**
   * Get project name for environment
   */
  getProjectName(environment: Environment): string {
    const envConfig = getEnvironmentConfig(environment);
    return envConfig.wranglerProjectName;
  }

  /**
   * Check if environment requires custom domain
   */
  requiresCustomDomain(environment: Environment): boolean {
    const deployConfig = getDeploymentConfig(environment);
    return deployConfig.requiresCustomDomain;
  }

  /**
   * Get verification URL for environment
   */
  getVerificationUrl(environment: Environment): string {
    const deployConfig = getDeploymentConfig(environment);
    return deployConfig.verificationUrl;
  }

  /**
   * Initialize wrangler configuration for project
   */
  initializeConfig(): void {
    // Backup existing configuration if it exists
    const backupPath = this.backupConfig();
    if (backupPath) {
      console.log(`Existing configuration backed up to: ${backupPath}`);
    }

    // Generate and write new configuration
    const config = this.generateCompleteConfig();
    this.writeConfig(config);
    
    console.log('Wrangler configuration initialized successfully');
  }

  /**
   * List all configured environments
   */
  listEnvironments(): Environment[] {
    return getSupportedEnvironments().filter(env => env !== 'development');
  }

  /**
   * Get configuration summary
   */
  getConfigSummary(): {
    projectName: string;
    environments: Array<{
      name: Environment;
      projectName: string;
      domain: string;
      hasCustomDomain: boolean;
      verificationUrl: string;
    }>;
  } {
    const config = this.generateCompleteConfig();
    
    return {
      projectName: config.name,
      environments: this.listEnvironments().map(env => {
        const envConfig = getEnvironmentConfig(env);
        const deployConfig = getDeploymentConfig(env);
        
        return {
          name: env,
          projectName: envConfig.wranglerProjectName,
          domain: envConfig.domain,
          hasCustomDomain: !!envConfig.customDomain,
          verificationUrl: deployConfig.verificationUrl
        };
      })
    };
  }
}