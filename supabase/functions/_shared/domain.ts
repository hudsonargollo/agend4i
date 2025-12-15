/**
 * Domain Configuration Service for Supabase Functions
 * 
 * Provides environment-aware domain resolution for server-side functions
 */

export type Environment = 'development' | 'staging' | 'production';

export interface DomainConfig {
  environment: Environment;
  baseDomain: string;
  protocol: 'http' | 'https';
  port?: number;
}

/**
 * Detect the current environment based on Supabase URL
 */
export function detectEnvironment(supabaseUrl?: string): Environment {
  const url = supabaseUrl || Deno.env.get('SUPABASE_URL') || '';
  
  // Check for development/local environment
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return 'development';
  }
  
  // Check for staging environment
  if (url.includes('staging') || url.includes('test')) {
    return 'staging';
  }
  
  // Default to production
  return 'production';
}

/**
 * Get domain configuration for the current environment
 */
export function getDomainConfig(supabaseUrl?: string): DomainConfig {
  const environment = detectEnvironment(supabaseUrl);
  
  // Check for environment variable override first (highest priority)
  const envDomain = Deno.env.get('APP_DOMAIN');
  if (envDomain) {
    // Parse domain and port from envDomain if it includes a port
    const domainParts = envDomain.split(':');
    const baseDomain = domainParts[0];
    const port = domainParts.length > 1 ? parseInt(domainParts[1], 10) : undefined;
    
    return {
      environment,
      baseDomain,
      protocol: envDomain.includes('localhost') ? 'http' : 'https',
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
 * Generate admin interface URL
 */
export function generateAdminURL(path?: string, supabaseUrl?: string): string {
  const config = getDomainConfig(supabaseUrl);
  const baseURL = `${config.protocol}://${config.baseDomain}${config.port ? `:${config.port}` : ''}`;
  
  let url = baseURL + '/app';
  
  // Add additional path if specified
  if (path) {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    url += normalizedPath;
  }
  
  return url;
}

/**
 * Get the current domain for display purposes
 */
export function getCurrentDomain(supabaseUrl?: string): string {
  const config = getDomainConfig(supabaseUrl);
  return config.baseDomain;
}

/**
 * Get the full base URL for the current environment
 */
export function getBaseURL(supabaseUrl?: string): string {
  const config = getDomainConfig(supabaseUrl);
  return `${config.protocol}://${config.baseDomain}${config.port ? `:${config.port}` : ''}`;
}