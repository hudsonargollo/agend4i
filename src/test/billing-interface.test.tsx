/**
 * Unit tests for billing interface components
 * Tests subscription status display, upgrade flow integration, and feature gating UI components
 * Requirements: 3.1, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillingManagement } from '@/components/BillingManagement';
import { FeatureGate, UpgradePrompt, FeatureLocked, PlanBadge } from '@/components/FeatureGate';
import { useTenant } from '@/hooks/useTenant';
import { useFeatureAccess } from '@/lib/featureGating';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      setSession: vi.fn()
    },
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key'
  }
}))

// Mock the hooks
vi.mock('@/hooks/useTenant');
vi.mock('@/lib/featureGating');

// Mock fetch for API calls
global.fetch = vi.fn();

const mockUseTenant = vi.mocked(useTenant);
const mockUseFeatureAccess = vi.mocked(useFeatureAccess);

describe('Billing Interface Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseTenant.mockReturnValue({
      currentTenant: {
        id: 'tenant-1',
        slug: 'test-tenant',
        name: 'Test Tenant',
        owner_id: 'user-1',
        settings: {},
        plan: 'free',
        status: 'active',
        subscription_status: 'inactive',
        mp_payer_id: null,
        mp_subscription_id: null,
      },
      userTenants: [],
      currentMembership: null,
      loading: false,
      mode: 'admin' as const,
      setCurrentTenant: vi.fn(),
      refreshTenants: vi.fn(),
      createTenant: vi.fn(),
    });

    mockUseFeatureAccess.mockReturnValue({
      checkFeature: vi.fn().mockReturnValue(false),
      getFeatures: vi.fn().mockReturnValue({
        whatsappNotifications: false,
        paymentProcessing: false,
        advancedAnalytics: false,
        customBranding: false,
        multipleStaff: false,
        apiAccess: false,
        prioritySupport: false,
        maxBookingsPerMonth: 50,
        maxStaffMembers: 1,
      }),
      canPerform: vi.fn().mockReturnValue(true),
      getUpgradeMessage: vi.fn().mockReturnValue('Upgrade to Pro to access this feature'),
      currentPlan: 'free' as const,
      subscriptionStatus: 'inactive' as const,
    });
  });

  describe('BillingManagement Component', () => {
    it('displays current subscription status correctly', () => {
      render(<BillingManagement />);
      
      expect(screen.getByText('Billing Status')).toBeInTheDocument();
      expect(screen.getByText('free')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('shows past due warning when subscription is past due', () => {
      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        subscriptionStatus: 'past_due' as const,
      });

      render(<BillingManagement />);
      
      expect(screen.getByText(/payment is overdue/i)).toBeInTheDocument();
    });

    it('shows cancelled subscription message when subscription is cancelled', () => {
      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        subscriptionStatus: 'cancelled' as const,
      });

      render(<BillingManagement />);
      
      expect(screen.getByText(/subscription has been cancelled/i)).toBeInTheDocument();
    });

    it('displays subscription ID when available', () => {
      mockUseTenant.mockReturnValue({
        ...mockUseTenant(),
        currentTenant: {
          ...mockUseTenant().currentTenant!,
          mp_subscription_id: 'sub_123456789',
        },
      });

      render(<BillingManagement />);
      
      expect(screen.getByText('23456789')).toBeInTheDocument(); // Last 8 characters
    });

    it('handles upgrade button click correctly', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, init_point: 'https://checkout.mercadopago.com/test' }),
      } as Response);

      // Mock window.open
      const mockOpen = vi.fn();
      Object.defineProperty(window, 'open', { value: mockOpen });

      render(<BillingManagement />);
      
      const upgradeButton = screen.getByText(/Upgrade para Pro/i);
      fireEvent.click(upgradeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('https://test.supabase.co/functions/v1/mp-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key',
          },
          body: JSON.stringify({
            tenant_id: 'tenant-1',
            plan: 'pro',
            payer_email: 'test@example.com',
          }),
          signal: expect.any(AbortSignal),
        });
      });

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith('https://checkout.mercadopago.com/test', '_blank');
      });
    });

    it('handles API error during upgrade gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<BillingManagement />);
      
      const upgradeButton = screen.getByText(/Upgrade para Pro/i);
      fireEvent.click(upgradeButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error creating checkout session:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('FeatureGate Component', () => {
    it('renders children when feature access is granted', () => {
      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        checkFeature: vi.fn().mockReturnValue(true),
      });

      render(
        <FeatureGate feature="whatsappNotifications">
          <div>Feature Content</div>
        </FeatureGate>
      );

      expect(screen.getByText('Feature Content')).toBeInTheDocument();
      expect(screen.queryByText('Upgrade Required')).not.toBeInTheDocument();
    });

    it('shows upgrade prompt when feature access is denied', () => {
      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        checkFeature: vi.fn().mockReturnValue(false),
      });

      render(
        <FeatureGate feature="whatsappNotifications">
          <div>Feature Content</div>
        </FeatureGate>
      );

      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Pro to access this feature')).toBeInTheDocument();
    });

    it('renders fallback content when provided and access is denied', () => {
      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        checkFeature: vi.fn().mockReturnValue(false),
      });

      render(
        <FeatureGate 
          feature="whatsappNotifications" 
          fallback={<div>Fallback Content</div>}
        >
          <div>Feature Content</div>
        </FeatureGate>
      );

      expect(screen.getByText('Fallback Content')).toBeInTheDocument();
      expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Upgrade Required')).not.toBeInTheDocument();
    });

    it('does not show upgrade prompt when showUpgradePrompt is false', () => {
      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        checkFeature: vi.fn().mockReturnValue(false),
      });

      render(
        <FeatureGate feature="whatsappNotifications" showUpgradePrompt={false}>
          <div>Feature Content</div>
        </FeatureGate>
      );

      expect(screen.queryByText('Feature Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Upgrade Required')).not.toBeInTheDocument();
    });
  });

  describe('UpgradePrompt Component', () => {
    it('displays correct upgrade message for feature', () => {
      render(<UpgradePrompt feature="whatsappNotifications" />);

      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(screen.getByText('Upgrade to Pro to access this feature')).toBeInTheDocument();
    });

    it('shows current plan badge', () => {
      render(<UpgradePrompt feature="whatsappNotifications" />);

      expect(screen.getByText('Current: FREE')).toBeInTheDocument();
      expect(screen.getByText('PRO')).toBeInTheDocument();
    });

    it('calls onUpgrade callback when upgrade button is clicked', () => {
      const mockOnUpgrade = vi.fn();
      render(<UpgradePrompt feature="whatsappNotifications" onUpgrade={mockOnUpgrade} />);

      const upgradeButton = screen.getByRole('button', { name: /Upgrade para Pro/i });
      fireEvent.click(upgradeButton);

      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });
  });

  describe('FeatureLocked Component', () => {
    it('renders children normally when feature access is granted', () => {
      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        checkFeature: vi.fn().mockReturnValue(true),
      });

      render(
        <FeatureLocked feature="whatsappNotifications">
          <div>Feature Content</div>
        </FeatureLocked>
      );

      expect(screen.getByText('Feature Content')).toBeInTheDocument();
      expect(screen.queryByText('Pro')).not.toBeInTheDocument();
    });

    it('renders children with opacity and lock badge when access is denied', () => {
      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        checkFeature: vi.fn().mockReturnValue(false),
      });

      render(
        <FeatureLocked feature="whatsappNotifications">
          <div>Feature Content</div>
        </FeatureLocked>
      );

      expect(screen.getByText('Feature Content')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  describe('PlanBadge Component', () => {
    it('renders free plan badge correctly', () => {
      render(<PlanBadge plan="free" />);
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('renders pro plan badge with crown icon', () => {
      render(<PlanBadge plan="pro" />);
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('renders enterprise plan badge with zap icon', () => {
      render(<PlanBadge plan="enterprise" />);
      expect(screen.getByText('Enterprise')).toBeInTheDocument();
    });
  });

  describe('Feature Gating Integration', () => {
    it('correctly integrates with feature access hook', () => {
      const mockCheckFeature = vi.fn()
        .mockReturnValueOnce(false) // First call returns false
        .mockReturnValueOnce(true); // Second call returns true

      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        checkFeature: mockCheckFeature,
      });

      const { rerender } = render(
        <FeatureGate feature="whatsappNotifications">
          <div>Feature Content</div>
        </FeatureGate>
      );

      // First render - no access
      expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
      expect(mockCheckFeature).toHaveBeenCalledWith('whatsappNotifications');

      // Rerender with access
      rerender(
        <FeatureGate feature="whatsappNotifications">
          <div>Feature Content</div>
        </FeatureGate>
      );

      expect(screen.getByText('Feature Content')).toBeInTheDocument();
      expect(screen.queryByText('Upgrade Required')).not.toBeInTheDocument();
    });

    it('handles different subscription statuses correctly', () => {
      // Test with active pro subscription
      mockUseFeatureAccess.mockReturnValue({
        ...mockUseFeatureAccess(),
        checkFeature: vi.fn().mockReturnValue(true),
        currentPlan: 'pro' as const,
        subscriptionStatus: 'active' as const,
      });

      render(
        <FeatureGate feature="whatsappNotifications">
          <div>WhatsApp Feature</div>
        </FeatureGate>
      );

      expect(screen.getByText('WhatsApp Feature')).toBeInTheDocument();
    });
  });
});