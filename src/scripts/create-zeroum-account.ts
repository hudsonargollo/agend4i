import { supabase } from '@/integrations/supabase/client';

// Zeroum account constants - centralized for consistency
export const ZEROUM_ACCOUNT = Object.freeze({
  email: 'zeroum@barbearia.com',
  password: 'rods1773#',
  fullName: 'Zeroum Barbearia Admin',
  tenantSlug: 'zeroumbarbearia',
  tenantName: 'Zeroum Barbearia',
  plan: 'pro' as const,
  role: 'owner' as const
} as const);

/**
 * Enhanced script to create and protect the specific Zeroum Barbearia account
 * This account is protected from OAuth linking and has special handling
 */
export async function createZeroumAccount() {
  console.log('Creating/validating Zeroum Barbearia account...');

  try {
    // First, check if tenant already exists and validate its configuration
    const { data: existingTenant, error: tenantCheckError } = await supabase
      .from('tenants')
      .select('*, tenant_members!inner(user_id, role, status)')
      .eq('slug', ZEROUM_ACCOUNT.tenantSlug)
      .single();

    if (tenantCheckError && tenantCheckError.code !== 'PGRST116') {
      console.error('Error checking existing tenant:', tenantCheckError);
      return { success: false, error: tenantCheckError };
    }

    if (existingTenant) {
      console.log('Zeroum Barbearia tenant already exists:', existingTenant.id);
      
      // Validate tenant configuration
      const validationResult = await validateZeroumTenantConfiguration(existingTenant);
      if (!validationResult.isValid) {
        console.log('Tenant configuration needs updates:', validationResult.issues);
        const updateResult = await updateZeroumTenantConfiguration(existingTenant.id);
        if (!updateResult.success) {
          return updateResult;
        }
      }
      
      return { success: true, tenant: existingTenant, isExisting: true };
    }

    // Try to sign in first to check if account exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ZEROUM_ACCOUNT.email,
      password: ZEROUM_ACCOUNT.password
    });

    let user = signInData?.user;

    if (signInError || !user) {
      console.log('Account does not exist, creating new account...');
      
      // Create the user account with protection metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ZEROUM_ACCOUNT.email,
        password: ZEROUM_ACCOUNT.password,
        options: {
          data: {
            full_name: ZEROUM_ACCOUNT.fullName,
            is_zeroum_account: true, // Protection flag
            oauth_linking_disabled: true // Prevent OAuth linking
          }
        }
      });

      if (authError) {
        console.error('Error creating account:', authError);
        return { success: false, error: authError };
      }

      user = authData.user;
      console.log('Account created successfully:', user?.email);
    } else {
      console.log('Successfully signed in to existing account:', user.email);
      
      // Ensure existing account has protection metadata
      const updateResult = await ensureZeroumAccountProtection(user.id);
      if (!updateResult.success) {
        console.warn('Failed to update account protection:', updateResult.error);
      }
    }

    if (!user) {
      console.error('No user available after authentication');
      return { success: false, error: new Error('No user available') };
    }

    // Create the tenant with enhanced configuration
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: ZEROUM_ACCOUNT.tenantName,
        slug: ZEROUM_ACCOUNT.tenantSlug,
        owner_id: user.id,
        plan: ZEROUM_ACCOUNT.plan,
        status: 'active',
        settings: {
          whatsapp_enabled: true,
          payment_enabled: true,
          is_zeroum_account: true, // Protection flag
          account_protected: true, // Additional protection
          business_hours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '16:00' },
            sunday: { closed: true }
          }
        }
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return { success: false, error: tenantError };
    }

    console.log('Tenant created successfully:', tenantData.id);

    // Create tenant membership with protection
    const { error: membershipError } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenantData.id,
        user_id: user.id,
        role: ZEROUM_ACCOUNT.role,
        status: 'active'
      });

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      return { success: false, error: membershipError };
    }

    console.log('Membership created successfully');

    // Create default services
    const defaultServices = [
      {
        tenant_id: tenantData.id,
        name: 'Corte Masculino',
        description: 'Corte de cabelo masculino tradicional',
        price: 25.00,
        duration: 30,
        is_active: true
      },
      {
        tenant_id: tenantData.id,
        name: 'Barba',
        description: 'Aparar e modelar barba',
        price: 15.00,
        duration: 20,
        is_active: true
      },
      {
        tenant_id: tenantData.id,
        name: 'Corte + Barba',
        description: 'Corte de cabelo e barba completo',
        price: 35.00,
        duration: 45,
        is_active: true
      }
    ];

    for (const service of defaultServices) {
      const { error } = await supabase
        .from('services')
        .insert(service);

      if (error) {
        console.error('Error creating service:', service.name, error);
      } else {
        console.log('Created service:', service.name);
      }
    }

    // Create default staff member
    const { error: staffError } = await supabase
      .from('staff')
      .insert({
        tenant_id: tenantData.id,
        display_name: 'Barbeiro Principal',
        is_active: true
      });

    if (staffError) {
      console.error('Error creating staff:', staffError);
    } else {
      console.log('Created default staff member');
    }

    return { 
      success: true, 
      user: user, 
      tenant: tenantData,
      message: 'Zeroum Barbearia account and tenant created successfully!'
    };

  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error };
  }
}

/**
 * Validates that the Zeroum tenant has the correct configuration
 */
async function validateZeroumTenantConfiguration(tenant: any) {
  const issues: string[] = [];
  
  // Check basic tenant properties
  if (tenant.name !== ZEROUM_ACCOUNT.tenantName) {
    issues.push(`Incorrect tenant name: ${tenant.name}`);
  }
  
  if (tenant.plan !== ZEROUM_ACCOUNT.plan) {
    issues.push(`Incorrect plan: ${tenant.plan}`);
  }
  
  if (tenant.status !== 'active') {
    issues.push(`Incorrect status: ${tenant.status}`);
  }
  
  // Check settings
  const settings = tenant.settings || {};
  if (!settings.whatsapp_enabled) {
    issues.push('WhatsApp not enabled');
  }
  
  if (!settings.payment_enabled) {
    issues.push('Payment not enabled');
  }
  
  if (!settings.is_zeroum_account) {
    issues.push('Missing Zeroum account flag');
  }
  
  if (!settings.account_protected) {
    issues.push('Missing account protection flag');
  }
  
  // Check business hours
  if (!settings.business_hours) {
    issues.push('Missing business hours');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Updates Zeroum tenant configuration to ensure it meets requirements
 */
async function updateZeroumTenantConfiguration(tenantId: string) {
  try {
    const { error } = await supabase
      .from('tenants')
      .update({
        name: ZEROUM_ACCOUNT.tenantName,
        plan: ZEROUM_ACCOUNT.plan,
        status: 'active',
        settings: {
          whatsapp_enabled: true,
          payment_enabled: true,
          is_zeroum_account: true,
          account_protected: true,
          business_hours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '16:00' },
            sunday: { closed: true }
          }
        }
      })
      .eq('id', tenantId);
    
    if (error) {
      console.error('Error updating tenant configuration:', error);
      return { success: false, error };
    }
    
    console.log('Tenant configuration updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating tenant:', error);
    return { success: false, error };
  }
}

/**
 * Ensures the Zeroum user account has proper protection metadata
 */
async function ensureZeroumAccountProtection(userId: string) {
  try {
    // Note: Supabase doesn't allow direct user metadata updates via client
    // This would typically be handled via a database function or admin API
    // For now, we'll log the requirement
    console.log('Zeroum account protection should be ensured for user:', userId);
    
    // In a production environment, this would call a database function
    // that updates the auth.users table with protection flags
    
    return { success: true };
  } catch (error) {
    console.error('Error ensuring account protection:', error);
    return { success: false, error };
  }
}

/**
 * Checks if an email belongs to the protected Zeroum account
 */
export function isZeroumAccount(email: string): boolean {
  return email === ZEROUM_ACCOUNT.email;
}

/**
 * Validates that the Zeroum account exists and is properly configured
 */
export async function validateZeroumAccount() {
  try {
    // Check if user exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ZEROUM_ACCOUNT.email,
      password: ZEROUM_ACCOUNT.password
    });

    if (signInError || !signInData.user) {
      return {
        isValid: false,
        error: 'Zeroum account does not exist or credentials are incorrect'
      };
    }

    // Check if tenant exists and is properly configured
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', ZEROUM_ACCOUNT.tenantSlug)
      .single();

    if (tenantError || !tenant) {
      return {
        isValid: false,
        error: 'Zeroum tenant does not exist'
      };
    }

    // Validate tenant configuration
    const validation = await validateZeroumTenantConfiguration(tenant);
    
    // Sign out after validation
    await supabase.auth.signOut();
    
    return {
      isValid: validation.isValid,
      issues: validation.issues,
      user: signInData.user,
      tenant
    };
  } catch (error) {
    console.error('Error validating Zeroum account:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for use in other scripts
export default createZeroumAccount;