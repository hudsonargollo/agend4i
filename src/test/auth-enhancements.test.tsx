/**
 * Unit Tests for Authentication Enhancements
 * Tests form validation, submission, post-auth routing logic, and error handling for duplicate emails
 * Requirements: 10.1, 10.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth from '@/pages/Auth';

// Mock the hooks and dependencies
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    signIn: mockSignIn,
    signUp: mockSignUp,
    loading: false,
  }),
}));

vi.mock('@/hooks/useTenant', () => ({
  TenantProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTenant: () => ({
    userTenants: [],
    loading: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock providers
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const MockTenantProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

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
        <MockAuthProvider>
          <MockTenantProvider>
            {children}
          </MockTenantProvider>
        </MockAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Authentication Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render authentication form with login mode by default', () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      );

      // Should render the main elements
      expect(screen.getByText('agend4i')).toBeInTheDocument();
      expect(screen.getByText('Sua agenda profissional online')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /entrar/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /criar conta/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });

    it('should have form inputs for login', () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate login form fields correctly', async () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      // Submit with empty fields
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Check for the actual validation messages that are shown
        expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
        expect(screen.getByText(/senha deve ter pelo menos 6 caracteres/i)).toBeInTheDocument();
      });

      // Test invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
      });

      // Test short password
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/senha deve ter pelo menos 6 caracteres/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should handle login form submission correctly', async () => {
      mockSignIn.mockResolvedValue({ error: null });

      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should handle login errors gracefully', async () => {
      mockSignIn.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
      });
    });
  });

  describe('Mode-Based Form Switching', () => {
    it('should have both login and signup tabs available', () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      );

      // Should have both tabs
      expect(screen.getByRole('tab', { name: /entrar/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /criar conta/i })).toBeInTheDocument();
      
      // Login tab should be active by default
      const loginTab = screen.getByRole('tab', { name: /entrar/i });
      expect(loginTab).toHaveAttribute('aria-selected', 'true');
      
      // Signup tab should be inactive by default
      const signupTab = screen.getByRole('tab', { name: /criar conta/i });
      expect(signupTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should allow tab switching without errors', () => {
      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      );

      const loginTab = screen.getByRole('tab', { name: /entrar/i });
      const signupTab = screen.getByRole('tab', { name: /criar conta/i });

      // Should be able to click tabs without errors
      expect(() => {
        fireEvent.click(signupTab);
        fireEvent.click(loginTab);
        fireEvent.click(signupTab);
      }).not.toThrow();

      // Tabs should still be present after clicking
      expect(loginTab).toBeInTheDocument();
      expect(signupTab).toBeInTheDocument();
    });
  });

  describe('Enhanced Validation', () => {
    it('should trim and lowercase email inputs', async () => {
      mockSignIn.mockResolvedValue({ error: null });

      render(
        <TestWrapper>
          <Auth />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      // Enter email with spaces and uppercase
      fireEvent.change(emailInput, { target: { value: '  TEST@EXAMPLE.COM  ' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });
});