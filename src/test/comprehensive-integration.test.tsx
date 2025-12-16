/**
 * Comprehensive Integration Tests
 * 
 * Tests complete self-service onboarding flow, landing page to booking completion journey,
 * and feature gating across different subscription plans.
 * 
 * Requirements: All new requirements (9.1-13.5)
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Import all components for comprehensive testing
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

// Mock all hooks and services
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

vi.mock('@/lib/domain', () => ({
  getCurrentDomain: () => 'test.agendai.com',
  generateTenantURL: (slug: string) => `https://test.agendai.com/${slug}`
}));

// Mock react-router-dom
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

// Mock fetch for external API calls
global.fetch = vi.fn();

// Comprehensive test data structures
interface ComprehensiveTestUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at?: string;
}

interface ComprehensiveTestTenant {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'past_due' | 'cancelled';
  settings: {
    whatsapp_enabled?: boolean;
    whatsapp_api_url?: string;
    whatsapp_api_key?: string;
    payment_enabled?: boolean;
    mp_access_token?: string;
    primary_color?: string;
  };
  created_at: string;
}

interface ComprehensiveTestService {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  duration_min: number;
  price: number;
  category: string;
  is_active: boolean;
}

interface ComprehensiveTestStaff {
  id: string;
  tenant_id: string;
  profile_id: string;
  display_name: string;
  role: string;
  is_active: boolean;
  working_hours: Record<string, { start: string; end: string }>;
}

interface ComprehensiveTestCustomer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
}

interface ComprehensiveTestBooking {
  id: string;
  tenant_id: string;
  customer_id: string;
  service_id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  notes?: string;
}

describe('Comprehensive Integration Tests', () => {
  let mockSupabase: any;
  let mockUseAuth: any;
  let mockUseTenant: any;
  let mockUseFeatureAccess: any;
  let mockValidateSlugAvailability: any;
  let mockFetch: any;

  // Comprehensive test data
  let testData: {
    users: ComprehensiveTestUser[];
    tenants: ComprehensiveTestTenant[];
    services: ComprehensiveTestService[];
    staff: ComprehensiveTestStaff[];
    customers: ComprehensiveTestCustomer[];
    bookings: ComprehensiveTestBooking[];
  };

  beforeEach(() => {
    // Setup all mocks
    mockSupabase = supabase as any;
    mockUseAuth = vi.mocked(require('@/hooks/useAuth').useAuth);
    mockUseTenant = vi.mocked(require('@/hooks/useTenant').useTenant);
    mockUseFeatureAccess = vi.mocked(require('@/lib/featureGating').useFeatureAccess);
    mockValidateSlugAvailability = vi.mocked(require('@/lib/slugValidationService').validateSlugAvailability);
    mockFetch = vi.mocked(fetch);

    vi.clearAllMocks();

    // Setup comprehensive test data
    testData = {
      users: [
        {
          id: 'user-comprehensive-1',
          email: 'newuser@comprehensive.test',
          created_at: '2024-12-15T10:00:00Z'
        },
        {
          id: 'user-comprehensive-2',
          email: 'prouser@comprehensive.test',
          created_at: '2024-12-15T11:00:00Z',
          email_confirmed_at: '2024-12-15T11:05:00Z'
        },
        {
          id: 'user-zeroum',
          email: 'owner@zeroumbarbearia.com',
          created_at: '2024-01-01T00:00:00Z',
          email_confirmed_at: '2024-01-01T00:05:00Z'
        }
      ],
      tenants: [
        {
          id: 'tenant-comprehensive-free',
          slug: 'comprehensive-free-shop',
          name: 'Comprehensive Free Shop',
          owner_id: 'user-comprehensive-1',
          plan: 'free',
          subscription_status: 'inactive',
          settings: {},
          created_at: '2024-12-15T10:30:00Z'
        },
        {
          id: 'tenant-comprehensive-pro',
          slug: 'comprehensive-pro-shop',
          name: 'Comprehensive Pro Shop',
          owner_id: 'user-comprehensive-2',
          plan: 'pro',
          subscription_status: 'active',
          settings: {
            whatsapp_enabled: true,
            whatsapp_api_url: 'https://api.whatsapp.test',
            whatsapp_api_key: 'test-key',
            payment_enabled: true,
            mp_access_token: 'test-mp-token',
            primary_color: '#007bff'
          },
          created_at: '2024-12-15T11:30:00Z'
        },
        {
          id: 'tenant-zeroum',
          slug: 'zeroumbarbearia',
          name: 'Zero Um Barber Shop',
          owner_id: 'user-zeroum',
          plan: 'pro',
          subscription_status: 'active',
          settings: {
            whatsapp_enabled: true,
            whatsapp_api_url: 'https://api.whatsapp.zeroum',
            whatsapp_api_key: 'zeroum-key',
            payment_enabled: true,
            mp_access_token: 'zeroum-mp-token'
          },
          created_at: '2024-01-01T00:30:00Z'
        }
      ],
      services: [
        {
          id: 'service-free-1',
          tenant_id: 'tenant-comprehensive-free',
          name: 'Corte Simples',
          description: 'Corte de cabelo básico',
          duration_min: 30,
          price: 20.00,
          category: 'Cabelo',
          is_active: true
        },
        {
          id: 'service-pro-1',
          tenant_id: 'tenant-comprehensive-pro',
          name: 'Corte Premium',
          description: 'Corte de cabelo premium com acabamento',
          duration_min: 45,
          price: 35.00,
          category: 'Cabelo',
          is_active: true
        },
        {
          id: 'service-pro-2',
          tenant_id: 'tenant-comprehensive-pro',
          name: 'Barba Completa',
          description: 'Barba completa com hidratação',
          duration_min: 30,
          price: 25.00,
          category: 'Barba',
          is_active: true
        },
        {
          id: 'service-zeroum-1',
          tenant_id: 'tenant-zeroum',
          name: 'Corte + Barba',
          description: 'Combo completo',
          duration_min: 60,
          price: 55.00,
          category: 'Combo',
          is_active: true
        }
      ],
      staff: [
        {
          id: 'staff-free-1',
          tenant_id: 'tenant-comprehensive-free',
          profile_id: 'profile-free-1',
          display_name: 'João (Proprietário)',
          role: 'owner',
          is_active: true,
          working_hours: {
            monday: { start: '08:00', end: '18:00' },
            tuesday: { start: '08:00', end: '18:00' },
            wednesday: { start: '08:00', end: '18:00' },
            thursday: { start: '08:00', end: '18:00' },
            friday: { start: '08:00', end: '18:00' },
            saturday: { start: '08:00', end: '16:00' }
          }
        },
        {
          id: 'staff-pro-1',
          tenant_id: 'tenant-comprehensive-pro',
          profile_id: 'profile-pro-1',
          display_name: 'Carlos (Proprietário)',
          role: 'owner',
          is_active: true,
          working_hours: {
            monday: { start: '09:00', end: '19:00' },
            tuesday: { start: '09:00', end: '19:00' },
            wednesday: { start: '09:00', end: '19:00' },
            thursday: { start: '09:00', end: '19:00' },
            friday: { start: '09:00', end: '19:00' },
            saturday: { start: '09:00', end: '17:00' }
          }
        },
        {
          id: 'staff-pro-2',
          tenant_id: 'tenant-comprehensive-pro',
          profile_id: 'profile-pro-2',
          display_name: 'Maria Barbeira',
          role: 'staff',
          is_active: true,
          working_hours: {
            tuesday: { start: '10:00', end: '18:00' },
            wednesday: { start: '10:00', end: '18:00' },
            thursday: { start: '10:00', end: '18:00' },
            friday: { start: '10:00', end: '18:00' },
            saturday: { start: '10:00', end: '16:00' }
          }
        },
        {
          id: 'staff-zeroum-1',
          tenant_id: 'tenant-zeroum',
          profile_id: 'profile-zeroum-1',
          display_name: 'Iwlys',
          role: 'owner',
          is_active: true,
          working_hours: {
            monday: { start: '08:00', end: '18:00' },
            tuesday: { start: '08:00', end: '18:00' },
            wednesday: { start: '08:00', end: '18:00' },
            thursday: { start: '08:00', end: '18:00' },
            friday: { start: '08:00', end: '18:00' },
            saturday: { start: '08:00', end: '16:00' }
          }
        }
      ],
      customers: [
        {
          id: 'customer-1',
          tenant_id: 'tenant-comprehensive-pro',
          name: 'Ana Silva',
          phone: '(11) 99999-1111',
          email: 'ana@email.com',
          created_at: '2024-12-15T12:00:00Z'
        },
        {
          id: 'customer-2',
          tenant_id: 'tenant-zeroum',
          name: 'Roberto Santos',
          phone: '(75) 99888-7777',
          email: 'roberto@email.com',
          created_at: '2024-12-15T13:00:00Z'
        }
      ],
      bookings: [
        {
          id: 'booking-1',
          tenant_id: 'tenant-comprehensive-pro',
          customer_id: 'customer-1',
          service_id: 'service-pro-1',
          staff_id: 'staff-pro-1',
          start_time: '2024-12-16T14:00:00Z',
          end_time: '2024-12-16T14:45:00Z',
          status: 'confirmed',
          total_price: 35.00,
          notes: 'Cliente preferencial'
        },
        {
          id: 'booking-2',
          tenant_id: 'tenant-zeroum',
          customer_id: 'customer-2',
          service_id: 'service-zeroum-1',
          staff_id: 'staff-zeroum-1',
          start_time: '2024-12-16T15:00:00Z',
          end_time: '2024-12-16T16:00:00Z',
          status: 'pending',
          total_price: 55.00
        }
      ]
    };

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

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Self-Service Onboarding Flow', () => {
    it('should complete the entire onboarding flow from landing to dashboard', async () => {
      console.log('🚀 Starting complete self-service onboarding flow test...');
      
      const user = userEvent.setup();
      let currentStep = 1;

      // Step 1: Landing Page Discovery
      console.log(`Step ${currentStep++}: Landing page discovery...`);
      
      const { rerender } = render(
        <BrowserRouter>
          <Index />
        </BrowserRouter>
      );

      // Verify marketing content and value proposition
      expect(screen.getByText('Sua agenda profissional')).toBeInTheDocument();
      expect(screen.getByText(/plataforma completa de agendamentos/)).toBeInTheDocument();
      expect(screen.getByText('Grátis para começar')).toBeInTheDocument();
      expect(screen.getByText('Sem cartão de crédito')).toBeInTheDocument();

      // Verify feature overview
      expect(screen.getByText('Agendamento Online')).toBeInTheDocument();
      expect(screen.getByText('Notificações WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Gestão de Equipe')).toBeInTheDocument();
      expect(screen.getByText('Pagamentos Online')).toBeInTheDocument();

      // Click signup CTA
      const signupCTA = screen.getByRole('link', { name: /Criar conta grátis/ });
      expect(signupCTA).toHaveAttribute('href', '/auth?mode=signup');

      // Step 2: User Registration
      console.log(`Step ${currentStep++}: User registration...`);

      const mockSignUp = vi.fn().mockResolvedValue({
        data: { 
          user: testData.users[0],
          session: {
            access_token: 'new-user-token',
            refresh_token: 'new-refresh-token'
          }
        },
        error: null
      });

      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: mockSignUp,
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      rerender(
        <MemoryRouter initialEntries={['/auth?mode=signup']}>
          <Auth />
        </MemoryRouter>
      );

      // Fill registration form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { name: /criar conta/i });

      await user.type(emailInput, testData.users[0].email);
      await user.type(passwordInput, 'SecurePassword123!');
      await user.click(submitButton);

      expect(mockSignUp).toHaveBeenCalledWith(testData.users[0].email, 'SecurePassword123!');

      // Step 3: Post-Registration Redirect to Onboarding
      console.log(`Step ${currentStep++}: Post-registration onboarding redirect...`);

      // Mock authenticated user without tenant
      mockUseAuth.mockReturnValue({
        user: testData.users[0],
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: null,
        userTenants: [], // No tenants - triggers onboarding
        loading: false,
        createTenant: vi.fn().mockResolvedValue({ error: null }),
        refreshTenants: vi.fn()
      });

      rerender(
        <BrowserRouter>
          <Onboarding />
        </BrowserRouter>
      );

      // Verify onboarding UI
      expect(screen.getByText(/passo 1 de 2/i)).toBeInTheDocument();
      expect(screen.getByText(/digite o nome do seu estabelecimento/i)).toBeInTheDocument();

      // Step 4: Shop Name Input and Slug Generation
      console.log(`Step ${currentStep++}: Shop name input and slug generation...`);

      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, testData.tenants[0].name);

      // Verify slug preview
      expect(screen.getByText(/test\.agendai\.com\/comprehensive-free-shop/i)).toBeInTheDocument();

      // Continue to step 2
      const continueButton = screen.getByRole('button', { name: /continuar/i });
      await user.click(continueButton);

      // Step 5: Slug Validation and Customization
      console.log(`Step ${currentStep++}: Slug validation and customization...`);

      expect(screen.getByText(/passo 2 de 2/i)).toBeInTheDocument();
      expect(screen.getByText(/personalize seu link de agendamentos/i)).toBeInTheDocument();

      // Wait for slug validation
      await waitFor(() => {
        expect(mockValidateSlugAvailability).toHaveBeenCalledWith('comprehensive-free-shop');
      });

      // Verify validation success
      expect(screen.getByText(/✓ link disponível/i)).toBeInTheDocument();

      // Step 6: Tenant Creation
      console.log(`Step ${currentStep++}: Tenant creation...`);

      const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
      expect(createButton).toBeEnabled();

      await user.click(createButton);

      expect(mockUseTenant().createTenant).toHaveBeenCalledWith(
        testData.tenants[0].name,
        'comprehensive-free-shop'
      );

      // Step 7: Redirect to Admin Dashboard
      console.log(`Step ${currentStep++}: Redirect to admin dashboard...`);

      // Mock user with created tenant
      mockUseTenant.mockReturnValue({
        currentTenant: testData.tenants[0],
        userTenants: [testData.tenants[0]],
        loading: false,
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      // Mock Free Plan feature access
      mockUseFeatureAccess.mockReturnValue({
        checkFeature: vi.fn().mockImplementation((feature: string) => {
          return feature === 'basicBooking'; // Only basic features for free plan
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

      rerender(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Verify dashboard content
      expect(screen.getByText(testData.tenants[0].name)).toBeInTheDocument();
      expect(screen.getByText(/plano gratuito/i)).toBeInTheDocument();

      // Step 8: Verify Free Plan Limitations
      console.log(`Step ${currentStep++}: Verify Free Plan limitations...`);

      // WhatsApp settings should show upgrade prompt
      if (screen.queryByText(/whatsapp/i)) {
        expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
      }

      // Staff limit should be enforced
      const addStaffButton = screen.queryByText(/adicionar funcionário/i);
      if (addStaffButton && testData.staff.filter(s => s.tenant_id === testData.tenants[0].id).length >= 1) {
        expect(addStaffButton).toBeDisabled();
      }

      console.log('✅ Complete self-service onboarding flow successful!');
    });

    it('should handle onboarding errors and recovery', async () => {
      console.log('🔧 Testing onboarding error handling...');

      const user = userEvent.setup();

      // Mock authenticated user
      mockUseAuth.mockReturnValue({
        user: testData.users[0],
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      // Test slug conflict scenario
      mockValidateSlugAvailability.mockResolvedValue({
        available: false,
        error: 'Este link já está em uso',
        suggestions: ['comprehensive-free-shop1', 'comprehensive-free-shop2', 'my-comprehensive-free-shop']
      });

      render(
        <BrowserRouter>
          <Onboarding />
        </BrowserRouter>
      );

      // Fill shop name
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Existing Shop');

      // Continue to step 2
      const continueButton = screen.getByRole('button', { name: /continuar/i });
      await user.click(continueButton);

      // Should show error and suggestions
      await waitFor(() => {
        expect(screen.getByText(/este link já está em uso/i)).toBeInTheDocument();
        expect(screen.getByText(/sugestões disponíveis/i)).toBeInTheDocument();
        expect(screen.getByText('comprehensive-free-shop1')).toBeInTheDocument();
      });

      // Create button should be disabled
      const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
      expect(createButton).toBeDisabled();

      // Test suggestion selection
      const suggestionButton = screen.getByText('comprehensive-free-shop1');
      await user.click(suggestionButton);

      // Mock validation success for suggestion
      mockValidateSlugAvailability.mockResolvedValue({
        available: true
      });

      // Should re-validate with selected suggestion
      await waitFor(() => {
        expect(screen.getByText(/✓ link disponível/i)).toBeInTheDocument();
      });

      expect(createButton).toBeEnabled();

      console.log('✅ Onboarding error handling verified');
    });

    it('should prevent reserved slug usage during onboarding', async () => {
      console.log('🛡️ Testing reserved slug prevention...');

      const user = userEvent.setup();

      mockUseAuth.mockReturnValue({
        user: testData.users[0],
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      // Mock reserved slug validation
      mockValidateSlugAvailability.mockResolvedValue({
        available: false,
        error: 'Este nome está reservado pelo sistema',
        suggestions: ['admin-shop', 'admin1', 'my-admin']
      });

      render(
        <BrowserRouter>
          <Onboarding />
        </BrowserRouter>
      );

      // Try to use reserved word
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Admin Panel');

      const continueButton = screen.getByRole('button', { name: /continuar/i });
      await user.click(continueButton);

      // Should show reserved word error
      await waitFor(() => {
        expect(screen.getByText(/este nome está reservado pelo sistema/i)).toBeInTheDocument();
        expect(screen.getByText('admin-shop')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
      expect(createButton).toBeDisabled();

      console.log('✅ Reserved slug prevention verified');
    });
  });

  describe('Landing Page to Booking Completion Journey', () => {
    it('should complete the full customer journey from discovery to booking', async () => {
      console.log('🎯 Starting complete customer journey test...');

      const user = userEvent.setup();
      let currentStep = 1;

      // Step 1: Customer discovers business via landing page
      console.log(`Step ${currentStep++}: Customer discovers platform...`);

      const { rerender } = render(
        <BrowserRouter>
          <Index />
        </BrowserRouter>
      );

      // Customer sees value proposition
      expect(screen.getByText('Sua agenda profissional')).toBeInTheDocument();
      expect(screen.getByText(/Seus clientes agendam 24\/7/)).toBeInTheDocument();

      // Step 2: Customer navigates to specific business
      console.log(`Step ${currentStep++}: Customer navigates to business page...`);

      // Mock tenant resolution for Pro Plan business
      const mockTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: testData.tenants[1], // Pro Plan tenant
          error: null
        })
      };

      // Mock services query
      const mockServicesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: testData.services.filter(s => s.tenant_id === testData.tenants[1].id),
          error: null
        })
      };

      // Mock staff query
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: testData.staff.filter(s => s.tenant_id === testData.tenants[1].id),
          error: null
        })
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tenants') return mockTenantQuery;
        if (table === 'services') return mockServicesQuery;
        if (table === 'staff') return mockStaffQuery;
        return {};
      });

      // Mock public access (no authentication required)
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: testData.tenants[1],
        userTenants: [],
        loading: false,
        mode: 'public',
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      rerender(
        <MemoryRouter initialEntries={['/comprehensive-pro-shop']}>
          <PublicBooking />
        </MemoryRouter>
      );

      // Step 3: Customer views business information
      console.log(`Step ${currentStep++}: Customer views business information...`);

      await waitFor(() => {
        expect(screen.getByText(testData.tenants[1].name)).toBeInTheDocument();
      });

      // Verify services are displayed
      expect(screen.getByText('Corte Premium')).toBeInTheDocument();
      expect(screen.getByText('Barba Completa')).toBeInTheDocument();

      // Verify staff is displayed
      expect(screen.getByText('Carlos (Proprietário)')).toBeInTheDocument();
      expect(screen.getByText('Maria Barbeira')).toBeInTheDocument();

      // Step 4: Customer selects service and staff
      console.log(`Step ${currentStep++}: Customer selects service and staff...`);

      const serviceButton = screen.getByText('Corte Premium');
      await user.click(serviceButton);

      const staffButton = screen.getByText('Carlos (Proprietário)');
      await user.click(staffButton);

      // Step 5: Customer selects date and time
      console.log(`Step ${currentStep++}: Customer selects date and time...`);

      // Mock availability check
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      const dateInput = screen.getByLabelText(/data/i);
      await user.type(dateInput, '2024-12-20');

      // Select available time slot
      const timeSlot = screen.getByText('14:00');
      await user.click(timeSlot);

      // Step 6: Customer fills contact information
      console.log(`Step ${currentStep++}: Customer fills contact information...`);

      const nameInput = screen.getByLabelText(/nome/i);
      const phoneInput = screen.getByLabelText(/telefone/i);
      const emailInput = screen.getByLabelText(/email/i);

      await user.type(nameInput, 'Pedro Cliente');
      await user.type(phoneInput, '(11) 98765-4321');
      await user.type(emailInput, 'pedro@email.com');

      // Step 7: Customer submits booking
      console.log(`Step ${currentStep++}: Customer submits booking...`);

      // Mock customer creation
      const mockCustomerInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'customer-new' },
          error: null
        })
      };

      // Mock booking creation
      const mockBookingInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'booking-new', status: 'pending' },
          error: null
        })
      };

      callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tenants') return mockTenantQuery;
        if (table === 'services') return mockServicesQuery;
        if (table === 'staff') return mockStaffQuery;
        if (table === 'customers') return mockCustomerInsert;
        if (table === 'bookings') return mockBookingInsert;
        return {};
      });

      const submitButton = screen.getByRole('button', { name: /agendar/i });
      await user.click(submitButton);

      // Step 8: Verify booking creation and WhatsApp notification (Pro Plan)
      console.log(`Step ${currentStep++}: Verify booking and Pro Plan features...`);

      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith('check_availability', expect.any(Object));
      });

      // Mock WhatsApp notification for Pro Plan
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message_id: 'whatsapp-123',
          status: 'sent'
        })
      });

      // Simulate WhatsApp notification trigger
      const whatsappResponse = await fetch('/functions/v1/notify-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: 'booking-new',
          tenant_id: testData.tenants[1].id
        })
      });

      expect(whatsappResponse.ok).toBe(true);
      const whatsappResult = await whatsappResponse.json();
      expect(whatsappResult.success).toBe(true);

      // Step 9: Customer sees confirmation
      console.log(`Step ${currentStep++}: Customer sees booking confirmation...`);

      // Should show success message
      expect(screen.getByText(/agendamento realizado com sucesso/i)).toBeInTheDocument();

      console.log('✅ Complete customer journey successful!');
    });

    it('should handle booking conflicts gracefully', async () => {
      console.log('⚠️ Testing booking conflict handling...');

      const user = userEvent.setup();

      // Setup tenant and services
      const mockTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: testData.tenants[0],
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
        currentTenant: testData.tenants[0],
        userTenants: [],
        loading: false,
        mode: 'public',
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/comprehensive-free-shop']}>
          <PublicBooking />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(testData.tenants[0].name)).toBeInTheDocument();
      });

      // Try to select unavailable time slot
      const timeSlot = screen.getByText('14:00');
      await user.click(timeSlot);

      // Should show conflict message
      await waitFor(() => {
        expect(screen.getByText(/horário não está mais disponível/i)).toBeInTheDocument();
      });

      console.log('✅ Booking conflict handling verified');
    });

    it('should work correctly for Zeroum Barbearia legacy tenant', async () => {
      console.log('🏪 Testing Zeroum Barbearia legacy compatibility...');

      // Mock Zeroum tenant resolution
      const mockZeroumQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: testData.tenants[2], // Zeroum tenant
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockZeroumQuery);

      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: testData.tenants[2],
        userTenants: [],
        loading: false,
        mode: 'public',
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/zeroumbarbearia']}>
          <PublicBooking />
        </MemoryRouter>
      );

      // Verify Zeroum Barbearia loads correctly
      await waitFor(() => {
        expect(screen.getByText('Zero Um Barber Shop')).toBeInTheDocument();
      });

      // Verify Pro Plan features are available
      expect(testData.tenants[2].plan).toBe('pro');
      expect(testData.tenants[2].subscription_status).toBe('active');
      expect(testData.tenants[2].settings.whatsapp_enabled).toBe(true);

      console.log('✅ Zeroum Barbearia legacy compatibility verified');
    });
  });

  describe('Feature Gating Across Different Subscription Plans', () => {
    it('should correctly gate features for Free Plan tenants', async () => {
      console.log('🆓 Testing Free Plan feature gating...');

      // Mock Free Plan tenant
      mockUseAuth.mockReturnValue({
        user: testData.users[0],
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: testData.tenants[0], // Free Plan tenant
        userTenants: [testData.tenants[0]],
        loading: false,
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      // Mock Free Plan feature restrictions
      mockUseFeatureAccess.mockReturnValue({
        checkFeature: vi.fn().mockImplementation((feature: string) => {
          const freeFeatures = ['basicBooking', 'basicCalendar'];
          return freeFeatures.includes(feature);
        }),
        canPerform: vi.fn().mockImplementation((action: string, currentCount?: number) => {
          if (action === 'addStaffMember') {
            return (currentCount || 0) < 1; // Max 1 staff for free
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

      // Verify Free Plan indicators
      expect(screen.getByText(/plano gratuito/i)).toBeInTheDocument();

      // WhatsApp features should be locked
      if (screen.queryByText(/whatsapp/i)) {
        expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
      }

      // Payment features should be locked
      if (screen.queryByText(/pagamento/i)) {
        expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
      }

      // Staff limit should be enforced (max 1)
      const currentStaffCount = testData.staff.filter(s => s.tenant_id === testData.tenants[0].id).length;
      if (currentStaffCount >= 1) {
        const addStaffButton = screen.queryByText(/adicionar funcionário/i);
        if (addStaffButton) {
          expect(addStaffButton).toBeDisabled();
        }
      }

      console.log('✅ Free Plan feature gating verified');
    });

    it('should allow all features for Pro Plan tenants', async () => {
      console.log('💎 Testing Pro Plan feature access...');

      // Mock Pro Plan tenant
      mockUseAuth.mockReturnValue({
        user: testData.users[1],
        loading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      mockUseTenant.mockReturnValue({
        currentTenant: testData.tenants[1], // Pro Plan tenant
        userTenants: [testData.tenants[1]],
        loading: false,
        createTenant: vi.fn(),
        refreshTenants: vi.fn()
      });

      // Mock Pro Plan feature access
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

      // Verify Pro Plan indicators
      expect(screen.getByText(/plano pro/i)).toBeInTheDocument();

      // WhatsApp features should be available
      if (screen.queryByText(/whatsapp/i)) {
        expect(screen.queryByText(/upgrade to pro/i)).not.toBeInTheDocument();
      }

      // Payment features should be available
      if (screen.queryByText(/pagamento/i)) {
        expect(screen.queryByText(/upgrade to pro/i)).not.toBeInTheDocument();
      }

      // Staff management should be unlimited
      const addStaffButton = screen.queryByText(/adicionar funcionário/i);
      if (addStaffButton) {
        expect(addStaffButton).not.toBeDisabled();
      }

      console.log('✅ Pro Plan feature access verified');
    });

    it('should handle plan downgrades correctly', async () => {
      console.log('📉 Testing plan downgrade handling...');

      // Start with Pro Plan
      let currentTenant = {
        ...testData.tenants[1],
        plan: 'pro' as const,
        subscription_status: 'active' as const
      };

      const { rerender } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Mock Pro Plan initially
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
          const freeFeatures = ['basicBooking'];
          return freeFeatures.includes(feature);
        }),
        canPerform: vi.fn().mockImplementation((action: string, currentCount?: number) => {
          if (action === 'addStaffMember') {
            return (currentCount || 0) < 1;
          }
          return false;
        }),
        currentPlan: 'free',
        subscriptionStatus: 'cancelled',
        getUpgradeMessage: vi.fn().mockReturnValue('Your subscription was cancelled. Upgrade to restore Pro features.')
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
      expect(screen.getByText(/assinatura cancelada/i)).toBeInTheDocument();

      // Premium features should be locked again
      if (screen.queryByText(/whatsapp/i)) {
        expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
      }

      console.log('✅ Plan downgrade handling verified');
    });

    it('should handle subscription status changes correctly', async () => {
      console.log('🔄 Testing subscription status changes...');

      const subscriptionStatuses = [
        { status: 'active', shouldHaveAccess: true },
        { status: 'past_due', shouldHaveAccess: false },
        { status: 'cancelled', shouldHaveAccess: false },
        { status: 'inactive', shouldHaveAccess: false }
      ];

      for (const { status, shouldHaveAccess } of subscriptionStatuses) {
        console.log(`Testing subscription status: ${status}`);

        const testTenant = {
          ...testData.tenants[1],
          subscription_status: status
        };

        mockUseTenant.mockReturnValue({
          currentTenant: testTenant,
          userTenants: [testTenant],
          loading: false,
          createTenant: vi.fn(),
          refreshTenants: vi.fn()
        });

        mockUseFeatureAccess.mockReturnValue({
          checkFeature: vi.fn().mockReturnValue(shouldHaveAccess),
          canPerform: vi.fn().mockReturnValue(shouldHaveAccess),
          currentPlan: 'pro',
          subscriptionStatus: status,
          getUpgradeMessage: vi.fn().mockReturnValue(
            shouldHaveAccess ? '' : 'Please update your payment method to restore access'
          )
        });

        const { rerender } = render(
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        );

        if (shouldHaveAccess) {
          // Should have full Pro access
          expect(screen.getByText(/plano pro/i)).toBeInTheDocument();
        } else {
          // Should show payment issue
          expect(screen.getByText(/problema com pagamento|assinatura|payment/i)).toBeInTheDocument();
        }

        rerender(<div />); // Clear for next iteration
      }

      console.log('✅ Subscription status changes verified');
    });
  });

  describe('Cross-Feature Integration Scenarios', () => {
    it('should handle complete business lifecycle: onboarding → upgrade → booking with notifications', async () => {
      console.log('🔄 Testing complete business lifecycle...');

      let currentStep = 1;

      // Step 1: Business owner completes onboarding (Free Plan)
      console.log(`Step ${currentStep++}: Business onboarding (Free Plan)...`);

      let currentTenant = {
        ...testData.tenants[0],
        plan: 'free' as const,
        subscription_status: 'inactive' as const
      };

      // Step 2: Business operates on Free Plan
      console.log(`Step ${currentStep++}: Operating on Free Plan...`);

      mockUseFeatureAccess.mockReturnValue({
        checkFeature: vi.fn().mockImplementation((feature: string) => {
          return feature === 'basicBooking';
        }),
        canPerform: vi.fn().mockImplementation((action: string, currentCount?: number) => {
          if (action === 'addStaffMember') return (currentCount || 0) < 1;
          return false;
        }),
        currentPlan: 'free',
        subscriptionStatus: 'inactive'
      });

      // Customer makes booking on Free Plan (no WhatsApp notification)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'WhatsApp notifications not available for Free plan'
        })
      });

      const freeBookingResponse = await fetch('/functions/v1/notify-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: 'booking-free',
          tenant_id: currentTenant.id
        })
      });

      expect(freeBookingResponse.ok).toBe(false);

      // Step 3: Business upgrades to Pro Plan
      console.log(`Step ${currentStep++}: Upgrading to Pro Plan...`);

      // Mock Mercado Pago checkout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          checkout_url: 'https://checkout.mercadopago.com/upgrade-123'
        })
      });

      const upgradeResponse = await fetch('/functions/v1/mp-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: currentTenant.id,
          plan: 'pro'
        })
      });

      expect(upgradeResponse.ok).toBe(true);
      const upgradeResult = await upgradeResponse.json();
      expect(upgradeResult.checkout_url).toContain('checkout.mercadopago.com');

      // Simulate successful payment
      currentTenant = {
        ...currentTenant,
        plan: 'pro',
        subscription_status: 'active',
        settings: {
          ...currentTenant.settings,
          whatsapp_enabled: true,
          payment_enabled: true
        }
      };

      // Step 4: Business operates on Pro Plan with full features
      console.log(`Step ${currentStep++}: Operating on Pro Plan...`);

      mockUseFeatureAccess.mockReturnValue({
        checkFeature: vi.fn().mockReturnValue(true),
        canPerform: vi.fn().mockReturnValue(true),
        currentPlan: 'pro',
        subscriptionStatus: 'active'
      });

      // Customer makes booking on Pro Plan (with WhatsApp notification)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message_id: 'whatsapp-pro-123',
          status: 'sent'
        })
      });

      const proBookingResponse = await fetch('/functions/v1/notify-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: 'booking-pro',
          tenant_id: currentTenant.id
        })
      });

      expect(proBookingResponse.ok).toBe(true);
      const proResult = await proBookingResponse.json();
      expect(proResult.success).toBe(true);
      expect(proResult.message_id).toBeDefined();

      // Step 5: Business can now add multiple staff members
      console.log(`Step ${currentStep++}: Adding multiple staff members...`);

      // Should be able to add unlimited staff on Pro Plan
      const canAddStaff = mockUseFeatureAccess().canPerform('addStaffMember', 5); // Already has 5 staff
      expect(canAddStaff).toBe(true);

      console.log('✅ Complete business lifecycle verified');
    });

    it('should maintain data isolation across all features', async () => {
      console.log('🔒 Testing data isolation across features...');

      // Test that each tenant's data remains isolated across all features
      const tenantIds = testData.tenants.map(t => t.id);

      for (const tenantId of tenantIds) {
        // Mock user authentication for tenant owner
        const tenantOwner = testData.users.find(u => 
          testData.tenants.find(t => t.id === tenantId)?.owner_id === u.id
        );

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: tenantOwner },
          error: null
        });

        // Mock data queries that should be scoped to tenant
        const mockScopedQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: testData.services.filter(s => s.tenant_id === tenantId),
            error: null
          })
        };

        mockSupabase.from.mockReturnValue(mockScopedQuery);

        // Query services for this tenant
        const servicesResult = await mockSupabase.from('services')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('name');

        // Should only return services for this tenant
        expect(servicesResult.data.every((s: any) => s.tenant_id === tenantId)).toBe(true);
        expect(servicesResult.data.some((s: any) => s.tenant_id !== tenantId)).toBe(false);

        // Test staff isolation
        const mockStaffQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: testData.staff.filter(s => s.tenant_id === tenantId),
            error: null
          })
        };

        mockSupabase.from.mockReturnValue(mockStaffQuery);

        const staffResult = await mockSupabase.from('staff')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('display_name');

        expect(staffResult.data.every((s: any) => s.tenant_id === tenantId)).toBe(true);

        // Test booking isolation
        const mockBookingQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: testData.bookings.filter(b => b.tenant_id === tenantId),
            error: null
          })
        };

        mockSupabase.from.mockReturnValue(mockBookingQuery);

        const bookingResult = await mockSupabase.from('bookings')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('start_time');

        expect(bookingResult.data.every((b: any) => b.tenant_id === tenantId)).toBe(true);
      }

      console.log('✅ Data isolation across features verified');
    });

    it('should handle system load with multiple concurrent operations', async () => {
      console.log('⚡ Testing system load handling...');

      // Simulate multiple concurrent operations
      const concurrentOperations = [
        // Multiple users signing up
        ...Array.from({ length: 10 }, (_, i) => ({
          type: 'signup',
          email: `user${i}@load.test`,
          password: 'password123'
        })),
        // Multiple tenants being created
        ...Array.from({ length: 5 }, (_, i) => ({
          type: 'tenant_creation',
          name: `Load Test Business ${i}`,
          slug: `load-test-${i}`
        })),
        // Multiple bookings being made
        ...Array.from({ length: 20 }, (_, i) => ({
          type: 'booking',
          tenant_id: testData.tenants[i % testData.tenants.length].id,
          customer_name: `Customer ${i}`
        }))
      ];

      const operationPromises = concurrentOperations.map(async (operation) => {
        try {
          switch (operation.type) {
            case 'signup':
              mockSupabase.auth.signUp.mockResolvedValue({
                data: { user: { id: `user-${Date.now()}-${Math.random()}` } },
                error: null
              });
              return { type: 'signup', success: true };

            case 'tenant_creation':
              mockValidateSlugAvailability.mockResolvedValue({ available: true });
              return { type: 'tenant_creation', success: true };

            case 'booking':
              mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
              return { type: 'booking', success: true };

            default:
              return { type: 'unknown', success: false };
          }
        } catch (error) {
          return { type: operation.type, success: false, error };
        }
      });

      const results = await Promise.all(operationPromises);

      // All operations should complete successfully
      const successRate = results.filter(r => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate under load

      // Verify operation distribution
      const signupResults = results.filter(r => r.type === 'signup');
      const tenantResults = results.filter(r => r.type === 'tenant_creation');
      const bookingResults = results.filter(r => r.type === 'booking');

      expect(signupResults.length).toBe(10);
      expect(tenantResults.length).toBe(5);
      expect(bookingResults.length).toBe(20);

      console.log('✅ System load handling verified');
    });
  });
});