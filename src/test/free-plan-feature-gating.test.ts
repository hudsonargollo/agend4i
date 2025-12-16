import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { hasFeatureAccess, PLAN_FEATURES, SubscriptionPlan, SubscriptionStatus } from '@/lib/featureGating';

/**
 * Property 18: Free Plan feature gating
 * Validates: Requirements 12.2, 12.3
 * 
 * For any Free Plan tenant accessing premium features (WhatsApp notifications, payment processing), 
 * the features should be disabled with upgrade prompts displayed
 */

describe('Property 18: Free Plan feature gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should block WhatsApp notifications for Free Plan tenants', () => {
    fc.assert(
      fc.property(
        // Generate subscription status
        fc.constantFrom('active', 'past_due', 'cancelled', 'inactive'),
        (subscriptionStatus) => {
          // Test WhatsApp notifications access for Free Plan
          const hasAccess = hasFeatureAccess(
            'free',
            subscriptionStatus as SubscriptionStatus,
            'whatsappNotifications'
          );

          // Free Plan should never have access to WhatsApp notifications
          expect(hasAccess).toBe(false);
          
          // Verify this matches the plan definition
          expect(hasAccess).toBe(PLAN_FEATURES.free.whatsappNotifications);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should block payment processing for Free Plan tenants', () => {
    fc.assert(
      fc.property(
        // Generate subscription status
        fc.constantFrom('active', 'past_due', 'cancelled', 'inactive'),
        (subscriptionStatus) => {
          // Test payment processing access for Free Plan
          const hasAccess = hasFeatureAccess(
            'free',
            subscriptionStatus as SubscriptionStatus,
            'paymentProcessing'
          );

          // Free Plan should never have access to payment processing
          expect(hasAccess).toBe(false);
          
          // Verify this matches the plan definition
          expect(hasAccess).toBe(PLAN_FEATURES.free.paymentProcessing);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow WhatsApp notifications for Pro Plan when subscription is active', () => {
    fc.assert(
      fc.property(
        fc.constant('active'),
        (subscriptionStatus) => {
          // Test WhatsApp notifications access for Pro Plan with active subscription
          const hasAccess = hasFeatureAccess(
            'pro',
            subscriptionStatus as SubscriptionStatus,
            'whatsappNotifications'
          );

          // Pro Plan with active subscription should have access
          expect(hasAccess).toBe(true);
          expect(hasAccess).toBe(PLAN_FEATURES.pro.whatsappNotifications);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow payment processing for Pro Plan when subscription is active', () => {
    fc.assert(
      fc.property(
        fc.constant('active'),
        (subscriptionStatus) => {
          // Test payment processing access for Pro Plan with active subscription
          const hasAccess = hasFeatureAccess(
            'pro',
            subscriptionStatus as SubscriptionStatus,
            'paymentProcessing'
          );

          // Pro Plan with active subscription should have access
          expect(hasAccess).toBe(true);
          expect(hasAccess).toBe(PLAN_FEATURES.pro.paymentProcessing);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should revert to Free Plan feature access when Pro Plan subscription is not active', () => {
    fc.assert(
      fc.property(
        // Generate non-active subscription status
        fc.constantFrom('past_due', 'cancelled', 'inactive'),
        // Generate premium features that Free Plan doesn't have
        fc.constantFrom('whatsappNotifications', 'paymentProcessing', 'advancedAnalytics', 'customBranding'),
        (subscriptionStatus, feature) => {
          // Test premium feature access for Pro Plan with inactive subscription
          const hasAccess = hasFeatureAccess(
            'pro',
            subscriptionStatus as SubscriptionStatus,
            feature as keyof typeof PLAN_FEATURES.free
          );

          // Should revert to Free Plan access when subscription is not active
          const freePlanAccess = PLAN_FEATURES.free[feature as keyof typeof PLAN_FEATURES.free];
          expect(hasAccess).toBe(freePlanAccess);
          
          // Specifically for WhatsApp and payment processing, should be false
          if (feature === 'whatsappNotifications' || feature === 'paymentProcessing') {
            expect(hasAccess).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should consistently block all premium features for Free Plan', () => {
    const premiumFeatures = [
      'whatsappNotifications',
      'paymentProcessing', 
      'advancedAnalytics',
      'customBranding',
      'multipleStaff',
      'apiAccess',
      'prioritySupport'
    ] as const;

    fc.assert(
      fc.property(
        // Generate subscription status
        fc.constantFrom('active', 'past_due', 'cancelled', 'inactive'),
        // Generate premium feature
        fc.constantFrom(...premiumFeatures),
        (subscriptionStatus, feature) => {
          // Test premium feature access for Free Plan
          const hasAccess = hasFeatureAccess(
            'free',
            subscriptionStatus as SubscriptionStatus,
            feature
          );

          // Get expected access from plan definition
          const expectedAccess = PLAN_FEATURES.free[feature];
          expect(hasAccess).toBe(expectedAccess);
          
          // WhatsApp and payment processing should specifically be false for Free Plan
          if (feature === 'whatsappNotifications' || feature === 'paymentProcessing') {
            expect(hasAccess).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain feature access consistency across all plan types', () => {
    const plans: SubscriptionPlan[] = ['free', 'pro', 'enterprise'];
    const features = [
      'whatsappNotifications',
      'paymentProcessing',
      'advancedAnalytics',
      'customBranding',
      'multipleStaff',
      'apiAccess',
      'prioritySupport'
    ] as const;

    fc.assert(
      fc.property(
        // Generate plan
        fc.constantFrom(...plans),
        // Generate subscription status
        fc.constantFrom('active', 'past_due', 'cancelled', 'inactive'),
        // Generate feature
        fc.constantFrom(...features),
        (plan, subscriptionStatus, feature) => {
          // Test feature access
          const hasAccess = hasFeatureAccess(
            plan,
            subscriptionStatus as SubscriptionStatus,
            feature
          );

          if (subscriptionStatus === 'active' || plan === 'free') {
            // When subscription is active or plan is free, should match plan definition
            const expectedAccess = PLAN_FEATURES[plan][feature];
            expect(hasAccess).toBe(expectedAccess);
          } else {
            // When subscription is not active and plan is not free, should revert to free plan
            const expectedAccess = PLAN_FEATURES.free[feature];
            expect(hasAccess).toBe(expectedAccess);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should enforce Free Plan limitations for specific premium features', () => {
    fc.assert(
      fc.property(
        // Generate subscription status
        fc.constantFrom('active', 'past_due', 'cancelled', 'inactive'),
        (subscriptionStatus) => {
          // Test specific premium features that Free Plan should not have
          const whatsappAccess = hasFeatureAccess(
            'free',
            subscriptionStatus as SubscriptionStatus,
            'whatsappNotifications'
          );
          
          const paymentAccess = hasFeatureAccess(
            'free',
            subscriptionStatus as SubscriptionStatus,
            'paymentProcessing'
          );
          
          const multipleStaffAccess = hasFeatureAccess(
            'free',
            subscriptionStatus as SubscriptionStatus,
            'multipleStaff'
          );

          // All these features should be blocked for Free Plan
          expect(whatsappAccess).toBe(false);
          expect(paymentAccess).toBe(false);
          expect(multipleStaffAccess).toBe(false);
          
          // Verify against plan definition
          expect(whatsappAccess).toBe(PLAN_FEATURES.free.whatsappNotifications);
          expect(paymentAccess).toBe(PLAN_FEATURES.free.paymentProcessing);
          expect(multipleStaffAccess).toBe(PLAN_FEATURES.free.multipleStaff);
        }
      ),
      { numRuns: 100 }
    );
  });
});