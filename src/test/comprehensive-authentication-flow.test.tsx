/**
 * Comprehensive Authentication Flow Tests
 * 
 * Tests complete OAuth sign-up and sign-in flows, routing, and user experience
 * across authentication methods including mobile and desktop experiences.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import { AuthProvider } from '@/hooks/useAuth';

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
        <AuthProvider>
          {children}
        </AuthProvider>
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

describe('Comprehensive Authentication Flow Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset to desktop viewport by default
    setViewport(1024, 768);
    
    // Setup default auth state
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test complete OAuth sign-up flow
   */
  it('should complete OAuth sign-up flow successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 }),
          isDesktop: fc.boolean(),
        }),
        async ({ userEmail, fullName, isDesktop }) => {
          // Set viewport based on test case
          if (isDesktop) {
            setViewport(1024, 768);
          } else {
            setViewport(375, 667); // Mobile viewport
          }

          // Mock successful OAuth response
          const { supabase } = await import('@/integrations/supabase/client');
          vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
            data: { url: 'https://accounts.google.com/oauth/authorize?...' },
            error: null,
          });

          render(
            <TestWrapper>
              <Auth />
            </TestWrapper>
          );

          // Wait for component to load
          await waitFor(() => {
            expect(screen.getByText('agend4i')).toBeInTheDocument();
          });

          // Switch to signup tab
          const signupTab = screen.getByRole('tab', { name: /criar conta/i });
          fireEvent.click(signupTab);

          // Find and click Google OAuth button
          const googleButton = screen.getByTestId('google-oauth-signup-button');
          expect(googleButton).toBeInTheDocument();
          expect(googleButton).not.toBeDisabled();

          // Property: Google button should be properly labeled and accessible
          expect(googleButton).toHaveAttribute('aria-label', 'Criar conta com Google');
          expect(googleButton.textContent).toContain('Continuar com Google');

          // Click Google OAuth button
          await act(async () => {
            fireEvent.click(googleButton);
          });

          // Property: OAuth flow should be initiated
          expect(supabase.auth.signInWithOAuth).toHaveBeenCalledOnce();
          
          const oauthCall = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0];
          expect(oauthCall.provider).toBe('google');
          expect(oauthCall.options.redirectTo).toContain('/auth/callback');
          expect(oauthCall.options.redirectTo).toContain('signup_mode=true');
          expect(oauthCall.options.queryParams.state).toBeDefined();
        }
      ),
      { numRuns: 5 } // Reduced for faster testing
    );
  });

  /**
   * Test complete OAuth sign-in flow
   */
  it('should complete OAuth sign-in flow successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userEmail: fc.emailAddress(),
          isDesktop: fc.boolean(),
        }),
        async ({ userEmail, isDesktop }) => {
          // Set viewport
          if (isDesktop) {
            setViewport(1024, 768);
          } else {
            setViewport(375, 667);
          }

          // Mock successful OAuth response
          const { supabase } = await import('@/integrations/supabase/client');
          vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
            data: { url: 'https://accounts.google.com/oauth/authorize?...' },
            error: null,
          });

          render(
            <TestWrapper>
              <Auth />
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText('agend4i')).toBeInTheDocument();
          });

          // Should default to login tab
          const loginTab = screen.getByRole('tab', { name: /entrar/i });
          expect(loginTab).toHaveAttribute('data-state', 'active');

          // Find and click Google OAuth button
          const googleButton = screen.getByTestId('google-oauth-login-button');
          expect(googleButton).toBeInTheDocument();
          expect(googleButton).not.toBeDisabled();

          // Property: Google button should be properly labeled
          expect(googleButton).toHaveAttribute('aria-label', 'Entrar com Google');

          await act(async () => {
            fireEvent.click(googleButton);
          });

          // Property: OAuth flow should be initiated without signup mode
          expect(supabase.auth.signInWithOAuth).toHaveBeenCalledOnce();
          
          const oauthCall = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0];
          expect(oauthCall.provider).toBe('google');
          expect(oauthCall.options.redirectTo).toContain('/auth/callback');
          expect(oauthCall.options.redirectTo).not.toContain('signup_mode=true');
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Test authentication method switching
   */
  it('should handle authentication method switching correctly', async () => {
    render(
      <TestWrapper>
        <Auth />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('agend4i')).toBeInTheDocument();
    });

    // Property: Both authentication methods should be available
    const googleButton = screen.getByTestId('google-oauth-login-button');
    expect(googleButton).toBeInTheDocument();
    expect(googleButton).not.toBeDisabled();

    // Property: Traditional email/password form should be available
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();

    // Property: Visual separation between methods should exist
    const separator = screen.getByText('ou');
    expect(separator).toBeInTheDocument();

    // Test switching to signup tab
    const signupTab = screen.getByRole('tab', { name: /criar conta/i });
    fireEvent.click(signupTab);

    // Property: Tab switching should work correctly
    await waitFor(() => {
      expect(signupTab).toHaveAttribute('data-state', 'active');
    });

    // Property: Google button should still be available after switching
    const signupGoogleButton = screen.getByTestId('google-oauth-signup-button');
    expect(signupGoogleButton).toBeInTheDocument();
    expect(signupGoogleButton).not.toBeDisabled();
  });

  /**
   * Test mobile vs desktop OAuth experience
   */
  it('should provide consistent OAuth experience across mobile and desktop', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          viewport: fc.constantFrom(
            { width: 375, height: 667, name: 'mobile' },
            { width: 1024, height: 768, name: 'desktop' }
          ),
          authMode: fc.constantFrom('login', 'signup'),
        }),
        async ({ viewport, authMode }) => {
          // Set viewport
          setViewport(viewport.width, viewport.height);

          render(
            <TestWrapper>
              <Auth />
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText('agend4i')).toBeInTheDocument();
          });

          // Switch to appropriate tab
          if (authMode === 'signup') {
            const signupTab = screen.getByRole('tab', { name: /criar conta/i });
            fireEvent.click(signupTab);
          }

          // Property: Google button should be accessible on all viewports
          const googleButton = authMode === 'signup'
            ? screen.getByTestId('google-oauth-signup-button')
            : screen.getByTestId('google-oauth-login-button');

          expect(googleButton).toBeInTheDocument();
          expect(googleButton).not.toBeDisabled();

          // Property: Button should be properly sized and clickable
          const buttonRect = googleButton.getBoundingClientRect();
          expect(buttonRect.width).toBeGreaterThan(0);
          expect(buttonRect.height).toBeGreaterThan(0);

          // Property: Google branding should be present
          const googleIcon = googleButton.querySelector('svg');
          expect(googleIcon).toBeInTheDocument();

          // Property: Button text should contain Google
          expect(googleButton.textContent).toContain('Google');

          // Property: Separator should be visible
          const separator = screen.getByText('ou');
          expect(separator).toBeInTheDocument();
        }
      ),
      { numRuns: 8 }
    );
  });

  /**
   * Test Zeroum account protection
   */
  it('should prevent OAuth authentication for Zeroum account', async () => {
    render(
      <TestWrapper>
        <Auth />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('agend4i')).toBeInTheDocument();
    });

    // Fill in Zeroum email in login form
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'zeroum@barbearia.com' } });

    // Try to click Google OAuth button
    const googleButton = screen.getByTestId('google-oauth-login-button');
    
    await act(async () => {
      fireEvent.click(googleButton);
    });

    // Property: OAuth should be prevented for Zeroum account
    const { supabase } = await import('@/integrations/supabase/client');
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    
    // Property: Error message should be shown
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Método de autenticação não permitido',
      description: 'Esta conta deve usar autenticação tradicional com email e senha.',
      variant: 'destructive',
    });
  });

  /**
   * Test error handling during OAuth flow
   */
  it('should handle OAuth errors gracefully', async () => {
    const errorMessage = 'server_error';
    
    // Mock OAuth error
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: null,
      error: { message: errorMessage },
    });

    render(
      <TestWrapper>
        <Auth />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('agend4i')).toBeInTheDocument();
    });

    const googleButton = screen.getByTestId('google-oauth-login-button');
    
    await act(async () => {
      fireEvent.click(googleButton);
    });

    // Property: Error should be handled gracefully
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });

    const toastCall = mockToast.mock.calls[0][0];
    expect(toastCall.variant).toBe('destructive');
    expect(toastCall.title).toBe('Erro ao conectar com Google');
    expect(toastCall.description).not.toContain(errorMessage); // Should be user-friendly
  });
});