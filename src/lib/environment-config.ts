/**
 * Environment Configuration Management
 * Handles environment-specific settings for different deployment targets
 */

export type Environment = 'development' | 'staging' | 'production' | 'preview';

export interface EnvironmentConfig {
  name: Environment;
  domain: string;
  supabaseUrl: string;
  supabaseProjectId: string;
  supabasePublishableKey: string;
  wranglerProjectName: string;
  customDomain?: string;
  routes?: Array<{
    pattern: string;
    customDomain?: boolean;
  }>;
  environmentVariables: Record<string, string>;
}

export interface DeploymentEnvironmentConfig {
  environment: Environment;
  buildCommand: string;
  wranglerEnv?: string;
  deployCommand: string;
  verificationUrl: string;
  requiresCustomDomain: boolean;
}

/**
 * Environment configuration definitions
 */
export const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    name: 'development',
    domain: 'localhost:8080',
    supabaseUrl: 'https://ucmedbalujyknisrnudb.supabase.co',
    supabaseProjectId: 'ucmedbalujyknisrnudb',
    supabasePublishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWp5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y',
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
    supabaseUrl: 'https://ucmedbalujyknisrnudb.supabase.co',
    supabaseProjectId: 'ucmedbalujyknisrnudb',
    supabasePublishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWp5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y',
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
    supabaseUrl: 'https://ucmedbalujyknisrnudb.supabase.co',
    supabaseProjectId: 'ucmedbalujyknisrnudb',
    supabasePublishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWp5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y',
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
      VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWJ5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y'
    }
  },
  preview: {
    name: 'preview',
    domain: 'preview.pages.dev',
    supabaseUrl: 'https://ucmedbalujyknisrnudb.supabase.co',
    supabaseProjectId: 'ucmedbalujyknisrnudb',
    supabasePublishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWp5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y',
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

/**
 * Deployment configuration for each environment
 */
export const DEPLOYMENT_CONFIGS: Record<Environment, DeploymentEnvironmentConfig> = {
  development: {
    environment: 'development',
    buildCommand: 'npm run build:dev',
    deployCommand: 'wrangler pages deploy dist --env development',
    verificationUrl: 'http://localhost:8080',
    requiresCustomDomain: false
  },
  staging: {
    environment: 'staging',
    buildCommand: 'npm run build:staging',
    wranglerEnv: 'staging',
    deployCommand: 'wrangler pages deploy dist --env staging',
    verificationUrl: 'https://staging.agendai.clubemkt.digital',
    requiresCustomDomain: true
  },
  production: {
    environment: 'production',
    buildCommand: 'npm run build:production',
    wranglerEnv: 'production',
    deployCommand: 'wrangler pages deploy dist --env production',
    verificationUrl: 'https://agendai.clubemkt.digital',
    requiresCustomDomain: true
  },
  preview: {
    environment: 'preview',
    buildCommand: 'npm run build',
    deployCommand: 'wrangler pages deploy dist',
    verificationUrl: '', // Will be determined after deployment
    requiresCustomDomain: false
  }
};

/**
 * Get environment configuration by name
 */
export function getEnvironmentConfig(environment: Environment): EnvironmentConfig {
  const config = ENVIRONMENT_CONFIGS[environment];
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  return config;
}

/**
 * Get deployment configuration by environment
 */
export function getDeploymentConfig(environment: Environment): DeploymentEnvironmentConfig {
  const config = DEPLOYMENT_CONFIGS[environment];
  if (!config) {
    throw new Error(`Unknown deployment environment: ${environment}`);
  }
  return config;
}

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(environment: Environment): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const config = getEnvironmentConfig(environment);
    
    // Check required fields
    if (!config.domain) {
      errors.push('Domain is required');
    }
    
    if (!config.supabaseUrl) {
      errors.push('Supabase URL is required');
    }
    
    if (!config.supabaseProjectId) {
      errors.push('Supabase Project ID is required');
    }
    
    if (!config.supabasePublishableKey) {
      errors.push('Supabase Publishable Key is required');
    }
    
    if (!config.wranglerProjectName) {
      errors.push('Wrangler project name is required');
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

    // Check environment variables
    const requiredEnvVars = [
      'VITE_ENVIRONMENT',
      'VITE_APP_DOMAIN',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PROJECT_ID',
      'VITE_SUPABASE_PUBLISHABLE_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!config.environmentVariables[envVar]) {
        errors.push(`Missing environment variable: ${envVar}`);
      }
    }

  } catch (error) {
    errors.push(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get all supported environments
 */
export function getSupportedEnvironments(): Environment[] {
  return Object.keys(ENVIRONMENT_CONFIGS) as Environment[];
}

/**
 * Check if environment is valid
 */
export function isValidEnvironment(env: string): env is Environment {
  return getSupportedEnvironments().includes(env as Environment);
}

/**
 * Generate environment-specific wrangler configuration
 */
export function generateWranglerEnvConfig(environment: Environment): string {
  const config = getEnvironmentConfig(environment);
  
  let wranglerConfig = `[env.${environment}]\n`;
  wranglerConfig += `name = "${config.wranglerProjectName}"\n`;
  
  if (config.routes && config.routes.length > 0) {
    wranglerConfig += 'routes = [\n';
    for (const route of config.routes) {
      wranglerConfig += `  { pattern = "${route.pattern}"`;
      if (route.customDomain) {
        wranglerConfig += ', custom_domain = true';
      }
      wranglerConfig += ' },\n';
    }
    wranglerConfig += ']\n';
  }
  
  wranglerConfig += '\n[env.' + environment + '.vars]\n';
  for (const [key, value] of Object.entries(config.environmentVariables)) {
    wranglerConfig += `${key} = "${value}"\n`;
  }
  
  return wranglerConfig;
}

/**
 * Generate environment file content
 */
export function generateEnvFileContent(environment: Environment): string {
  const config = getEnvironmentConfig(environment);
  
  let envContent = `# ${environment.charAt(0).toUpperCase() + environment.slice(1)} Environment Configuration\n`;
  envContent += `# This file is used when deploying to ${environment} environment\n\n`;
  
  for (const [key, value] of Object.entries(config.environmentVariables)) {
    envContent += `${key}=${value}\n`;
  }
  
  return envContent;
}

/**
 * Get environment from process.env or default
 */
export function getCurrentEnvironment(): Environment {
  const env = process.env.VITE_ENVIRONMENT || process.env.NODE_ENV || 'development';
  
  if (isValidEnvironment(env)) {
    return env;
  }
  
  // Default to development if environment is not recognized
  return 'development';
}

/**
 * Load environment configuration from process.env
 */
export function loadEnvironmentFromProcess(): Partial<EnvironmentConfig> {
  return {
    name: getCurrentEnvironment(),
    domain: process.env.VITE_APP_DOMAIN || 'localhost:8080',
    supabaseUrl: process.env.VITE_SUPABASE_URL || '',
    supabaseProjectId: process.env.VITE_SUPABASE_PROJECT_ID || '',
    supabasePublishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    environmentVariables: {
      VITE_ENVIRONMENT: process.env.VITE_ENVIRONMENT || 'development',
      VITE_APP_DOMAIN: process.env.VITE_APP_DOMAIN || 'localhost:8080',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
      VITE_SUPABASE_PROJECT_ID: process.env.VITE_SUPABASE_PROJECT_ID || '',
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
    }
  };
}