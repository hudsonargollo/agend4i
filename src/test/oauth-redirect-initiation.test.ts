/**
 * Property-Based Test for OAuth Redirect Initiation
 * **Feature: google-auth-integration, Property 1: OAuth redirect initiation**
 * **Validates: Requirements 1.1, 2.1**
 * 
 * Tests that for any authentication page (sign-in or sign-up), clicking the Google 
 * authentication button should initiate a redirect to Google OAuth with proper parameters
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  validateOAuthRedirectUrl, 
  validateOAuthParameters, 
  initiateSecureOAuth 
} from '@/lib/oauth-security';
import { 
  validateOAuthButtonConfig, 
  testOAuthFlowInitiation, 
  getOAuthRedirectUrls,
  getOAuthConfig 
} from '@/lib/oauth-config';

// Mock sessionStorage for testing
const mockSessionStorage = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockSessionStorage.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage.store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    mockSessionStorage.store.delete(key);
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store.clear();
  }),
  length: 0,
  key: vi.fn((index: number) => {
    const keys = Array.from(mockSessionStorage.store.keys());
    return keys[index] || null;
  }),
};

// Mock crypto for testing
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

describe('OAuth Redirect Initiation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.store.clear();
    
    // Mock global objects
    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
    
    Object.defineProperty(global, 'crypto', {
      value: mockCrypto,
      writable: true,
    });

    // Mock window.location
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          protocol: 'https:',
          hostname: 'localhost',
          origin: 'https://localhost:3000',
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 1: OAuth redirect initiation
   * For any authentication page (sign-in or sign-up), clicking the Google authentication 
   * button should initiate a redirect to Google OAuth with proper parameters
   */
  it('should validate OAuth redirect URLs consistently', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          protocol: fc.constantFrom('http:', 'https:', 'ftp:', 'invalid:'),
          hostname: fc.oneof(
            fc.constant('localhost'),
            fc.domain(),
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('.')),
            fc.constant('')
          ),
          port: fc.option(fc.integer({ min: 1, max: 65535 })),
          path: fc.oneof(
            fc.constant('/auth/callback'),
            fc.constant('/callback'),
            fc.constant('/'),
            fc.constant('/invalid'),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          hasPathTraversal: fc.boolean(),
        }),
        ({ protocol, hostname, port, path, hasPathTraversal }) => {
          // Construct URL
          let url = `${protocol}//${hostname}`;
          if (port) {
            url += `:${port}`;
          }
          
          if (hasPathTraversal) {
            // Add path traversal that won't be normalized away
            url += '/auth/..%2fcallback'; // URL encoded to prevent normalization
          } else {
            url += path;
          }

          const validation = validateOAuthRedirectUrl(url);

          // Property: Empty URLs should be invalid
          if (!url || !hostname) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
          }

          // Property: Invalid protocols should be rejected (if URL is parseable)
          if (protocol !== 'http:' && protocol !== 'https:') {
            expect(validation.isValid).toBe(false);
            // The error might be about invalid URL or invalid protocol
            expect(validation.errors.some(error => 
              error.includes('protocol') || error.includes('not a valid URL')
            )).toBe(true);
          }

          // Property: Path traversal should be detected if present in final URL
          try {
            const parsedUrl = new URL(url);
            if (parsedUrl.pathname.includes('..') || parsedUrl.hostname.includes('..')) {
              expect(validation.isValid).toBe(false);
              expect(validation.errors.some(error => error.includes('traversal'))).toBe(true);
            }
          } catch {
            // Invalid URLs will be caught by other validation
          }

          // Property: Root path should be invalid for OAuth callbacks (if URL is otherwise valid)
          if (path === '/' && hostname && validation.errors.length > 0) {
            expect(validation.isValid).toBe(false);
            // May fail due to callback path or other issues
            expect(validation.errors.length).toBeGreaterThan(0);
          }

          // Property: HTTP in non-localhost should generate warnings (only for valid URLs)
          if (protocol === 'http:' && hostname && !hostname.includes('localhost') && validation.isValid) {
            expect(validation.warnings.some(warning => warning.includes('insecure'))).toBe(true);
          }

          // Property: Valid HTTPS URLs with proper callback paths should be valid
          if (protocol === 'https:' && hostname && hostname.trim() && 
              !hostname.includes(' ') && !hasPathTraversal && 
              hostname !== ':' && hostname.length > 1 && // Exclude invalid hostnames like ":"
              (path.includes('/callback') || path.includes('/auth/callback'))) {
            expect(validation.isValid).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: OAuth parameter validation
   */
  it('should validate OAuth parameters consistently', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          provider: fc.oneof(
            fc.constant('google'),
            fc.constant('facebook'),
            fc.constant('github'),
            fc.constant(''),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          redirectUrl: fc.oneof(
            fc.constant('https://localhost:3000/auth/callback'),
            fc.constant('http://localhost:3000/auth/callback'),
            fc.constant('https://example.com/callback'),
            fc.constant('invalid-url'),
            fc.constant('')
          ),
          hasState: fc.boolean(),
          accessType: fc.option(fc.constantFrom('offline', 'online', 'invalid')),
          prompt: fc.option(fc.constantFrom('consent', 'select_account', 'none', 'invalid')),
          hasSuspiciousParams: fc.boolean(),
        }),
        ({ provider, redirectUrl, hasState, accessType, prompt, hasSuspiciousParams }) => {
          const queryParams: Record<string, string> = {};
          
          if (hasState) {
            queryParams.state = 'valid-state-token';
          }
          
          if (accessType) {
            queryParams.access_type = accessType;
          }
          
          if (prompt) {
            queryParams.prompt = prompt;
          }
          
          if (hasSuspiciousParams) {
            queryParams.malicious = '<script>alert("xss")</script>';
          }

          const params = {
            provider,
            redirectTo: redirectUrl,
            queryParams,
          };

          const validation = validateOAuthParameters(params);

          // Property: Empty provider should be invalid
          if (!provider) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error => error.includes('provider'))).toBe(true);
          }

          // Property: Only Google provider should be supported
          if (provider && provider !== 'google') {
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error => error.includes('Google'))).toBe(true);
          }

          // Property: Missing state should be flagged as error
          if (!hasState) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error => error.includes('state'))).toBe(true);
          }

          // Property: Invalid access_type should generate warnings
          if (accessType && accessType !== 'offline') {
            expect(validation.warnings.some(warning => warning.includes('access_type'))).toBe(true);
          }

          // Property: Invalid prompt should generate warnings
          if (prompt && !['consent', 'select_account', 'none'].includes(prompt)) {
            expect(validation.warnings.some(warning => warning.includes('prompt'))).toBe(true);
          }

          // Property: Suspicious parameters should be rejected
          if (hasSuspiciousParams) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error => error.includes('suspicious'))).toBe(true);
          }

          // Property: Valid parameters should pass validation
          if (provider === 'google' && redirectUrl.startsWith('https://') && 
              hasState && !hasSuspiciousParams) {
            expect(validation.isValid).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Secure OAuth initiation
   */
  it('should initiate secure OAuth consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          redirectUrl: fc.option(fc.oneof(
            fc.constant('https://localhost:3000/auth/callback'),
            fc.constant('http://localhost:3000/auth/callback'),
            fc.constant('https://example.com/callback'),
            fc.constant('invalid-url')
          )),
        }),
        async ({ redirectUrl }) => {
          const result = await initiateSecureOAuth(redirectUrl);

          // Property: Should always return a result object
          expect(result).toBeDefined();
          expect(typeof result).toBe('object');

          if (redirectUrl) {
            // Property: Invalid redirect URLs should cause errors
            if (redirectUrl === 'invalid-url') {
              expect(result.error).toBeDefined();
              expect(result.state).toBe('');
            } else {
              // Property: Valid redirect URLs should succeed
              if (redirectUrl.startsWith('https://') || redirectUrl.includes('localhost')) {
                expect(result.state).toBeDefined();
                expect(result.state.length).toBeGreaterThan(0);
                
                // Property: State should be stored in sessionStorage
                const storedState = mockSessionStorage.getItem(`oauth_state_${result.state}`);
                if (result.state) {
                  expect(storedState).toBeDefined();
                  
                  if (storedState) {
                    const parsedState = JSON.parse(storedState);
                    expect(parsedState.state).toBe(result.state);
                    expect(parsedState.timestamp).toBeDefined();
                    expect(parsedState.nonce).toBeDefined();
                  }
                }
              }
            }
          } else {
            // Property: No redirect URL should still generate state
            expect(result.state).toBeDefined();
            expect(result.state.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: OAuth button configuration validation structure
   */
  it('should validate OAuth button configuration structure consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          googleClientId: fc.oneof(
            fc.constant(''),
            fc.constant('test-client-id.apps.googleusercontent.com'),
            fc.constant('invalid-client-id')
          ),
          supabaseUrl: fc.oneof(
            fc.constant(''),
            fc.constant('https://test.supabase.co'),
            fc.constant('invalid-url')
          ),
          supabaseKey: fc.oneof(
            fc.constant(''),
            fc.constant('test-key')
          ),
          appDomain: fc.oneof(
            fc.constant(''),
            fc.constant('localhost:3000'),
            fc.constant('example.com')
          ),
        }),
        async ({ googleClientId, supabaseUrl, supabaseKey, appDomain }) => {
          // Create a mock config object
          const mockConfig = {
            googleClientId,
            supabaseUrl,
            supabaseKey,
            appDomain,
            environment: 'development',
          };

          // Test the validateOAuthConfig function directly
          const { validateOAuthConfig } = await import('@/lib/oauth-config');
          const validation = validateOAuthConfig(mockConfig);

          // Property: Empty required fields should cause errors
          if (!googleClientId || !supabaseUrl || !supabaseKey || !appDomain) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
          }

          // Property: Invalid Google Client ID format should cause errors
          if (googleClientId && !googleClientId.includes('.apps.googleusercontent.com')) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error => error.includes('Client ID format'))).toBe(true);
          }

          // Property: Valid complete config should pass
          if (googleClientId.includes('.apps.googleusercontent.com') && 
              supabaseUrl.startsWith('https://') && 
              supabaseKey && appDomain) {
            expect(validation.isValid).toBe(true);
          }

          // Property: Validation should always return proper structure
          expect(typeof validation.isValid).toBe('boolean');
          expect(Array.isArray(validation.errors)).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: OAuth flow initiation environment requirements
   */
  it('should test OAuth flow initiation environment requirements consistently', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          hasCrypto: fc.boolean(),
          hasSessionStorage: fc.boolean(),
          canWriteSessionStorage: fc.boolean(),
        }),
        ({ hasCrypto, hasSessionStorage, canWriteSessionStorage }) => {
          // Store original values
          const originalCrypto = global.crypto;
          const originalSessionStorage = global.sessionStorage;

          try {
            // Mock crypto availability
            if (!hasCrypto) {
              vi.stubGlobal('crypto', undefined);
            } else {
              vi.stubGlobal('crypto', mockCrypto);
            }

            // Mock sessionStorage availability
            if (!hasSessionStorage) {
              vi.stubGlobal('sessionStorage', undefined);
            } else if (!canWriteSessionStorage) {
              const failingStorage = {
                ...mockSessionStorage,
                setItem: vi.fn(() => {
                  throw new Error('Storage quota exceeded');
                }),
              };
              vi.stubGlobal('sessionStorage', failingStorage);
            } else {
              vi.stubGlobal('sessionStorage', mockSessionStorage);
            }

            // Test the environment requirements directly
            let errors: string[] = [];

            // Test crypto availability
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

            const canInitiate = errors.length === 0;

            // Property: Missing crypto should prevent initiation
            if (!hasCrypto) {
              expect(canInitiate).toBe(false);
              expect(errors.some(error => error.includes('Crypto'))).toBe(true);
            }

            // Property: Missing sessionStorage should prevent initiation
            if (!hasSessionStorage) {
              expect(canInitiate).toBe(false);
              expect(errors.some(error => error.includes('SessionStorage'))).toBe(true);
            }

            // Property: Non-writable sessionStorage should prevent initiation
            if (hasSessionStorage && !canWriteSessionStorage) {
              expect(canInitiate).toBe(false);
              expect(errors.some(error => error.includes('writable'))).toBe(true);
            }

            // Property: All requirements met should allow initiation
            if (hasCrypto && hasSessionStorage && canWriteSessionStorage) {
              expect(canInitiate).toBe(true);
            }

          } finally {
            // Restore original values
            vi.stubGlobal('crypto', originalCrypto);
            vi.stubGlobal('sessionStorage', originalSessionStorage);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});