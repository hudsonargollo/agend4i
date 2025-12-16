import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ucmedbalujyknisrnudb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbWVkYmFsdWp5a25pc3JudWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Njc3MjQsImV4cCI6MjA4MTI0MzcyNH0.URt8ULbtLcsVWMciZA3avWMf7RkGw7UTFp5KiOyc79Y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createZeroumAccount() {
  console.log('Creating Zeroum Barbearia account...');

  try {
    // First, check if tenant already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'zeroumbarbearia')
      .single();

    if (existingTenant) {
      console.log('Zeroum Barbearia tenant already exists:', existingTenant.id);
      return { success: true, tenant: existingTenant, isExisting: true };
    }

    // Try to sign in first to check if account exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'zeroum@barbearia.com',
      password: 'rods1773#'
    });

    let user = signInData?.user;

    if (signInError || !user) {
      console.log('Account does not exist, creating new account...');
      
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'zeroum@barbearia.com',
        password: 'rods1773#',
        options: {
          data: {
            full_name: 'Zeroum Barbearia Admin'
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
    }

    if (!user) {
      console.error('No user available after authentication');
      return { success: false, error: new Error('No user available') };
    }

    // Create the tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Zeroum Barbearia',
        slug: 'zeroumbarbearia',
        owner_id: user.id,
        plan: 'pro',
        status: 'active',
        settings: {
          whatsapp_enabled: true,
          payment_enabled: true,
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

    // Create tenant membership
    const { error: membershipError } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenantData.id,
        user_id: user.id,
        role: 'owner',
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

// Run the script
createZeroumAccount().then(result => {
  if (result.success) {
    console.log('✅ Success:', result.message || 'Account setup completed');
  } else {
    console.error('❌ Failed:', result.error);
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});