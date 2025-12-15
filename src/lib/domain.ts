/**
 * Domain Configuration Service
 * 
 * Provides environment-aware domain resolution and URL generation utilities
 * for the SaaS multi-tenancy application.
 */

export type Environment = 'development' | 'staging' | 'production';

export interface DomainConfig {
  environment: Environment;
  baseDomain: string;
  protocol: 'http' | 'https';
  port?: number;
}

export interface URLGenerationOptions {
  tenant?: string;
  path?: string;
  admin?: boolean;
  external?: boolean;
}

export interface EnvironmentContext {
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  currentDomain: string;
  baseURL: string;
}

export interface EnvironmentDetector {
  isDev: boolean;
  hostname: string;
  viteEnvironment?: string;
  viteAppDomain?: string;
}

/**
 * Create default environment detector using actual runtime values
 */
function createDefaultEnvironmentDetector(): EnvironmentDetector {
  return {
    isDev: import.meta.env.DEV,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    viteEnvironment: import.meta.env.VITE_ENVIRONMENT,
    viteAppDomain: import.meta.env.VITE_APP_DOMAIN,
  };
}

/**
 * Detect the current environment based on various indicators
 */
export function detectEnvironment(detector?: EnvironmentDetector): Environment {
  const env = detector || createDefaultEnvironmentDetector();
  
  // Check if we're in development mode (Vite sets NODE_ENV or we can detect localhost)
  if (env.isDev || env.hostname === 'localhost') {
    return 'development';
  }
  
  // Check for staging environment indicators
  if (env.hostname.includes('staging') || env.viteEnvironment === 'staging') {
    return 'staging';
  }
  
  // Default to production
  return 'production';
}

/**
 * Get domain configuration for the current environment
 */
export function getDomainConfig(detector?: EnvironmentDetector): DomainConfig {
  const env = detector || createDefaultEnvironmentDetector();
  const environment = detectEnvironment(detector);
  
  // Check for environment variable override first (highest priority)
  if (env.viteAppDomain) {
    // Parse domain and port from viteAppDomain if it includes a port
    const domainParts = env.viteAppDomain.split(':');
    const baseDomain = domainParts[0];
    const port = domainParts.length > 1 ? parseInt(domainParts[1], 10) : undefined;
    
    return {
      environment,
      baseDomain,
      protocol: env.viteAppDomain.includes('localhost') ? 'http' : 'https',
      port,
    };
  }
  
  // Environment-specific defaults
  switch (environment) {
    case 'development':
      return {
        environment: 'development',
        baseDomain: 'localhost',
        protocol: 'http',
        port: 8080,
      };
    
    case 'staging':
      return {
        environment: 'staging',
        baseDomain: 'staging.agendai.clubemkt.digital',
        protocol: 'https',
      };
    
    case 'production':
    default:
      return {
        environment: 'production',
        baseDomain: 'agendai.clubemkt.digital',
        protocol: 'https',
      };
  }
}

/**
 * Get the current environment context
 */
export function getEnvironmentContext(detector?: EnvironmentDetector): EnvironmentContext {
  const config = getDomainConfig(detector);
  const baseURL = `${config.protocol}://${config.baseDomain}${config.port ? `:${config.port}` : ''}`;
  
  return {
    isDevelopment: config.environment === 'development',
    isStaging: config.environment === 'staging',
    isProduction: config.environment === 'production',
    currentDomain: config.baseDomain,
    baseURL,
  };
}

/**
 * Generate URLs for tenant and admin paths
 */
export function generateURL(options: URLGenerationOptions = {}, detector?: EnvironmentDetector): string {
  const config = getDomainConfig(detector);
  const baseURL = `${config.protocol}://${config.baseDomain}${config.port ? `:${config.port}` : ''}`;
  
  let url = baseURL;
  
  // Add admin path if specified
  if (options.admin) {
    url += '/app';
  }
  
  // Add tenant slug if specified
  if (options.tenant) {
    url += `/${options.tenant}`;
  }
  
  // Add additional path if specified
  if (options.path) {
    // Normalize path to avoid double slashes
    let normalizedPath = options.path;
    
    // Remove leading slashes
    normalizedPath = normalizedPath.replace(/^\/+/, '');
    
    // Replace multiple consecutive slashes with single slash
    normalizedPath = normalizedPath.replace(/\/+/g, '/');
    
    // Only add path if it's not empty after normalization
    if (normalizedPath) {
      url += `/${normalizedPath}`;
    }
  }
  
  return url;
}

/**
 * Generate tenant-specific public URL
 */
export function generateTenantURL(tenantSlug: string, path?: string, detector?: EnvironmentDetector): string {
  return generateURL({
    tenant: tenantSlug,
    path,
  }, detector);
}

/**
 * Generate admin interface URL
 */
export function generateAdminURL(path?: string, detector?: EnvironmentDetector): string {
  return generateURL({
    admin: true,
    path,
  }, detector);
}

/**
 * Get the current domain for display purposes
 */
export function getCurrentDomain(detector?: EnvironmentDetector): string {
  const config = getDomainConfig(detector);
  return config.baseDomain;
}

/**
 * Get the full base URL for the current environment
 */
export function getBaseURL(detector?: EnvironmentDetector): string {
  const config = getDomainConfig(detector);
  return `${config.protocol}://${config.baseDomain}${config.port ? `:${config.port}` : ''}`;
}

/**
 * Validate if a generated URL is properly formatted
 */
export function validateURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}