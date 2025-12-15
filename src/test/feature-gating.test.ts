/**
 * **Feature: saas-multi-tenancy, Property 6: Feature gating by subscription plan**
 * **Validates: Requirements 3.3, 3.4, 7.5**
 * 
 * Property: For any tenant accessing premium features (WhatsApp notifications, payment processing), 
 * the feature should be available if and only if the tenant has an active Pro or Enterprise subscription
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  hasFeatureAccess, 
  getPlanFeatures, 
  canPerformAction,
  SubscriptionPlan, 
  SubscriptionStatus,
  PlanFeatures,
  PLAN_FEATURES 
} from '@/lib/featureGating';

// Generators for property-based testing
const subscriptionPlanArb = fc.constantFrom('free', 'pro', 'enterprise') as fc.Arbitrary<SubscriptionPlan>;
const subscriptionStatusArb = fc.constantFrom('active', 'past_due', 'cancelled', 'inactive') as fc.Arbitrary<SubscriptionStatus>;
const featureKeyArb = fc.constantFrom(
  'whatsappNotifications',
  'paymentProcessing', 
  'advancedAnalytics',
  'customBranding',
  'multipleStaff',
  'apiAccess',
  'prioritySupport'
) as fc.Arbitrary<keyof PlanFeatures>;

const usageLimitArb = fc.integer({ min: 0, max: 1000 });

describe('Feature Gating Property Tests', () => {
  it('Property 6: Feature gating by subscription plan - Premium features require active subscription', () => {
    fc.assert(
      fc.property(
        subscriptionPlanArb,
        subscriptionStatusArb,
        featureKeyArb,
        (plan, status, feature) => {
          const hasAccess = hasFeatureAccess(plan, status, feature);
          const planFeatures = PLAN_FEATURES[plan];
          const expectedFeatureValue = planFeatures[feature];
          
          // If subscription is not active and plan is not free, should fall back to free plan
          if (status !== 'active' && plan !== 'free') {
            const freeFeatureValue = PLAN_FEATURES.free[feature];
            expect(hasAccess).toBe(freeFeatureValue);
          } else {
            // If subscription is active or plan is free, should match plan features
            expect(hasAccess).toBe(expectedFeatureValue);
          }
          
          // Premium features (WhatsApp, payments) should only be available with active Pro/Enterprise
          if (feature === 'whatsappNotifications' || feature === 'paymentProcessing') {
            if (status === 'active' && (plan === 'pro' || plan === 'enterprise')) {
              expect(hasAccess).toBe(true);
            } else {
              expect(hasAccess).toBe(false);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6a: Inactive subscriptions always fall back to free plan features', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('pro', 'enterprise') as fc.Arbitrary<SubscriptionPlan>,
        fc.constantFrom('past_due', 'cancelled', 'inactive') as fc.Arbitrary<SubscriptionStatus>,
        featureKeyArb,
        (plan, status, feature) => {
          const hasAccess = hasFeatureAccess(plan, status, feature);
          const freeFeatureValue = PLAN_FEATURES.free[feature];
          
          // Inactive subscriptions should always fall back to free plan
          expect(hasAccess).toBe(freeFeatureValue);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6b: Active subscriptions respect plan feature definitions', () => {
    fc.assert(
      fc.property(
        subscriptionPlanArb,
        featureKeyArb,
        (plan, feature) => {
          const hasAccess = hasFeatureAccess(plan, 'active', feature);
          const expectedFeatureValue = PLAN_FEATURES[plan][feature];
          
          // Active subscriptions should match their plan's feature definitions
          expect(hasAccess).toBe(expectedFeatureValue);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6c: Usage limits are enforced correctly', () => {
    fc.assert(
      fc.property(
        subscriptionPlanArb,
        subscriptionStatusArb,
        usageLimitArb,
        (plan, status, currentUsage) => {
          const canCreateBooking = canPerformAction(plan, status, 'createBooking', currentUsage);
          const canAddStaff = canPerformAction(plan, status, 'addStaffMember', currentUsage);
          
          const features = getPlanFeatures(plan, status);
          
          // Check booking limits
          if (features.maxBookingsPerMonth === -1) {
            // Unlimited bookings
            expect(canCreateBooking).toBe(true);
          } else {
            // Limited bookings
            expect(canCreateBooking).toBe(currentUsage < features.maxBookingsPerMonth);
          }
          
          // Check staff limits
          if (features.maxStaffMembers === -1) {
            // Unlimited staff
            expect(canAddStaff).toBe(true);
          } else {
            // Limited staff
            expect(canAddStaff).toBe(currentUsage < features.maxStaffMembers);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6d: Plan hierarchy is respected (Enterprise >= Pro >= Free)', () => {
    fc.assert(
      fc.property(
        featureKeyArb,
        (feature) => {
          const freeAccess = PLAN_FEATURES.free[feature];
          const proAccess = PLAN_FEATURES.pro[feature];
          const enterpriseAccess = PLAN_FEATURES.enterprise[feature];
          
          // For boolean features, higher plans should have equal or greater access
          if (typeof freeAccess === 'boolean') {
            // If free has access, pro and enterprise should also have access
            if (freeAccess) {
              expect(proAccess).toBe(true);
              expect(enterpriseAccess).toBe(true);
            }
            
            // If pro has access, enterprise should also have access
            if (proAccess) {
              expect(enterpriseAccess).toBe(true);
            }
          }
          
          // For numeric features (limits), higher plans should have equal or greater limits
          if (typeof freeAccess === 'number') {
            if (proAccess !== -1 && freeAccess !== -1) {
              expect(proAccess).toBeGreaterThanOrEqual(freeAccess);
            }
            if (enterpriseAccess !== -1 && proAccess !== -1) {
              expect(enterpriseAccess).toBeGreaterThanOrEqual(proAccess);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6e: Feature consistency across different access methods', () => {
    fc.assert(
      fc.property(
        subscriptionPlanArb,
        subscriptionStatusArb,
        featureKeyArb,
        (plan, status, feature) => {
          // Test that hasFeatureAccess and getPlanFeatures return consistent results
          const directAccess = hasFeatureAccess(plan, status, feature);
          const featuresObject = getPlanFeatures(plan, status);
          const indirectAccess = featuresObject[feature];
          
          expect(directAccess).toBe(indirectAccess);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});