/**
 * OAuth Security Utilities
 * 
 * This module provides security utilities for OAuth flows including CSRF protection,
 * token validation, and secure storage mechanisms.
 */

import { supabase } from '@/integrations/supabase/client';

export interface OAuthState {
  state: string;
  nonce: string;
  timestamp: number;
  redirectUrl?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
}

export interface OAuthValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Generate a cryptographically secure random string
 */
function generateSecureRandom(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate OAuth state parameter for CSRF protection
 */
export function generateOAuthState(redirectUrl?: string): OAuthState {
  const state = generateSecureRandom(32);
  const nonce = generateSecureRandom(16);
  const timestamp = Date.now();

  const oauthState: OAuthState = {
    state,
    nonce,
    timestamp,
    redirectUrl,
  };

  // Store state in sessionStorage for validation
  try {
    sessionStorage.setItem(`oauth_state_${state}`, JSON.stringify(oauthState));
  } catch (error) {
    console.error('Failed to store OAuth state:', error);
    throw new Error('Failed to initialize OAuth security state');
  }

  return oauthState;
}

/**
 * Validate OAuth state parameter to prevent CSRF attacks
 */
export function validateOAuthState(receivedState: string): OAuthValidationResult {
  const result: OAuthValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
  };

  if (!receivedState) {
    result.errors.push('OAuth state parameter is missing');
    return result;
  }

  try {
    const storedStateData = sessionStorage.getItem(`oauth_state_${receivedState}`);
    
    if (!storedStateData) {
      result.errors.push('OAuth state not found or expired');
      return result;
    }

    const storedState: OAuthState = JSON.parse(storedStateData);
    
    // Validate state matches
    if (storedState.state !== receivedState) {
      result.errors.push('OAuth state mismatch - possible CSRF attack');
      return result;
    }

    // Check if state is not too old (5 minutes max)
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const age = Date.now() - storedState.timestamp;
    
    if (age > maxAge) {
      result.errors.push('OAuth state expired');
      // Clean up expired state
      sessionStorage.removeItem(`oauth_state_${receivedState}`);
      return result;
    }

    if (age > 2 * 60 * 1000) { // 2 minutes
      result.warnings.push('OAuth state is getting old');
    }

    // Clean up used state
    sessionStorage.removeItem(`oauth_state_${receivedState}`);
    
    result.isValid = true;
    return result;

  } catch (error) {
    console.error('Error validating OAuth state:', error);
    result.errors.push('Failed to validate OAuth state');
    return result;
  }
}

/**
 * Validate OAuth response from provider
 */
export function validateOAuthResponse(response: any): OAuthValidationResult {
  const result: OAuthValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
  };

  if (!response) {
    result.errors.push('OAuth response is empty');
    return result;
  }

  // Check for error in response
  if (response.error) {
    result.errors.push(`OAuth provider error: ${response.error}`);
    if (response.error_description) {
      result.errors.push(`Error description: ${response.error_description}`);
    }
    return result;
  }

  // Validate session exists
  if (!response.session) {
    result.errors.push('OAuth response missing session data');
    return result;
  }

  // Validate user data
  if (!response.session.user) {
    result.errors.push('OAuth response missing user data');
    return result;
  }

  const user = response.session.user;

  // Validate required user fields
  if (!user.id) {
    result.errors.push('User ID is missing from OAuth response');
  }

  if (!user.email) {
    result.errors.push('User email is missing from OAuth response');
  }

  // Validate email format
  if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    result.errors.push('Invalid email format in OAuth response');
  }

  // Check for OAuth provider identity
  const identities = user.identities || [];
  const hasGoogleIdentity = identities.some((identity: any) => identity.provider === 'google');
  
  if (!hasGoogleIdentity) {
    result.warnings.push('No Google identity found in user data');
  }

  // Validate token expiration
  if (response.session.expires_at) {
    const expiresAt = new Date(response.session.expires_at * 1000);
    const now = new Date();
    
    if (expiresAt <= now) {
      result.errors.push('OAuth token is already expired');
    } else if (expiresAt.getTime() - now.getTime() < 60 * 1000) { // Less than 1 minute
      result.warnings.push('OAuth token expires very soon');
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Securely store OAuth tokens
 */
export function storeOAuthTokens(tokens: OAuthTokens): boolean {
  try {
    // Use sessionStorage for temporary storage during the session
    // Supabase handles secure token storage internally
    const tokenData = {
      ...tokens,
      storedAt: Date.now(),
    };

    sessionStorage.setItem('oauth_tokens_meta', JSON.stringify({
      hasTokens: true,
      expiresAt: tokens.expiresAt,
      storedAt: tokenData.storedAt,
    }));

    return true;
  } catch (error) {
    console.error('Failed to store OAuth token metadata:', error);
    return false;
  }
}

/**
 * Validate stored OAuth tokens
 */
export function validateStoredTokens(): OAuthValidationResult {
  const result: OAuthValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
  };

  try {
    const tokenMeta = sessionStorage.getItem('oauth_tokens_meta');
    
    if (!tokenMeta) {
      result.errors.push('No OAuth token metadata found');
      return result;
    }

    const meta = JSON.parse(tokenMeta);
    
    if (!meta.hasTokens) {
      result.errors.push('OAuth tokens not available');
      return result;
    }

    // Check token expiration
    if (meta.expiresAt && meta.expiresAt <= Date.now() / 1000) {
      result.errors.push('OAuth tokens have expired');
      // Clean up expired token metadata
      sessionStorage.removeItem('oauth_tokens_meta');
      return result;
    }

    // Check if tokens are getting old
    const age = Date.now() - meta.storedAt;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (age > maxAge) {
      result.warnings.push('OAuth tokens are old and may need refresh');
    }

    result.isValid = true;
    return result;

  } catch (error) {
    console.error('Error validating stored tokens:', error);
    result.errors.push('Failed to validate stored tokens');
    return result;
  }
}

/**
 * Clean up OAuth security data
 */
export function cleanupOAuthSecurity(): void {
  try {
    // Clean up any remaining state data
    // Handle both real sessionStorage and mock implementations
    let keys: string[] = [];
    
    if (typeof sessionStorage.length === 'number') {
      // Real sessionStorage implementation
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) keys.push(key);
      }
    } else {
      // Mock implementation - try to get keys from Object.keys
      try {
        keys = Object.keys(sessionStorage);
      } catch {
        // If that fails, we might be dealing with a different mock structure
        // Try to access the store directly if available
        const mockStorage = sessionStorage as any;
        if (mockStorage.store && typeof mockStorage.store.keys === 'function') {
          keys = Array.from(mockStorage.store.keys());
        }
      }
    }
    
    keys.forEach(key => {
      if (key.startsWith('oauth_state_') || key === 'oauth_tokens_meta') {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error cleaning up OAuth security data:', error);
  }
}

/**
 * Validate OAuth redirect URL format and security
 */
export function validateOAuthRedirectUrl(url: string): OAuthValidationResult {
  const result: OAuthValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
  };

  if (!url) {
    result.errors.push('OAuth redirect URL is required');
    return result;
  }

  try {
    const parsedUrl = new URL(url);
    
    // Validate protocol
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      result.errors.push('OAuth redirect URL must use HTTP or HTTPS protocol');
    }
    
    // Warn about insecure connections in production
    if (parsedUrl.protocol === 'http:' && !parsedUrl.hostname.includes('localhost')) {
      result.warnings.push('OAuth redirect URL uses insecure HTTP protocol');
    }
    
    // Validate hostname
    if (!parsedUrl.hostname) {
      result.errors.push('OAuth redirect URL must have a valid hostname');
    }
    
    // Check for suspicious patterns
    if (parsedUrl.hostname.includes('..') || parsedUrl.pathname.includes('..')) {
      result.errors.push('OAuth redirect URL contains suspicious path traversal patterns');
    }
    
    // Validate path
    if (!parsedUrl.pathname.includes('/auth/callback') && !parsedUrl.pathname.includes('/callback')) {
      result.warnings.push('OAuth redirect URL path does not match expected callback pattern');
    }
    
    // Check for required callback path
    if (parsedUrl.pathname === '/') {
      result.errors.push('OAuth redirect URL must include a callback path');
    }
    
    result.isValid = result.errors.length === 0;
    return result;
    
  } catch (error) {
    result.errors.push('OAuth redirect URL is not a valid URL');
    return result;
  }
}

/**
 * Validate OAuth parameters before initiating flow
 */
export function validateOAuthParameters(params: {
  provider: string;
  redirectTo: string;
  queryParams?: Record<string, string>;
}): OAuthValidationResult {
  const result: OAuthValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
  };

  // Validate provider
  if (!params.provider) {
    result.errors.push('OAuth provider is required');
  } else if (params.provider !== 'google') {
    result.errors.push('Only Google OAuth provider is currently supported');
  }

  // Validate redirect URL
  const redirectValidation = validateOAuthRedirectUrl(params.redirectTo);
  result.errors.push(...redirectValidation.errors);
  result.warnings.push(...redirectValidation.warnings);

  // Validate query parameters
  if (params.queryParams) {
    const { queryParams } = params;
    
    // Check for required parameters
    if (!queryParams.state) {
      result.errors.push('OAuth state parameter is required for security');
    }
    
    // Validate access_type
    if (queryParams.access_type && queryParams.access_type !== 'offline') {
      result.warnings.push('OAuth access_type should be "offline" for refresh token support');
    }
    
    // Validate prompt
    if (queryParams.prompt && !['consent', 'select_account', 'none'].includes(queryParams.prompt)) {
      result.warnings.push('OAuth prompt parameter has unexpected value');
    }
    
    // Check for suspicious parameters
    Object.keys(queryParams).forEach(key => {
      const value = queryParams[key];
      if (typeof value === 'string' && (value.includes('<script') || value.includes('javascript:'))) {
        result.errors.push(`OAuth parameter "${key}" contains suspicious content`);
      }
    });
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Enhanced OAuth initiation with comprehensive validation
 */
export async function initiateSecureOAuth(redirectUrl?: string): Promise<{ 
  state: string; 
  error?: string;
  validation?: OAuthValidationResult;
}> {
  try {
    // Generate secure state
    const oauthState = generateOAuthState(redirectUrl);
    
    // Validate current environment security
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      console.warn('OAuth initiated over insecure connection');
    }

    // Validate the redirect URL if provided
    let validation: OAuthValidationResult | undefined;
    if (redirectUrl) {
      validation = validateOAuthRedirectUrl(redirectUrl);
      
      if (!validation.isValid) {
        return { 
          state: '', 
          error: `OAuth redirect URL validation failed: ${validation.errors.join(', ')}`,
          validation,
        };
      }
      
      if (validation.warnings.length > 0) {
        console.warn('OAuth redirect URL warnings:', validation.warnings);
      }
    }

    return { state: oauthState.state, validation };
  } catch (error) {
    console.error('Failed to initiate secure OAuth:', error);
    return { 
      state: '', 
      error: error instanceof Error ? error.message : 'Failed to initialize OAuth security' 
    };
  }
}

/**
 * Detect if this is a duplicate account based on user creation timestamp and identities
 */
export function detectDuplicateAccount(user: any, isSignupAttempt: boolean): { 
  isDuplicate: boolean; 
  reason?: string 
} {
  if (!isSignupAttempt) {
    return { isDuplicate: false };
  }
  
  // Check if user was created recently (within last 5 minutes)
  // If not, this is likely an existing account
  const userCreatedAt = new Date(user.created_at);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const isRecentlyCreated = userCreatedAt > fiveMinutesAgo;
  
  // Check if user has email_confirmed_at set (indicates existing account)
  const hasConfirmedEmail = !!user.email_confirmed_at;
  
  // Check if user has multiple identities (could indicate existing account with new OAuth)
  const identities = user.identities || [];
  const hasMultipleIdentities = identities.length > 1;
  
  // Determine if this is a duplicate
  if (!isRecentlyCreated && hasConfirmedEmail) {
    return { 
      isDuplicate: true, 
      reason: 'Account exists with confirmed email' 
    };
  }
  
  if (hasMultipleIdentities) {
    return { 
      isDuplicate: true, 
      reason: 'Account has multiple authentication methods' 
    };
  }
  
  // Check if this OAuth identity was created much earlier than the current session
  const googleIdentity = identities.find((identity: any) => identity.provider === 'google');
  if (googleIdentity && googleIdentity.created_at) {
    const identityCreatedAt = new Date(googleIdentity.created_at);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    if (identityCreatedAt < tenMinutesAgo) {
      return { 
        isDuplicate: true, 
        reason: 'OAuth identity exists from previous session' 
      };
    }
  }
  
  return { isDuplicate: false };
}

/**
 * Handle duplicate account detection during OAuth flow
 */
export function handleDuplicateAccount(
  user: any, 
  isSignupAttempt: boolean
): { isDuplicate: boolean; shouldRedirect: boolean; message?: string } {
  const duplicateCheck = detectDuplicateAccount(user, isSignupAttempt);
  
  if (duplicateCheck.isDuplicate) {
    console.log('Duplicate account detected:', {
      userId: user.id,
      email: user.email,
      reason: duplicateCheck.reason,
      isSignupAttempt,
    });
    
    return {
      isDuplicate: true,
      shouldRedirect: false, // Don't redirect, just show different message
      message: 'Esta conta Google já está registrada. Você foi conectado automaticamente.',
    };
  }
  
  return { isDuplicate: false, shouldRedirect: false };
}

/**
 * Validate OAuth callback with comprehensive security checks
 */
export async function validateOAuthCallback(
  searchParams: URLSearchParams
): Promise<OAuthValidationResult> {
  const result: OAuthValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
  };

  try {
    // Check for OAuth errors first
    const error = searchParams.get('error');
    if (error) {
      result.errors.push(`OAuth provider error: ${error}`);
      const errorDescription = searchParams.get('error_description');
      if (errorDescription) {
        result.errors.push(`Error description: ${errorDescription}`);
      }
      return result;
    }

    // Validate state parameter
    const state = searchParams.get('state');
    if (state) {
      const stateValidation = validateOAuthState(state);
      result.errors.push(...stateValidation.errors);
      result.warnings.push(...stateValidation.warnings);
      
      if (!stateValidation.isValid) {
        return result;
      }
    } else {
      result.warnings.push('OAuth state parameter not found in callback');
    }

    // Get and validate session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      result.errors.push(`Session error: ${sessionError.message}`);
      return result;
    }

    if (sessionData.session) {
      const responseValidation = validateOAuthResponse({ session: sessionData.session });
      result.errors.push(...responseValidation.errors);
      result.warnings.push(...responseValidation.warnings);
      
      if (responseValidation.isValid) {
        // Store token metadata securely
        const tokens: OAuthTokens = {
          accessToken: sessionData.session.access_token,
          refreshToken: sessionData.session.refresh_token || undefined,
          expiresAt: sessionData.session.expires_at || 0,
        };
        
        if (storeOAuthTokens(tokens)) {
          result.isValid = result.errors.length === 0;
        } else {
          result.errors.push('Failed to securely store OAuth tokens');
        }
      }
    } else {
      result.errors.push('No session found in OAuth callback');
    }

    return result;

  } catch (error) {
    console.error('Error validating OAuth callback:', error);
    result.errors.push('Failed to validate OAuth callback');
    return result;
  }
}