/**
 * End-to-End User Journey Integration Tests
 * 
 * Tests complete user flows from landing page to booking completion,
 * including signup, onboarding, admin dashboard access, and feature gating.
 * 
 * Requirements: 9.1, 10.1, 10.4, 12.1, 12.2
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Import components for integration testing
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import PublicBooking from '@/pages/PublicBooking';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/useTenant', () => ({
  useTenant: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/lib/featureGating', () => ({
  useFeatureAccess: vi.fn(),
  hasFeatureAccess: vi.fn(),
  canPerformAction: vi.fn()
}));

vi.mock('@/lib/slugValidationService', () => ({
  validateSlugAvailability: vi.fn()
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '' }),
    useParams: () => ({ slug: 'test-tenant' })
  };
});

// Test data structures
interface TestUser {
  id: string;
  email: string;
  created_at: string;
}

interface TestTenant {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  plan: 'free' | 'pro';
  subscription_status: 'active' | 'inactive';
  settings: Record<string, any>;
}

interface TestService {
  id: string;
  tenant_id: string;
  name: string;
  duration_min: number;
  price: number;
  is_active: boolean;
}

interface TestStaff {
  id: string;
  tenant_id: string;
  display_name: string;
  is_active: boolean;
}

// Import the mocked functions
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useFeatureAccess } from '@/lib/featureGating';
import { validateSlugAvailability } from '@/lib/slugValidationService';

const mockUseAuth = vi.mocked(useAuth);
const mockUseTenant = vi.mocked(useTenant);
const mockUseFeatureAccess = vi.mocked(useFeatureAccess);
const mockValidateSlugAvailability = vi.mocked(validateSlugAvailability);

describe('End-to-End User Journey Integration Tests', () => {
  let mockSupabase: any;

  // Test data
  let testUser: TestUser;
  let testTenant: TestTenant;
  let testServices: TestService[];
  let testStaff: TestStaff[];

  beforeEach(() => {
    mockSupabase = supabase as any;

    vi.clearAllMocks();

    // Setup test data
    testUser = {
      id: 'user-journey-test',
      email: 'journey@test.com',
      created_at: '2024-12-15T10:00:00Z'
    };

    testTenant = {
      id: 'tenant-journey-test',
      slug: 'journey-barbershop',
      name: 'Journey Barbershop',
      owner_id: testUser.id,
      plan: 'free',
      subscription_status: 'inactive',
      settings: {}
    };

    testServices = [
      {
        id: 'service-1',
        tenant_id: testTenant.id,
        name: 'Corte de Cabelo',
        duration_min: 30,
        price: 25.00,
        is_active: true
      },
      {
        id: 'service-2',
        tenant_id: testTenant.id,
        name: 'Barba',
        duration_min: 20,
        price: 15.00,
        is_active: true
      }
    ];

    testStaff = [
      {
        id: 'staff-1',
        tenant_id: testTenant.id,
        display_name: 'João Barbeiro',
        is_active: true
      }
    ];

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn()
    });

    mockUseTenant.mockReturnValue({
      currentTenant: null,
      userTenants: [],
      loading: false,
      createTenant: vi.fn(),
      refreshTenants: vi.fn()
    });

    mockUseFeatureAccess.mockReturnValue({
      checkFeature: vi.fn().mockReturnValue(false),
      canPerform: vi.fn().mockReturnValue(false),
      currentPlan: 'free',
      subscriptionStatus: 'inactive'
    });

    mockValidateSlugAvailability.mockResolvedValue({
      available: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Journey: Landing → Signup → Onboarding → Dashboard', () => {
    it('should complete the full new user journey successfully', async () => {
      const user = userEvent.setup();

      // Step 1: Landing Page
      console.log('Step 1: Testing landing page...');
      const { rerender } = render(
        <BrowserRouter>
          <Index />
        </BrowserRouter>
      );

      // Verify landing page content
      expect(screen.getByText('Sua agenda profissional')).toBeInTheDocument();
      expect(screen.getByText(/Criar conta grátis/)).toBeInTheDocument();

      // Click signup CTA
      const signupButton = screen.getByRole('link', { name: /Criar conta grátis/ });
      expect(signupButton).toHaveAttribute('href', '/auth?mode=signup');

      // Step 2: Signup Process
      console.log('Step 2: Testing signup process...');
      
      // Mock successful signup
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: testUser, session: null },
        error: null
      });

      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: mockSignUp,
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      // Render auth page in signup mode
      rerender(
        <MemoryRouter initialEntries={['/auth?mode=signup']}>
          <Auth />
        </MemoryRouter>
      );

      // Fill signup form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { name: /criar conta/i });

      await user.type(emailInput, testUser.email);
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(mockSignUp).toHaveBeenCalledWith(testUser.email, 'password123');

      // Step 3: Post-signup redirect to onboarding
      console.log('Step 3: Testing onboarding flow...');
      
      // Mock authenticated user without tenant
      mockUseAuth.mockReturnValue({
        user: testUser,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: null,
        userTenants: [], // No tenants - should trigger onboarding
        loading: false,
        createTenant: vi.fn().mockResolvedValue({ error: null }),
        refreshTenants: vi.fn()
      });

      // Render onboarding page
      rerender(
        <BrowserRouter>
          <Onboarding />
        </BrowserRouter>
      );

      // Fill onboarding form
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, testTenant.name);

      // Continue to step 2
      const continueButton = screen.getByRole('button', { name: /continuar/i });
      await user.click(continueButton);

      // Wait for slug validation
      await waitFor(() => {
        expect(mockValidateSlugAvailability).toHaveBeenCalledWith('journey-barbershop');
      });

      // Create tenant
      const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
      await user.click(createButton);

      expect(mockUseTenant().createTenant).toHaveBeenCalledWith(testTenant.name, 'journey-barbershop');

      // Step 4: Redirect to admin dashboard
      console.log('Step 4: Testing admin dashboard access...');
      
      // Mock user with created tenant
      mockUseTenant.mockReturnValue({
        currentTenant: testTenant,
        userTenants: [testTenant],
        loading: false,
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      // Render dashboard
      rerender(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Verify dashboard content
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(testTenant.name)).toBeInTheDocument();

      console.log('✅ Complete user journey successful!');
    });

    it('should handle signup errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock signup error
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' }
      });

      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: mockSignUp,
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/auth?mode=signup']}>
          <Auth />
        </MemoryRouter>
      );

      // Fill and submit form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { name: /criar conta/i });

      await user.type(emailInput, 'existing@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
      });
    });

    it('should handle onboarding slug conflicts', async () => {
      const user = userEvent.setup();

      // Mock authenticated user
      mockUseAuth.mockReturnValue({
        user: testUser,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      // Mock slug validation failure
      mockValidateSlugAvailability.mockResolvedValue({
        available: false,
        error: 'Este link já está em uso',
        suggestions: ['journey-barbershop1', 'journey-barbershop2']
      });

      render(
        <BrowserRouter>
          <Onboarding />
        </BrowserRouter>
      );

      // Fill shop name
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Journey Barbershop');

      // Continue to step 2
      const continueButton = screen.getByRole('button', { name: /continuar/i });
      await user.click(continueButton);

      // Should show error and suggestions
      await waitFor(() => {
        expect(screen.getByText(/este link já está em uso/i)).toBeInTheDocument();
        expect(screen.getByText('journey-barbershop1')).toBeInTheDocument();
      });

      // Create button should be disabled
      const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
      expect(createButton).toBeDisabled();
    });
  });

  describe('Public Booking Flow with Newly Created Tenants', () => {
    it('should allow public booking on newly created tenant', async () => {
      const user = userEvent.setup();

      // Mock tenant resolution by slug
      const mockTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: testTenant,
          error: null
        })
      };

      // Mock services and staff queries
      const mockServicesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: testServices,
          error: null
        })
      };

      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: testStaff,
          error: null
        })
      };

      // Mock availability check
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      // Mock customer and booking creation
      const mockCustomerInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'customer-123' },
          error: null
        })
      };

      const mockBookingInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'booking-123' },
          error: null
        })
      };

      // Setup mock chain
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tenants') return mockTenantQuery;
        if (table === 'services') return mockServicesQuery;
        if (table === 'staff') return mockStaffQuery;
        if (table === 'customers') return mockCustomerInsert;
        if (table === 'bookings') return mockBookingInsert;
        return {};
      });

      // Mock public access (no authentication)
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      // Mock tenant resolution for public booking
      mockUseTenant.mockReturnValue({
        currentTenant: testTenant,
        userTenants: [],
        loading: false,
        mode: 'public',
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/journey-barbershop']}>
          <PublicBooking />
        </MemoryRouter>
      );

      // Verify tenant information is displayed
      await waitFor(() => {
        expect(screen.getByText(testTenant.name)).toBeInTheDocument();
      });

      // Verify services are displayed
      expect(screen.getByText('Corte de Cabelo')).toBeInTheDocument();
      expect(screen.getByText('Barba')).toBeInTheDocument();

      // Select service and staff
      const serviceButton = screen.getByText('Corte de Cabelo');
      await user.click(serviceButton);

      const staffButton = screen.getByText('João Barbeiro');
      await user.click(staffButton);

      // Fill customer information
      const nameInput = screen.getByLabelText(/nome/i);
      const phoneInput = screen.getByLabelText(/telefone/i);

      await user.type(nameInput, 'Carlos Silva');
      await user.type(phoneInput, '(11) 99999-9999');

      // Select date and time (mock date picker)
      const dateInput = screen.getByLabelText(/data/i);
      await user.type(dateInput, '2024-12-20');

      const timeSlot = screen.getByText('14:00');
      await user.click(timeSlot);

      // Submit booking
      const submitButton = screen.getByRole('button', { name: /agendar/i });
      await user.click(submitButton);

      // Verify booking creation
      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith('check_availability', expect.any(Object));
        expect(mockSupabase.from).toHaveBeenCalledWith('customers');
        expect(mockSupabase.from).toHaveBeenCalledWith('bookings');
      });

      console.log('✅ Public booking flow successful!');
    });

    it('should handle booking conflicts in public flow', async () => {
      const user = userEvent.setup();

      // Mock tenant and services setup (same as above)
      const mockTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: testTenant,
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockTenantQuery);

      // Mock availability check returning false (conflict)
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null
      });

      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: testTenant,
        userTenants: [],
        loading: false,
        mode: 'public',
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/journey-barbershop']}>
          <PublicBooking />
        </MemoryRouter>
      );

      // Fill booking form (abbreviated)
      await waitFor(() => {
        expect(screen.getByText(testTenant.name)).toBeInTheDocument();
      });

      // Try to book unavailable slot
      const timeSlot = screen.getByText('14:00');
      await user.click(timeSlot);

      // Should show conflict message
      await waitFor(() => {
        expect(screen.getByText(/horário não está mais disponível/i)).toBeInTheDocument();
      });
    });
  });

  describe('Feature Gating for Free vs Pro Plans', () => {
    it('should correctly gate features for Free Plan users', async () => {
      // Mock Free Plan tenant
      const freeTenant = {
        ...testTenant,
        plan: 'free' as const,
        subscription_status: 'inactive' as const
      };

      mockUseAuth.mockReturnValue({
        user: testUser,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: freeTenant,
        userTenants: [freeTenant],
        loading: false,
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      // Mock feature gating for Free Plan
      mockUseFeatureAccess.mockReturnValue({
        checkFeature: vi.fn().mockImplementation((feature: string) => {
          // Free plan doesn't have premium features
          return feature === 'basicBooking';
        }),
        canPerform: vi.fn().mockImplementation((action: string, currentCount?: number) => {
          if (action === 'addStaffMember') {
            return (currentCount || 0) < 1; // Free plan: max 1 staff
          }
          return false;
        }),
        currentPlan: 'free',
        subscriptionStatus: 'inactive',
        getUpgradeMessage: vi.fn().mockReturnValue('Upgrade to Pro to unlock this feature')
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Verify Free Plan limitations are shown
      await waitFor(() => {
        expect(screen.getByText(/plano gratuito/i)).toBeInTheDocument();
      });

      // WhatsApp settings should show upgrade prompt
      if (screen.queryByText(/whatsapp/i)) {
        expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
      }

      // Staff limit should be enforced
      const addStaffButton = screen.queryByText(/adicionar funcionário/i);
      if (addStaffButton) {
        // If there's already 1 staff member, button should be disabled
        expect(addStaffButton).toBeDisabled();
      }
    });

    it('should allow Pro Plan features for upgraded users', async () => {
      // Mock Pro Plan tenant
      const proTenant = {
        ...testTenant,
        plan: 'pro' as const,
        subscription_status: 'active' as const
      };

      mockUseAuth.mockReturnValue({
        user: testUser,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: proTenant,
        userTenants: [proTenant],
        loading: false,
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      // Mock feature gating for Pro Plan
      mockUseFeatureAccess.mockReturnValue({
        checkFeature: vi.fn().mockReturnValue(true), // All features available
        canPerform: vi.fn().mockReturnValue(true), // All actions allowed
        currentPlan: 'pro',
        subscriptionStatus: 'active',
        getUpgradeMessage: vi.fn()
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Verify Pro Plan features are available
      await waitFor(() => {
        expect(screen.getByText(/plano pro/i)).toBeInTheDocument();
      });

      // WhatsApp settings should be configurable
      if (screen.queryByText(/whatsapp/i)) {
        expect(screen.queryByText(/upgrade to pro/i)).not.toBeInTheDocument();
      }

      // Staff management should be unlimited
      const addStaffButton = screen.queryByText(/adicionar funcionário/i);
      if (addStaffButton) {
        expect(addStaffButton).not.toBeDisabled();
      }
    });

    it('should handle plan downgrades correctly', async () => {
      // Start with Pro Plan
      let currentTenant = {
        ...testTenant,
        plan: 'pro' as const,
        subscription_status: 'active' as const
      };

      const { rerender } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Mock Pro Plan features initially
      mockUseFeatureAccess.mockReturnValue({
        checkFeature: vi.fn().mockReturnValue(true),
        canPerform: vi.fn().mockReturnValue(true),
        currentPlan: 'pro',
        subscriptionStatus: 'active'
      });

      mockUseTenant.mockReturnValue({
        currentTenant,
        userTenants: [currentTenant],
        loading: false,
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      // Simulate subscription cancellation
      currentTenant = {
        ...currentTenant,
        plan: 'free',
        subscription_status: 'cancelled'
      };

      // Mock downgraded features
      mockUseFeatureAccess.mockReturnValue({
        checkFeature: vi.fn().mockImplementation((feature: string) => {
          return feature === 'basicBooking'; // Only basic features
        }),
        canPerform: vi.fn().mockImplementation((action: string, currentCount?: number) => {
          if (action === 'addStaffMember') {
            return (currentCount || 0) < 1;
          }
          return false;
        }),
        currentPlan: 'free',
        subscriptionStatus: 'cancelled'
      });

      mockUseTenant.mockReturnValue({
        currentTenant,
        userTenants: [currentTenant],
        loading: false,
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      // Re-render with downgraded plan
      rerender(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Should show downgrade notice
      await waitFor(() => {
        expect(screen.getByText(/assinatura cancelada/i)).toBeInTheDocument();
      });

      // Premium features should be locked again
      if (screen.queryByText(/whatsapp/i)) {
        expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors during user journey', async () => {
      const user = userEvent.setup();

      // Mock network error during signup
      const mockSignUp = vi.fn().mockRejectedValue(new Error('Network error'));

      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: mockSignUp,
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/auth?mode=signup']}>
          <Auth />
        </MemoryRouter>
      );

      // Try to sign up
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { name: /criar conta/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show network error
      await waitFor(() => {
        expect(screen.getByText(/erro de rede/i)).toBeInTheDocument();
      });
    });

    it('should handle tenant creation failures', async () => {
      const user = userEvent.setup();

      mockUseAuth.mockReturnValue({
        user: testUser,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      // Mock tenant creation failure
      const mockCreateTenant = vi.fn().mockResolvedValue({
        error: { message: 'Database error' }
      });

      mockUseTenant.mockReturnValue({
        currentTenant: null,
        userTenants: [],
        loading: false,
        createTenant: mockCreateTenant,
        refreshTenants: vi.fn()
      });

      render(
        <BrowserRouter>
          <Onboarding />
        </BrowserRouter>
      );

      // Fill onboarding form
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');

      const continueButton = screen.getByRole('button', { name: /continuar/i });
      await user.click(continueButton);

      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText(/✓ link disponível/i)).toBeInTheDocument();
      });

      // Try to create tenant
      const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
      await user.click(createButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/erro ao criar estabelecimento/i)).toBeInTheDocument();
      });
    });

    it('should handle missing tenant data gracefully', async () => {
      // Mock tenant not found
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: null,
        userTenants: [],
        loading: false,
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/nonexistent-tenant']}>
          <PublicBooking />
        </MemoryRouter>
      );

      // Should show tenant not found message
      await waitFor(() => {
        expect(screen.getByText(/estabelecimento não encontrado/i)).toBeInTheDocument();
      });
    });
  });
});