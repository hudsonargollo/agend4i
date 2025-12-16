/**
 * Google OAuth Configuration Utilities
 * 
 * This module provides utilities for validating and managing Google OAuth configuration
 * across different environments.
 */

export interface OAuthConfig {
  googleClientId: string;
  supabaseUrl: string;
  supabaseKey: string;
  appDomain: string;
  environment: string;
}

/**
 * Get OAuth configuration from environment variables
 */
export function getOAuthConfig(): OAuthConfig {
  const config = {
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    appDomain: import.meta.env.VITE_APP_DOMAIN || '',
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  };

  return config;
}

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(config: OAuthConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.googleClientId || config.googleClientId === 'your_google_client_id_here') {
    errors.push('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.');
  }

  if (!config.supabaseUrl) {
    errors.push('Supabase URL is not configured. Please set VITE_SUPABASE_URL environment variable.');
  }

  if (!config.supabaseKey) {
    errors.push('Supabase publishable key is not configured. Please set VITE_SUPABASE_PUBLISHABLE_KEY environment variable.');
  }

  if (!config.appDomain) {
    errors.push('App domain is not configured. Please set VITE_APP_DOMAIN environment variable.');
  }

  // Validate Google Client ID format (should be a long string ending with .apps.googleusercontent.com)
  if (config.googleClientId && !config.googleClientId.includes('.apps.googleusercontent.com')) {
    errors.push('Google Client ID format appears invalid. It should end with .apps.googleusercontent.com');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get OAuth redirect URLs for the current environment
 */
export function getOAuthRedirectUrls(config: OAuthConfig): {
  appCallback: string;
  supabaseCallback: string;
} {
  const protocol = config.appDomain.includes('localhost') ? 'http' : 'https';
  const appCallback = `${protocol}://${config.appDomain}/auth/callback`;
  const supabaseCallback = `${config.supabaseUrl}/auth/v1/callback`;

  return {
    appCallback,
    supabaseCallback,
  };
}

/**
 * Log OAuth configuration status (for debugging)
 */
export function logOAuthConfigStatus(): void {
  const config = getOAuthConfig();
  const validation = validateOAuthConfig(config);
  const redirectUrls = getOAuthRedirectUrls(config);

  console.group('OAuth Configuration Status');
  console.log('Environment:', config.environment);
  console.log('App Domain:', config.appDomain);
  console.log('Google Client ID configured:', !!config.googleClientId && config.googleClientId !== 'your_google_client_id_here');
  console.log('Supabase URL:', config.supabaseUrl);
  console.log('Redirect URLs:', redirectUrls);
  
  if (!validation.isValid) {
    console.warn('Configuration Issues:');
    validation.errors.forEach(error => console.warn('- ' + error));
  } else {
    console.log('✅ OAuth configuration is valid');
  }
  console.groupEnd();
}

/**
 * Check if OAuth is properly configured
 */
export function isOAuthConfigured(): boolean {
  const config = getOAuthConfig();
  const validation = validateOAuthConfig(config);
  return validation.isValid;
}

/**
 * Validate OAuth button configuration and functionality
 */
export function validateOAuthButtonConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if OAuth is configured
  const config = getOAuthConfig();
  const configValidation = validateOAuthConfig(config);
  
  if (!configValidation.isValid) {
    errors.push(...configValidation.errors);
  }

  // Check if redirect URLs are properly configured
  try {
    const redirectUrls = getOAuthRedirectUrls(config);
    
    // Validate app callback URL
    if (!redirectUrls.appCallback.includes('/auth/callback')) {
      errors.push('OAuth app callback URL does not include proper callback path');
    }
    
    // Validate Supabase callback URL
    if (!redirectUrls.supabaseCallback.includes('/auth/v1/callback')) {
      errors.push('OAuth Supabase callback URL does not include proper callback path');
    }
    
    // Check for localhost in production
    if (config.environment === 'production' && redirectUrls.appCallback.includes('localhost')) {
      errors.push('OAuth callback URL uses localhost in production environment');
    }
    
  } catch (error) {
    errors.push('Failed to generate OAuth redirect URLs');
  }

  // Check browser environment
  if (typeof window === 'undefined') {
    warnings.push('OAuth button validation running in non-browser environment');
  } else {
    // Check if we're in a secure context for production
    if (config.environment === 'production' && window.location.protocol !== 'https:') {
      warnings.push('OAuth should be used over HTTPS in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Test OAuth flow initiation (dry run)
 */
export function testOAuthFlowInitiation(): {
  canInitiate: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Test configuration
    const buttonValidation = validateOAuthButtonConfig();
    errors.push(...buttonValidation.errors);
    warnings.push(...buttonValidation.warnings);

    // Test if we can generate secure state
    if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
      errors.push('Crypto API not available for secure OAuth state generation');
    }

    // Test sessionStorage availability
    if (typeof sessionStorage === 'undefined') {
      errors.push('SessionStorage not available for OAuth state management');
    } else {
      try {
        sessionStorage.setItem('oauth_test', 'test');
        sessionStorage.removeItem('oauth_test');
      } catch (error) {
        errors.push('SessionStorage not writable for OAuth state management');
      }
    }

    // Test URL construction
    const config = getOAuthConfig();
    if (config.appDomain) {
      try {
        const testUrl = new URL(`https://${config.appDomain}/auth/callback`);
        if (!testUrl.hostname) {
          errors.push('Invalid app domain for OAuth callback URL construction');
        }
      } catch (error) {
        errors.push('Cannot construct valid OAuth callback URL from app domain');
      }
    }

  } catch (error) {
    errors.push('Unexpected error during OAuth flow initiation test');
  }

  return {
    canInitiate: errors.length === 0,
    errors,
    warnings,
  };
}