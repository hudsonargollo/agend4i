/**
 * Property-Based Tests for OAuth Session Management Consistency
 * **Feature: google-auth-integration, Property 5: Session management consistency**
 * **Validates: Requirements 2.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import React, { ReactNode } from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

// Mock OAuth security functions
vi.mock('@/lib/oauth-security', () => ({
  validateStoredTokens: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  cleanupOAuthSecurity: vi.fn(),
}));

// Test component to access auth context
function TestComponent({ onAuthState }: { onAuthState: (authState: any) => void }) {
  const auth = useAuth();
  
  // Report auth state changes
  React.useEffect(() => {
    onAuthState(auth);
  }, [auth.user, auth.session, auth.loading, auth.isOAuthUser, onAuthState]);
  
  return <div data-testid="test-component">Test</div>;
}

describe('OAuth Session Management Consistency Properties', () => {
  let mockSubscription: { unsubscribe: vi.Mock };
  let authStateCallback: (event: string, session: any) => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked supabase
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Setup subscription mock
    mockSubscription = { unsubscribe: vi.fn() };
    
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: mockSubscription } };
    });
    
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 5.1: OAuth and Traditional Auth Session Consistency', () => {
    it('should manage OAuth sessions with same rules as traditional auth', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 20 }),
            email: fc.constantFrom('test@example.com', 'user@test.com', 'oauth@gmail.com'),
            isOAuth: fc.boolean(),
          }),
          async ({ userId, email, isOAuth }) => {
            const authStates: any[] = [];
            
            render(
              <AuthProvider>
                <TestComponent onAuthState={(state) => authStates.push({ ...state })} />
              </AuthProvider>
            );

            // Wait for initial load with shorter timeout
            await waitFor(() => {
              expect(authStates.length).toBeGreaterThan(0);
            }, { timeout: 1000 });

            // Create session data
            const sessionData = {
              user: {
                id: userId,
                email: email,
                identities: isOAuth ? [{ provider: 'google' }] : [{ provider: 'email' }],
              },
              access_token: 'test-token',
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            };

            // Simulate sign in
            authStateCallback('SIGNED_IN', sessionData);

            await waitFor(() => {
              const latestState = authStates[authStates.length - 1];
              expect(latestState.user).toBeTruthy();
              expect(latestState.session).toBeTruthy();
              expect(latestState.loading).toBe(false);
              
              // OAuth detection should be consistent
              expect(latestState.isOAuthUser).toBe(isOAuth);
            }, { timeout: 1000 });

            // Simulate sign out
            authStateCallback('SIGNED_OUT', null);

            await waitFor(() => {
              const latestState = authStates[authStates.length - 1];
              expect(latestState.user).toBeNull();
              expect(latestState.session).toBeNull();
              expect(latestState.loading).toBe(false);
              expect(latestState.isOAuthUser).toBe(false);
            }, { timeout: 1000 });
          }
        ),
        { numRuns: 10 }
      );
    }, 10000); // Increase test timeout
  });

  describe('Property 5.2: Session State Consistency', () => {
    it('should maintain consistent session state across all auth methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              event: fc.constantFrom('SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'),
              userId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
              email: fc.option(fc.emailAddress(), { nil: undefined }),
              isOAuth: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (authEvents) => {
            const authStates: any[] = [];
            
            render(
              <AuthProvider>
                <TestComponent onAuthState={(state) => authStates.push({ ...state })} />
              </AuthProvider>
            );

            // Wait for initial state
            await waitFor(() => {
              expect(authStates.length).toBeGreaterThan(0);
            });

            // Process each auth event
            for (const event of authEvents) {
              let sessionData = null;
              
              if (event.event === 'SIGNED_IN' && event.userId && event.email) {
                sessionData = {
                  user: {
                    id: event.userId,
                    email: event.email,
                    identities: event.isOAuth ? [{ provider: 'google' }] : [{ provider: 'email' }],
                  },
                  access_token: 'test-token',
                  expires_at: Math.floor(Date.now() / 1000) + 3600,
                };
              } else if (event.event === 'TOKEN_REFRESHED' && authStates[authStates.length - 1]?.session) {
                // Keep existing session for refresh
                sessionData = authStates[authStates.length - 1].session;
              }

              authStateCallback(event.event, sessionData);

              await waitFor(() => {
                const latestState = authStates[authStates.length - 1];
                
                // Session state should be consistent with event
                if (event.event === 'SIGNED_OUT') {
                  expect(latestState.user).toBeNull();
                  expect(latestState.session).toBeNull();
                  expect(latestState.isOAuthUser).toBe(false);
                } else if (event.event === 'SIGNED_IN' && sessionData) {
                  expect(latestState.user).toBeTruthy();
                  expect(latestState.session).toBeTruthy();
                  expect(latestState.isOAuthUser).toBe(event.isOAuth);
                }
                
                // Loading should always be false after processing
                expect(latestState.loading).toBe(false);
              });
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 5.3: Session Refresh Consistency', () => {
    it('should handle session refresh consistently for all auth methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            isOAuth: fc.boolean(),
            refreshSuccess: fc.boolean(),
          }),
          async ({ userId, email, isOAuth, refreshSuccess }) => {
            const authStates: any[] = [];
            
            render(
              <AuthProvider>
                <TestComponent onAuthState={(state) => authStates.push({ ...state })} />
              </AuthProvider>
            );

            // Wait for initial state
            await waitFor(() => {
              expect(authStates.length).toBeGreaterThan(0);
            });

            // Sign in first
            const sessionData = {
              user: {
                id: userId,
                email: email,
                identities: isOAuth ? [{ provider: 'google' }] : [{ provider: 'email' }],
              },
              access_token: 'test-token',
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            };

            authStateCallback('SIGNED_IN', sessionData);

            await waitFor(() => {
              const latestState = authStates[authStates.length - 1];
              expect(latestState.user).toBeTruthy();
              expect(latestState.isOAuthUser).toBe(isOAuth);
            });

            // Mock refresh session response
            const { supabase } = await import('@/integrations/supabase/client');
            vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
              error: refreshSuccess ? null : new Error('Refresh failed'),
            });

            // Test refresh session
            const latestState = authStates[authStates.length - 1];
            const refreshResult = await latestState.refreshSession();

            if (refreshSuccess) {
              expect(refreshResult.error).toBeNull();
            } else {
              expect(refreshResult.error).toBeTruthy();
            }

            // Session state should remain consistent regardless of refresh outcome
            const finalState = authStates[authStates.length - 1];
            expect(finalState.isOAuthUser).toBe(isOAuth);
            expect(finalState.loading).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 5.4: Sign Out Consistency', () => {
    it('should clean up sessions consistently for all auth methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 20 }),
            email: fc.constantFrom('test@example.com', 'user@test.com', 'oauth@gmail.com'),
            isOAuth: fc.boolean(),
          }),
          async ({ userId, email, isOAuth }) => {
            const authStates: any[] = [];
            
            render(
              <AuthProvider>
                <TestComponent onAuthState={(state) => authStates.push({ ...state })} />
              </AuthProvider>
            );

            // Wait for initial state with shorter timeout
            await waitFor(() => {
              expect(authStates.length).toBeGreaterThan(0);
            }, { timeout: 1000 });

            // Sign in
            const sessionData = {
              user: {
                id: userId,
                email: email,
                identities: isOAuth ? [{ provider: 'google' }] : [{ provider: 'email' }],
              },
              access_token: 'test-token',
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            };

            authStateCallback('SIGNED_IN', sessionData);

            await waitFor(() => {
              const latestState = authStates[authStates.length - 1];
              expect(latestState.user).toBeTruthy();
              expect(latestState.isOAuthUser).toBe(isOAuth);
            }, { timeout: 1000 });

            // Mock sign out
            const { supabase } = await import('@/integrations/supabase/client');
            vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

            // Test sign out
            const signedInState = authStates[authStates.length - 1];
            await signedInState.signOut();

            // Simulate the auth state change that would happen
            authStateCallback('SIGNED_OUT', null);

            await waitFor(() => {
              const latestState = authStates[authStates.length - 1];
              
              // All session data should be cleared consistently
              expect(latestState.user).toBeNull();
              expect(latestState.session).toBeNull();
              expect(latestState.isOAuthUser).toBe(false);
              expect(latestState.loading).toBe(false);
            }, { timeout: 1000 });

            // Verify cleanup was called for OAuth users
            if (isOAuth) {
              const { cleanupOAuthSecurity } = await import('@/lib/oauth-security');
              expect(cleanupOAuthSecurity).toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 10000); // Increase test timeout
  });
});