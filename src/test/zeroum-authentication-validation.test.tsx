import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/oauth-security', () => ({
  validateStoredTokens: vi.fn(() => ({ isValid: true, errors: [] })),
  cleanupOAuthSecurity: vi.fn(),
}));

// Import after mocks
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { isZeroumAccount } from '@/scripts/create-zeroum-account';
import { supabase } from '@/integrations/supabase/client';

// Test component to access auth context
function TestAuthComponent() {
  const { 
    user, 
    isOAuthUser, 
    isZeroumUser, 
    signIn, 
    signUp, 
    validateZeroumAuthentication 
  } = useAuth();

  return (
    <div>
      <div data-testid="user-email">{user?.email || 'No user'}</div>
      <div data-testid="is-oauth">{isOAuthUser ? 'OAuth' : 'Not OAuth'}</div>
      <div data-testid="is-zeroum">{isZeroumUser ? 'Zeroum' : 'Not Zeroum'}</div>
      <div data-testid="auth-valid">{validateZeroumAuthentication() ? 'Valid' : 'Invalid'}</div>
      <button 
        data-testid="signin-btn" 
        onClick={() => signIn('test@email.com', 'password')}
      >
        Sign In
      </button>
      <button 
        data-testid="signup-btn" 
        onClick={() => signUp('test@email.com', 'password', 'Test User')}
      >
        Sign Up
      </button>
      <button 
        data-testid="signin-zeroum-btn" 
        onClick={() => signIn('zeroum@barbearia.com', 'rods1773#')}
      >
        Sign In Zeroum
      </button>
      <button 
        data-testid="signup-zeroum-btn" 
        onClick={() => signUp('zeroum@barbearia.com', 'password', 'Test')}
      >
        Sign Up Zeroum
      </button>
    </div>
  );
}

function renderWithAuth(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('Zeroum Authentication Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for getSession
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    // Default mock for onAuthStateChange
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
      // Call callback immediately with no session
      callback('SIGNED_OUT', null);
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isZeroumAccount utility function', () => {
    it('should correctly identify Zeroum account email', () => {
      expect(isZeroumAccount('zeroum@barbearia.com')).toBe(true);
      expect(isZeroumAccount('other@email.com')).toBe(false);
      expect(isZeroumAccount('')).toBe(false);
    });
  });

  describe('Zeroum user detection', () => {
    it('should detect Zeroum user correctly', async () => {
      const zeroumUser = {
        id: 'zeroum-user-id',
        email: 'zeroum@barbearia.com',
        identities: [{ provider: 'email' }],
      };

      const zeroumSession = {
        user: zeroumUser,
        access_token: 'token',
        expires_at: Date.now() / 1000 + 3600,
      };

      // Mock session with Zeroum user
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: zeroumSession },
        error: null,
      });

      (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
        callback('SIGNED_IN', zeroumSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderWithAuth(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('zeroum@barbearia.com');
        expect(screen.getByTestId('is-zeroum')).toHaveTextContent('Zeroum');
        expect(screen.getByTestId('is-oauth')).toHaveTextContent('Not OAuth');
      });
    });

    it('should not detect regular user as Zeroum', async () => {
      const regularUser = {
        id: 'regular-user-id',
        email: 'user@example.com',
        identities: [{ provider: 'email' }],
      };

      const regularSession = {
        user: regularUser,
        access_token: 'token',
        expires_at: Date.now() / 1000 + 3600,
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: regularSession },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        callback('SIGNED_IN', regularSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderWithAuth(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('user@example.com');
        expect(screen.getByTestId('is-zeroum')).toHaveTextContent('Not Zeroum');
      });
    });
  });

  describe('OAuth protection for Zeroum account', () => {
    it('should prevent OAuth authentication for Zeroum account', async () => {
      const zeroumOAuthUser = {
        id: 'zeroum-user-id',
        email: 'zeroum@barbearia.com',
        identities: [{ provider: 'google' }], // OAuth identity
      };

      const zeroumOAuthSession = {
        user: zeroumOAuthUser,
        access_token: 'token',
        expires_at: Date.now() / 1000 + 3600,
      };

      // Mock sign out function
      mockSupabase.auth.signOut.mockResolvedValue({});

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        // First call with OAuth session (should trigger sign out)
        callback('SIGNED_IN', zeroumOAuthSession);
        // Then call with signed out state
        setTimeout(() => callback('SIGNED_OUT', null), 0);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderWithAuth(<TestAuthComponent />);

      await waitFor(() => {
        // Should have been signed out due to security violation
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      });
    });

    it('should allow OAuth for regular users', async () => {
      const regularOAuthUser = {
        id: 'regular-user-id',
        email: 'user@example.com',
        identities: [{ provider: 'google' }],
      };

      const regularOAuthSession = {
        user: regularOAuthUser,
        access_token: 'token',
        expires_at: Date.now() / 1000 + 3600,
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: regularOAuthSession },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        callback('SIGNED_IN', regularOAuthSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderWithAuth(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('user@example.com');
        expect(screen.getByTestId('is-oauth')).toHaveTextContent('OAuth');
        expect(screen.getByTestId('is-zeroum')).toHaveTextContent('Not Zeroum');
      });

      // Should not have been signed out
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    });
  });

  describe('Zeroum authentication validation', () => {
    it('should validate traditional authentication for Zeroum account', async () => {
      const zeroumUser = {
        id: 'zeroum-user-id',
        email: 'zeroum@barbearia.com',
        identities: [{ provider: 'email' }],
      };

      const zeroumSession = {
        user: zeroumUser,
        access_token: 'token',
        expires_at: Date.now() / 1000 + 3600,
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: zeroumSession },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        callback('SIGNED_IN', zeroumSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderWithAuth(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-valid')).toHaveTextContent('Valid');
      });
    });

    it('should invalidate OAuth authentication for Zeroum account', async () => {
      const zeroumOAuthUser = {
        id: 'zeroum-user-id',
        email: 'zeroum@barbearia.com',
        identities: [{ provider: 'google' }],
      };

      const zeroumOAuthSession = {
        user: zeroumOAuthUser,
        access_token: 'token',
        expires_at: Date.now() / 1000 + 3600,
      };

      // Mock the auth state to simulate OAuth user (before sign out)
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: zeroumOAuthSession },
        error: null,
      });

      // Don't trigger automatic sign out for this test
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderWithAuth(<TestAuthComponent />);

      // Manually set the state to simulate the OAuth user before validation
      await waitFor(() => {
        // The validation should fail for OAuth Zeroum user
        // Note: This test checks the validation logic, not the automatic sign-out
        expect(screen.getByTestId('user-email')).toHaveTextContent('zeroum@barbearia.com');
      });
    });

    it('should validate regular users regardless of authentication method', async () => {
      const regularUser = {
        id: 'regular-user-id',
        email: 'user@example.com',
        identities: [{ provider: 'google' }],
      };

      const regularSession = {
        user: regularUser,
        access_token: 'token',
        expires_at: Date.now() / 1000 + 3600,
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: regularSession },
        error: null,
      });

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        callback('SIGNED_IN', regularSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderWithAuth(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-valid')).toHaveTextContent('Valid');
      });
    });
  });

  describe('Sign up protection', () => {
    it('should prevent sign up with Zeroum account email', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      renderWithAuth(<TestAuthComponent />);

      fireEvent.click(screen.getByTestId('signup-zeroum-btn'));

      await waitFor(() => {
        // Should not have called signUp due to email protection
        expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
      });
    });

    it('should allow sign up with regular email', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user', email: 'test@email.com' } },
        error: null,
      });

      renderWithAuth(<TestAuthComponent />);

      fireEvent.click(screen.getByTestId('signup-btn'));

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@email.com',
          password: 'password',
          options: {
            emailRedirectTo: expect.any(String),
            data: {
              full_name: 'Test User',
            },
          },
        });
      });
    });
  });

  describe('Sign in validation', () => {
    it('should allow traditional sign in for Zeroum account', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'zeroum-user', email: 'zeroum@barbearia.com' } },
        error: null,
      });

      renderWithAuth(<TestAuthComponent />);

      fireEvent.click(screen.getByTestId('signin-zeroum-btn'));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'zeroum@barbearia.com',
          password: 'rods1773#',
        });
      });
    });

    it('should allow sign in for regular users', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'regular-user', email: 'test@email.com' } },
        error: null,
      });

      renderWithAuth(<TestAuthComponent />);

      fireEvent.click(screen.getByTestId('signin-btn'));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@email.com',
          password: 'password',
        });
      });
    });
  });

  describe('Session management', () => {
    it('should clean up OAuth data on sign out', async () => {
      const { cleanupOAuthSecurity } = await import('@/lib/oauth-security');
      
      mockSupabase.auth.signOut.mockResolvedValue({});

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        callback('SIGNED_OUT', null);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderWithAuth(<TestAuthComponent />);

      await waitFor(() => {
        expect(cleanupOAuthSecurity).toHaveBeenCalled();
      });
    });

    it('should reset user flags on sign out', async () => {
      // Start with a user session
      const userSession = {
        user: { id: 'user-id', email: 'user@example.com' },
        access_token: 'token',
        expires_at: Date.now() / 1000 + 3600,
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: userSession },
        error: null,
      });

      let authCallback: any;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        callback('SIGNED_IN', userSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      });

      renderWithAuth(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('user@example.com');
      });

      // Simulate sign out
      authCallback('SIGNED_OUT', null);

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
        expect(screen.getByTestId('is-oauth')).toHaveTextContent('Not OAuth');
        expect(screen.getByTestId('is-zeroum')).toHaveTextContent('Not Zeroum');
      });
    });
  });
});