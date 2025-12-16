/**
 * Authentication Flow Integration Tests
 * 
 * Tests complete OAuth sign-up and sign-in flows, routing, and user experience
 * across authentication methods including mobile and desktop experiences.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';

// Mock dependencies
const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({
    userTenants: [],
    loading: false,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    isOAuthUser: false,
    isZeroumUser: false,
    authProvider: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    validateZeroumAuthentication: vi.fn(),
    switchAuthMethod: vi.fn(),
    getAuthMethodCompatibility: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

// Mock OAuth configuration
vi.mock('@/lib/oauth-config', () => ({
  getOAuthConfig: () => ({
    googleClientId: 'test-client-id.apps.googleusercontent.com',
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key',
    appDomain: 'localhost:3000',
    environment: 'test',
  }),
  validateOAuthConfig: () => ({ isValid: true, errors: [] }),
  getOAuthRedirectUrls: () => ({
    appCallback: 'http://localhost:3000/auth/callback',
    supabaseCallback: 'https://test.supabase.co/auth/v1/callback',
  }),
  validateOAuthButtonConfig: () => ({ isValid: true, errors: [], warnings: [] }),
  testOAuthFlowInitiation: () => ({ canInitiate: true, errors: [], warnings: [] }),
}));

// Mock OAuth security
vi.mock('@/lib/oauth-security', () => ({
  initiateSecureOAuth: vi.fn(() => Promise.resolve({ state: 'test-state' })),
  validateOAuthParameters: () => ({ isValid: true, errors: [], warnings: [] }),
  validateOAuthCallback: vi.fn(() => Promise.resolve({ isValid: true, errors: [], warnings: [] })),
  cleanupOAuthSecurity: vi.fn(),
  handleDuplicateAccount: () => ({ isDuplicate: false, shouldRedirect: false }),
}));

// Mock Zeroum account utilities
vi.mock('@/scripts/create-zeroum-account', () => ({
  isZeroumAccount: (email: string) => email === 'zeroum@barbearia.com',
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Simulate different viewport sizes for mobile/desktop testing
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('Authentication Flow Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setViewport(1024, 768);
    
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth/authorize?...' },
      error: null,
    });
  });

  /**
   * Test OAuth button presence and functionality
   */
  it('should display OAuth buttons on both sign-in and sign-up pages', async () => {
    const Auth = (await import('@/pages/Auth')).default;
    
    render(
      <TestWrapper>
        <Auth />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('agend4i')).toBeInTheDocument();
    });

    // Property: Google OAuth button should be present on login tab
    const loginGoogleButton = screen.getByTestId('google-oauth-login-button');
    expect(loginGoogleButton).toBeInTheDocument();
    expect(loginGoogleButton.textContent).toContain('Google');

    // Switch to signup tab
    const signupTab = screen.getByRole('tab', { name: /criar conta/i });
    fireEvent.click(signupTab);

    await waitFor(() => {
      expect(signupTab).toHaveAttribute('data-state', 'active');
    });

    // Property: Google OAuth button should be present on signup tab
    const signupGoogleButton = screen.getByTestId('google-oauth-signup-button');
    expect(signupGoogleButton).toBeInTheDocument();
    expect(signupGoogleButton.textContent).toContain('Google');

    // Property: Both buttons should have proper accessibility attributes
    expect(loginGoogleButton).toHaveAttribute('aria-label');
    expect(signupGoogleButton).toHaveAttribute('aria-label');
  });

  /**
   * Test OAuth flow initiation
   */
  it('should initiate OAuth flow correctly for both sign-in and sign-up', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('login', 'signup'),
        async (mode) => {
          const Auth = (await import('@/pages/Auth')).default;
          
          render(
            <TestWrapper>
              <Auth />
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText('agend4i')).toBeInTheDocument();
          });

          // Switch to appropriate tab
          if (mode === 'signup') {
            const signupTab = screen.getByRole('tab', { name: /criar conta/i });
            fireEvent.click(signupTab);
            await waitFor(() => {
              expect(signupTab).toHaveAttribute('data-state', 'active');
            });
          }

          // Click OAuth button
          const googleButton = mode === 'signup'
            ? screen.getByTestId('google-oauth-signup-button')
            : screen.getByTestId('google-oauth-login-button');

          fireEvent.click(googleButton);

          // Property: OAuth flow should be initiated
          const { supabase } = await import('@/integrations/supabase/client');
          await waitFor(() => {
            expect(supabase.auth.signInWithOAuth).toHaveBeenCalled();
          });

          const oauthCall = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0];
          expect(oauthCall.provider).toBe('google');
          expect(oauthCall.options.redirectTo).toContain('/auth/callback');

          // Property: Signup mode should be indicated in redirect URL for signup
          if (mode === 'signup') {
            expect(oauthCall.options.redirectTo).toContain('signup_mode=true');
          } else {
            expect(oauthCall.options.redirectTo).not.toContain('signup_mode=true');
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test mobile vs desktop experience
   */
  it('should provide consistent experience across different viewport sizes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          viewport: fc.constantFrom(
            { width: 375, height: 667, name: 'mobile' },
            { width: 1024, height: 768, name: 'desktop' }
          ),
        }),
        async ({ viewport }) => {
          setViewport(viewport.width, viewport.height);

          const Auth = (await import('@/pages/Auth')).default;
          
          render(
            <TestWrapper>
              <Auth />
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText('agend4i')).toBeInTheDocument();
          });

          // Property: OAuth buttons should be accessible on all viewports
          const googleButton = screen.getByTestId('google-oauth-login-button');
          expect(googleButton).toBeInTheDocument();

          // Property: Button should be properly sized and clickable
          const buttonRect = googleButton.getBoundingClientRect();
          expect(buttonRect.width).toBeGreaterThan(0);
          expect(buttonRect.height).toBeGreaterThan(0);

          // Property: Google branding should be present
          const googleIcon = googleButton.querySelector('svg');
          expect(googleIcon).toBeInTheDocument();

          // Property: Visual separation should exist
          const separator = screen.getByText('ou');
          expect(separator).toBeInTheDocument();

          // Property: Traditional form should be available
          const emailInput = screen.getByLabelText(/email/i);
          const passwordInput = screen.getByLabelText(/senha/i);
          expect(emailInput).toBeInTheDocument();
          expect(passwordInput).toBeInTheDocument();
        }
      ),
      { numRuns: 8 }
    );
  });

  /**
   * Test Zeroum account protection
   */
  it('should prevent OAuth for Zeroum account', async () => {
    const Auth = (await import('@/pages/Auth')).default;
    
    render(
      <TestWrapper>
        <Auth />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('agend4i')).toBeInTheDocument();
    });

    // Fill in Zeroum email
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'zeroum@barbearia.com' } });

    // Try to click Google OAuth button
    const googleButton = screen.getByTestId('google-oauth-login-button');
    fireEvent.click(googleButton);

    // Property: Error message should be shown
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Método de autenticação não permitido',
        description: 'Esta conta deve usar autenticação tradicional com email e senha.',
        variant: 'destructive',
      });
    });
  });

  /**
   * Test error handling
   */
  it('should handle OAuth errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'server_error',
          'invalid_client',
          'access_denied'
        ),
        async (errorType) => {
          // Mock OAuth error
          const { supabase } = await import('@/integrations/supabase/client');
          vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
            data: null,
            error: { message: errorType },
          });

          const Auth = (await import('@/pages/Auth')).default;
          
          render(
            <TestWrapper>
              <Auth />
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText('agend4i')).toBeInTheDocument();
          });

          const googleButton = screen.getByTestId('google-oauth-login-button');
          fireEvent.click(googleButton);

          // Property: Error should be handled gracefully
          await waitFor(() => {
            expect(mockToast).toHaveBeenCalled();
          });

          const toastCall = mockToast.mock.calls[0][0];
          expect(toastCall.variant).toBe('destructive');
          expect(toastCall.title).toBe('Erro ao conectar com Google');
          expect(typeof toastCall.description).toBe('string');
          expect(toastCall.description.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 6 }
    );
  });

  /**
   * Test authentication method switching
   */
  it('should allow switching between authentication methods', async () => {
    const Auth = (await import('@/pages/Auth')).default;
    
    render(
      <TestWrapper>
        <Auth />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('agend4i')).toBeInTheDocument();
    });

    // Property: Should start on login tab
    const loginTab = screen.getByRole('tab', { name: /entrar/i });
    expect(loginTab).toHaveAttribute('data-state', 'active');

    // Property: Both OAuth and traditional auth should be available
    expect(screen.getByTestId('google-oauth-login-button')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();

    // Switch to signup
    const signupTab = screen.getByRole('tab', { name: /criar conta/i });
    fireEvent.click(signupTab);

    await waitFor(() => {
      expect(signupTab).toHaveAttribute('data-state', 'active');
    });

    // Property: OAuth and traditional auth should still be available
    expect(screen.getByTestId('google-oauth-signup-button')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument(); // Additional field for signup
  });

  /**
   * Test OAuth callback processing simulation
   */
  it('should process OAuth callback correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isNewUser: fc.boolean(),
          userEmail: fc.emailAddress(),
          userId: fc.uuid(),
        }),
        async ({ isNewUser, userEmail, userId }) => {
          // Mock successful session
          const { supabase } = await import('@/integrations/supabase/client');
          vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: {
              session: {
                user: {
                  id: userId,
                  email: userEmail,
                  email_confirmed_at: isNewUser ? null : new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  identities: [{
                    provider: 'google',
                    id: userId,
                  }],
                },
                access_token: 'test-token',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
              },
            },
            error: null,
          });

          const AuthCallback = (await import('@/pages/AuthCallback')).default;
          
          render(
            <TestWrapper>
              <AuthCallback />
            </TestWrapper>
          );

          // Property: Loading state should be shown initially
          expect(screen.getByText(/finalizando autenticação/i)).toBeInTheDocument();

          // Wait for processing
          await waitFor(() => {
            expect(mockToast).toHaveBeenCalled();
          }, { timeout: 3000 });

          // Property: Appropriate message should be shown
          const toastCall = mockToast.mock.calls[0][0];
          if (isNewUser) {
            expect(toastCall.title).toBe('Bem-vindo!');
          } else {
            expect(toastCall.title).toBe('Login realizado com sucesso!');
          }

          // Property: Navigation should occur
          await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalled();
          });

          const navigateCall = mockNavigate.mock.calls[0][0];
          if (isNewUser) {
            expect(navigateCall).toBe('/onboarding');
          } else {
            expect(navigateCall).toBe('/app');
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});