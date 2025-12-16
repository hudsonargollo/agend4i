import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { canPerformAction, PLAN_FEATURES } from '@/lib/featureGating';

/**
 * Property 17: Free Plan staff limitation
 * Validates: Requirements 12.1
 * 
 * For any Free Plan tenant attempting to add staff members, 
 * the system should enforce a maximum limit of 1 staff member (the owner)
 */

describe('Property 17: Free Plan staff limitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enforce staff limit for Free Plan tenants', () => {
    fc.assert(
      fc.property(
        // Generate current staff count (0 to 10)
        fc.integer({ min: 0, max: 10 }),
        // Generate subscription status
        fc.constantFrom('active', 'past_due', 'cancelled', 'inactive'),
        (currentStaffCount, subscriptionStatus) => {
          // Test Free Plan staff limitation
          const canAddStaff = canPerformAction(
            'free',
            subscriptionStatus,
            'addStaffMember',
            currentStaffCount
          );

          // Free Plan should only allow adding staff if current count is 0 (less than limit of 1)
          const expectedCanAdd = currentStaffCount < PLAN_FEATURES.free.maxStaffMembers;
          
          expect(canAddStaff).toBe(expectedCanAdd);
          
          // Specifically test the boundary condition
          if (currentStaffCount >= 1) {
            expect(canAddStaff).toBe(false);
          } else {
            expect(canAddStaff).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow unlimited staff for Pro Plan regardless of subscription status when active', () => {
    fc.assert(
      fc.property(
        // Generate current staff count (0 to 20)
        fc.integer({ min: 0, max: 20 }),
        (currentStaffCount) => {
          // Test Pro Plan with active subscription
          const canAddStaff = canPerformAction(
            'pro',
            'active',
            'addStaffMember',
            currentStaffCount
          );

          // Pro Plan should allow adding staff up to the limit (5)
          const expectedCanAdd = currentStaffCount < PLAN_FEATURES.pro.maxStaffMembers;
          
          expect(canAddStaff).toBe(expectedCanAdd);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should revert to Free Plan limits when Pro Plan subscription is not active', () => {
    fc.assert(
      fc.property(
        // Generate current staff count (0 to 10)
        fc.integer({ min: 0, max: 10 }),
        // Generate non-active subscription status
        fc.constantFrom('past_due', 'cancelled', 'inactive'),
        (currentStaffCount, subscriptionStatus) => {
          // Test Pro Plan with inactive subscription (should behave like Free Plan)
          const canAddStaff = canPerformAction(
            'pro',
            subscriptionStatus,
            'addStaffMember',
            currentStaffCount
          );

          // Should revert to Free Plan limits when subscription is not active
          const expectedCanAdd = currentStaffCount < PLAN_FEATURES.free.maxStaffMembers;
          
          expect(canAddStaff).toBe(expectedCanAdd);
          
          // Specifically test that it enforces Free Plan limit of 1
          if (currentStaffCount >= 1) {
            expect(canAddStaff).toBe(false);
          } else {
            expect(canAddStaff).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow unlimited staff for Enterprise Plan when active', () => {
    fc.assert(
      fc.property(
        // Generate current staff count (0 to 50)
        fc.integer({ min: 0, max: 50 }),
        (currentStaffCount) => {
          // Test Enterprise Plan with active subscription
          const canAddStaff = canPerformAction(
            'enterprise',
            'active',
            'addStaffMember',
            currentStaffCount
          );

          // Enterprise Plan should allow unlimited staff (-1 means unlimited)
          expect(canAddStaff).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should consistently enforce the exact Free Plan limit boundary', () => {
    const freePlanLimit = PLAN_FEATURES.free.maxStaffMembers;
    
    fc.assert(
      fc.property(
        // Generate subscription status
        fc.constantFrom('active', 'past_due', 'cancelled', 'inactive'),
        (subscriptionStatus) => {
          // Test exactly at the limit
          const canAddAtLimit = canPerformAction(
            'free',
            subscriptionStatus,
            'addStaffMember',
            freePlanLimit
          );
          
          // Should not be able to add when at limit
          expect(canAddAtLimit).toBe(false);
          
          // Test one below the limit
          const canAddBelowLimit = canPerformAction(
            'free',
            subscriptionStatus,
            'addStaffMember',
            freePlanLimit - 1
          );
          
          // Should be able to add when below limit
          expect(canAddBelowLimit).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});