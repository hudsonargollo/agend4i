import { useTenant } from '@/hooks/useTenant';

// Define subscription plans and their features
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'inactive';

export interface PlanFeatures {
  whatsappNotifications: boolean;
  paymentProcessing: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  multipleStaff: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  maxBookingsPerMonth: number;
  maxStaffMembers: number;
}

// Feature definitions for each plan
export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  free: {
    whatsappNotifications: false,
    paymentProcessing: false,
    advancedAnalytics: false,
    customBranding: false,
    multipleStaff: false,
    apiAccess: false,
    prioritySupport: false,
    maxBookingsPerMonth: 50,
    maxStaffMembers: 1,
  },
  pro: {
    whatsappNotifications: true,
    paymentProcessing: true,
    advancedAnalytics: true,
    customBranding: true,
    multipleStaff: true,
    apiAccess: false,
    prioritySupport: true,
    maxBookingsPerMonth: 500,
    maxStaffMembers: 5,
  },
  enterprise: {
    whatsappNotifications: true,
    paymentProcessing: true,
    advancedAnalytics: true,
    customBranding: true,
    multipleStaff: true,
    apiAccess: true,
    prioritySupport: true,
    maxBookingsPerMonth: -1, // unlimited
    maxStaffMembers: -1, // unlimited
  },
};

/**
 * Check if a tenant has access to a specific feature
 */
export function hasFeatureAccess(
  plan: SubscriptionPlan,
  subscriptionStatus: SubscriptionStatus,
  feature: keyof PlanFeatures
): boolean {
  // If subscription is not active, only allow free plan features
  if (subscriptionStatus !== 'active' && plan !== 'free') {
    return PLAN_FEATURES.free[feature] as boolean;
  }
  
  return PLAN_FEATURES[plan][feature] as boolean;
}

/**
 * Get all features available for a plan
 */
export function getPlanFeatures(
  plan: SubscriptionPlan,
  subscriptionStatus: SubscriptionStatus
): PlanFeatures {
  // If subscription is not active, return free plan features
  if (subscriptionStatus !== 'active' && plan !== 'free') {
    return PLAN_FEATURES.free;
  }
  
  return PLAN_FEATURES[plan];
}

/**
 * Check if a tenant can perform an action based on usage limits
 */
export function canPerformAction(
  plan: SubscriptionPlan,
  subscriptionStatus: SubscriptionStatus,
  action: 'createBooking' | 'addStaffMember',
  currentUsage: number
): boolean {
  const features = getPlanFeatures(plan, subscriptionStatus);
  
  switch (action) {
    case 'createBooking':
      return features.maxBookingsPerMonth === -1 || currentUsage < features.maxBookingsPerMonth;
    case 'addStaffMember':
      return features.maxStaffMembers === -1 || currentUsage < features.maxStaffMembers;
    default:
      return false;
  }
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(feature: keyof PlanFeatures): string {
  const messages: Record<keyof PlanFeatures, string> = {
    whatsappNotifications: 'Upgrade to Pro to send automatic WhatsApp notifications to your customers',
    paymentProcessing: 'Upgrade to Pro to accept payments through Mercado Pago',
    advancedAnalytics: 'Upgrade to Pro to access detailed analytics and reports',
    customBranding: 'Upgrade to Pro to customize your booking page with your brand',
    multipleStaff: 'Upgrade to Pro to add multiple staff members',
    apiAccess: 'Upgrade to Enterprise to access our API',
    prioritySupport: 'Upgrade to Pro for priority customer support',
    maxBookingsPerMonth: 'Upgrade to Pro to increase your monthly booking limit',
    maxStaffMembers: 'Upgrade to Pro to add more staff members',
  };
  
  return messages[feature];
}

/**
 * Hook to check feature access for current tenant
 */
export function useFeatureAccess() {
  const { currentTenant } = useTenant();
  
  const checkFeature = (feature: keyof PlanFeatures): boolean => {
    if (!currentTenant) return false;
    
    const plan = (currentTenant.plan as SubscriptionPlan) || 'free';
    const status = (currentTenant.subscription_status as SubscriptionStatus) || 'inactive';
    
    return hasFeatureAccess(plan, status, feature);
  };
  
  const getFeatures = (): PlanFeatures => {
    if (!currentTenant) return PLAN_FEATURES.free;
    
    const plan = (currentTenant.plan as SubscriptionPlan) || 'free';
    const status = (currentTenant.subscription_status as SubscriptionStatus) || 'inactive';
    
    return getPlanFeatures(plan, status);
  };
  
  const canPerform = (action: 'createBooking' | 'addStaffMember', currentUsage: number): boolean => {
    if (!currentTenant) return false;
    
    const plan = (currentTenant.plan as SubscriptionPlan) || 'free';
    const status = (currentTenant.subscription_status as SubscriptionStatus) || 'inactive';
    
    return canPerformAction(plan, status, action, currentUsage);
  };
  
  const getUpgradeMsg = (feature: keyof PlanFeatures): string => {
    return getUpgradeMessage(feature);
  };
  
  return {
    checkFeature,
    getFeatures,
    canPerform,
    getUpgradeMessage: getUpgradeMsg,
    currentPlan: (currentTenant?.plan as SubscriptionPlan) || 'free',
    subscriptionStatus: (currentTenant?.subscription_status as SubscriptionStatus) || 'inactive',
  };
}