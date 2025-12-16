import { supabase } from '@/integrations/supabase/client';

/**
 * Setup script to create Zeroum Barbearia tenant if it doesn't exist
 * This ensures backward compatibility for the existing customer
 */
export async function setupZeroumBarbearia() {
  console.log('Setting up Zeroum Barbearia tenant...');

  // Check if tenant already exists
  const { data: existingTenant, error: checkError } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', 'zeroumbarbearia')
    .single();

  if (existingTenant) {
    console.log('Zeroum Barbearia tenant already exists:', existingTenant.id);
    return existingTenant;
  }

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking for existing tenant:', checkError);
    throw checkError;
  }

  // Get current user or create a placeholder owner
  const { data: { user } } = await supabase.auth.getUser();
  
  // Create the tenant
  const { data: newTenant, error: createError } = await supabase
    .from('tenants')
    .insert({
      name: 'Zeroum Barbearia',
      slug: 'zeroumbarbearia',
      owner_id: user?.id || '00000000-0000-0000-0000-000000000000', // Use current user or placeholder
      plan: 'pro', // Pro plan for existing customer
      subscription_status: 'active',
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

  if (createError) {
    console.error('Error creating Zeroum Barbearia tenant:', createError);
    throw createError;
  }

  console.log('Created Zeroum Barbearia tenant:', newTenant.id);

  // Create default services if they don't exist
  await setupDefaultServices(newTenant.id);
  
  // Create default staff if they don't exist
  await setupDefaultStaff(newTenant.id);

  return newTenant;
}

async function setupDefaultServices(tenantId: string) {
  const defaultServices = [
    {
      tenant_id: tenantId,
      name: 'Corte Masculino',
      description: 'Corte de cabelo masculino tradicional',
      price: 25.00,
      duration: 30
    },
    {
      tenant_id: tenantId,
      name: 'Barba',
      description: 'Aparar e modelar barba',
      price: 15.00,
      duration: 20
    },
    {
      tenant_id: tenantId,
      name: 'Corte + Barba',
      description: 'Corte de cabelo e barba completo',
      price: 35.00,
      duration: 45
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
}

async function setupDefaultStaff(tenantId: string) {
  const defaultStaff = [
    {
      tenant_id: tenantId,
      name: 'Barbeiro Principal',
      email: 'barbeiro@zeroumbarbearia.com',
      role: 'staff'
    }
  ];

  for (const staff of defaultStaff) {
    const { error } = await supabase
      .from('staff')
      .insert(staff);

    if (error) {
      console.error('Error creating staff:', staff.name, error);
    } else {
      console.log('Created staff:', staff.name);
    }
  }
}

// Run the setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupZeroumBarbearia()
    .then(() => {
      console.log('Zeroum Barbearia setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}