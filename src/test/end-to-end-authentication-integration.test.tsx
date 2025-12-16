/**
 * End-to-End Authentication Integration Tests
 * 
 * Tests complete authentication flows including OAuth, method switching,
 * and session persistence across authentication methods.
 * 
 * Requirements: All requirements (1.1-5.5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    refreshSession: vi.fn().mockResolvedValue({ error: null }),
    validateZeroumAuthentication: vi.fn().mockReturnValue(true),
    switchAuthMethod: vi.fn().mockResolvedValue({ error: null }),
    getAuthMethodCompatibility: vi.fn().mockReturnValue({
      canSwitchToEmail: true,
      canSwitchToGoogle: true,
      reasons: [],
    }),
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

describe('End-to-End Authentication Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth/authorize?...' },
      error: null,
    });
    
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  /**
   * Test complete OAuth sign-up flow
   */
  it('should complete end-to-end OAuth sign-up flow', async () => {
    const Auth = (await import('@/pages/Auth')).default;
    
    render(
      <TestWrapper>
        <Auth />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('agend4i')).toBeInTheDocument();
    });

    // Navigate to signup tab
    const signupTab = screen.getByRole('tab', { name: /criar conta/i });
    fireEvent.click(signupTab);

    // Verify OAuth button is available
    const googleButton = screen.getByTestId('google-oauth-signup-button');
    expect(googleButton).toBeInTheDocument();
    expect(googleButton.textContent).toContain('Google');

    // Click OAuth button to initiate flow
    await act(async () => {
      fireEvent.click(googleButton);
    });

    // Verify OAuth flow was initiated
    const { supabase } = await import('@/integrations/supabase/client');
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/callback'),
        queryParams: expect.objectContaining({
          state: 'test-state',
        }),
      }),
    });

    // Verify signup mode is indicated
    const oauthCall = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0];
    expect(oauthCall.options.redirectTo).toContain('signup_mode=true');
  });

  /**
   * Test complete OAuth sign-in flow
   */
  it('should complete end-to-end OAuth sign-in flow', async () => {
    const Auth = (await import('@/pages/Auth')).default;
    
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

    // Verify OAuth button is available
    const googleButton = screen.getByTestId('google-oauth-login-button');
    expect(googleButton).toBeInTheDocument();

    // Click OAuth button to initiate flow
    await act(async () => {
      fireEvent.click(googleButton);
    });

    // Verify OAuth flow was initiated without signup mode
    const { supabase } = await import('@/integrations/supabase/client');
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/callback'),
        queryParams: expect.objectContaining({
          state: 'test-state',
        }),
      }),
    });

    const oauthCall = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0];
    expect(oauthCall.options.redirectTo).not.toContain('signup_mode=true');
  });

  /**
   * Test OAuth callback processing for new users
   */
  it('should process OAuth callback for new users correctly', async () => {
    // Mock successful session for new user
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'new-user-id',
            email: 'newuser@example.com',
            email_confirmed_at: null, // Indicates new user
            created_at: new Date().toISOString(),
            identities: [{
              provider: 'google',
              id: 'google-identity-id',
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

    // Verify loading state
    expect(screen.getByText(/finalizando autenticação/i)).toBeInTheDocument();

    // Wait for processing to complete
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Verify new user welcome message
    const toastCall = mockToast.mock.calls[0][0];
    expect(toastCall.title).toBe('Bem-vindo!');
    expect(toastCall.description).toContain('Configure seu negócio');

    // Verify navigation to onboarding
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
    });
  });

  /**
   * Test OAuth callback processing for existing users
   */
  it('should process OAuth callback for existing users correctly', async () => {
    // Mock successful session for existing user
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'existing-user-id',
            email: 'existinguser@example.com',
            email_confirmed_at: new Date('2023-01-01').toISOString(), // Indicates existing user
            created_at: new Date('2023-01-01').toISOString(),
            identities: [{
              provider: 'google',
              id: 'google-identity-id',
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

    // Wait for processing to complete
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Verify existing user login message
    const toastCall = mockToast.mock.calls[0][0];
    expect(toastCall.title).toBe('Login realizado com sucesso!');

    // Verify navigation to dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });

  /**
   * Test authentication method switching between OAuth and traditional
   */
  it('should support switching between authentication methods', async () => {
    const Auth = (await import('@/pages/Auth')).default;
    
    render(
      <TestWrapper>
        <Auth />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('agend4i')).toBeInTheDocument();
    });

    // Verify both authentication methods are available on login
    expect(screen.getByTestId('google-oauth-login-button')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();

    // Verify visual separation exists
    expect(screen.getByText('ou')).toBeInTheDocument();

    // Switch to signup tab
    const signupTab = screen.getByRole('tab', { name: /criar conta/i });
    fireEvent.click(signupTab);

    // Verify both methods are still available on signup
    expect(screen.getByTestId('google-oauth-signup-button')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument(); // Additional field for signup

    // Test traditional email/password signup
    const nameInput = screen.getByLabelText(/nome/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /criar conta/i });

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'TestPass123' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify traditional signup was attempted
    const { useAuth } = await import('@/hooks/useAuth');
    const mockAuth = useAuth();
    expect(mockAuth.signUp).toHaveBeenCalledWith(
      'test@example.com',
      'TestPass123',
      'Test User'
    );
  });

  /**
   * Test Zeroum account protection across authentication methods
   */
  it('should protect Zeroum account from OAuth authentication', async () => {
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

    // Try to use OAuth with Zeroum email
    const googleButton = screen.getByTestId('google-oauth-login-button');
    await act(async () => {
      fireEvent.click(googleButton);
    });

    // Verify OAuth was prevented
    const { supabase } = await import('@/integrations/supabase/client');
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();

    // Verify error message was shown
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Método de autenticação não permitido',
      description: 'Esta conta deve usar autenticação tradicional com email e senha.',
      variant: 'destructive',
    });

    // Test that traditional authentication still works for Zeroum
    const passwordInput = screen.getByLabelText(/senha/i);
    const loginButton = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(passwordInput, { target: { value: 'rods1773#' } });

    await act(async () => {
      fireEvent.click(loginButton);
    });

    // Verify traditional login was attempted
    const { useAuth } = await import('@/hooks/useAuth');
    const mockAuth = useAuth();
    expect(mockAuth.signIn).toHaveBeenCalledWith('zeroum@barbearia.com', 'rods1773#');
  });

  /**
   * Test session persistence across authentication methods
   */
  it('should maintain session consistency across authentication methods', async () => {
    // Mock authenticated session
    const { supabase } = await import('@/integrations/supabase/client');
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        identities: [{ provider: 'google' }],
      },
      access_token: 'test-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Test session refresh
    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { useAuth } = await import('@/hooks/useAuth');
    const mockAuth = useAuth();

    // Test session refresh
    const refreshResult = await mockAuth.refreshSession();
    expect(refreshResult.error).toBeNull();
    expect(supabase.auth.refreshSession).toHaveBeenCalled();

    // Test sign out
    await mockAuth.signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  /**
   * Test error handling across authentication flows
   */
  it('should handle errors consistently across authentication methods', async () => {
    const Auth = (await import('@/pages/Auth')).default;
    
    render(
      <TestWrapper>
        <Auth />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('agend4i')).toBeInTheDocument();
    });

    // Test OAuth error handling
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: null,
      error: { message: 'server_error' },
    });

    const googleButton = screen.getByTestId('google-oauth-login-button');
    await act(async () => {
      fireEvent.click(googleButton);
    });

    // Verify OAuth error was handled
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });

    const oauthErrorCall = mockToast.mock.calls.find(call => 
      call[0].title === 'Erro ao conectar com Google'
    );
    expect(oauthErrorCall).toBeDefined();
    expect(oauthErrorCall[0].variant).toBe('destructive');

    // Test traditional auth error handling
    const { useAuth } = await import('@/hooks/useAuth');
    const mockAuth = useAuth();
    vi.mocked(mockAuth.signIn).mockResolvedValue({ 
      error: new Error('Invalid login credentials') 
    });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const loginButton = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    await act(async () => {
      fireEvent.click(loginButton);
    });

    // Verify traditional auth error was handled
    await waitFor(() => {
      const authErrorCall = mockToast.mock.calls.find(call => 
        call[0].title === 'Erro ao entrar'
      );
      expect(authErrorCall).toBeDefined();
      expect(authErrorCall[0].variant).toBe('destructive');
    });
  });

  /**
   * Test OAuth callback error handling
   */
  it('should handle OAuth callback errors gracefully', async () => {
    // Mock OAuth callback validation failure
    const { validateOAuthCallback } = await import('@/lib/oauth-security');
    vi.mocked(validateOAuthCallback).mockResolvedValue({
      isValid: false,
      errors: ['CSRF token validation failed'],
      warnings: [],
    });

    const AuthCallback = (await import('@/pages/AuthCallback')).default;
    
    render(
      <TestWrapper>
        <AuthCallback />
      </TestWrapper>
    );

    // Wait for error handling
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Verify error was handled appropriately
    const errorCall = mockToast.mock.calls[0][0];
    expect(errorCall.variant).toBe('destructive');
    expect(errorCall.title).toBe('Erro na autenticação');

    // Verify navigation back to auth page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });
});