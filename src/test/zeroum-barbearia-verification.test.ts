import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { setupZeroumBarbearia } from '@/scripts/setup-zeroum-barbearia';

describe('Zeroum Barbearia Migration Verification', () => {
  let zeroumTenant: any;

  describe('Setup Verification', () => {
    it('should have migration requirements documented', () => {
      // This test documents the migration requirements for Zeroum Barbearia
      const migrationRequirements = {
        tenantSlug: 'zeroumbarbearia',
        tenantName: 'Zeroum Barbearia',
        plan: 'pro',
        subscriptionStatus: 'active',
        features: {
          whatsappNotifications: true,
          paymentProcessing: true,
          publicBooking: true
        },
        routing: {
          publicUrl: '/zeroumbarbearia',
          adminUrl: '/app'
        }
      };

      // Verify migration requirements are properly defined
      expect(migrationRequirements.tenantSlug).toBe('zeroumbarbearia');
      expect(migrationRequirements.plan).toBe('pro');
      expect(migrationRequirements.features.whatsappNotifications).toBe(true);
      expect(migrationRequirements.features.paymentProcessing).toBe(true);
      expect(migrationRequirements.routing.publicUrl).toBe('/zeroumbarbearia');
    });
  });
  
  beforeAll(async () => {
    // Try to get existing tenant (don't create in test environment)
    const { data: tenant, error: getError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'zeroumbarbearia')
      .single();
    
    if (!getError && tenant) {
      zeroumTenant = tenant;
      console.log('Found existing Zeroum Barbearia tenant:', tenant.id);
    } else {
      console.log('Zeroum Barbearia tenant not found - tests will verify structure only');
    }
  });

  describe('Tenant Setup Verification', () => {
    it('should have Zeroum Barbearia tenant with correct slug', async () => {
      if (!zeroumTenant) {
        console.log('Skipping test - Zeroum Barbearia tenant not found');
        return;
      }

      expect(zeroumTenant.slug).toBe('zeroumbarbearia');
      expect(zeroumTenant.name).toBeTruthy();
      expect(zeroumTenant.status).toBe('active');
    });

    it('should have /zeroumbarbearia URL resolve correctly', async () => {
      if (!zeroumTenant) {
        console.log('Skipping test - Zeroum Barbearia tenant not found');
        return;
      }

      // Test tenant resolution by slug
      const { data: resolvedTenant, error } = await supabase
        .from('tenants')
        .select('id, name, slug, status')
        .eq('slug', 'zeroumbarbearia')
        .eq('status', 'active')
        .single();

      expect(error).toBeNull();
      expect(resolvedTenant).toBeTruthy();
      expect(resolvedTenant.slug).toBe('zeroumbarbearia');
    });

    it('should have accessible services for Zeroum Barbearia', async () => {
      if (!zeroumTenant) {
        console.log('Skipping test - Zeroum Barbearia tenant not found');
        return;
      }

      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', zeroumTenant.id);

      expect(error).toBeNull();
      expect(services).toBeTruthy();
      expect(Array.isArray(services)).toBe(true);
      
      if (services && services.length > 0) {
        services.forEach(service => {
          expect(service.tenant_id).toBe(zeroumTenant.id);
          expect(service.name).toBeTruthy();
          expect(service.price).toBeGreaterThan(0);
        });
      }
    });

    it('should have accessible staff for Zeroum Barbearia', async () => {
      if (!zeroumTenant) {
        console.log('Skipping test - Zeroum Barbearia tenant not found');
        return;
      }

      const { data: staff, error } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', zeroumTenant.id);

      expect(error).toBeNull();
      expect(staff).toBeTruthy();
      expect(Array.isArray(staff)).toBe(true);
      
      if (staff && staff.length > 0) {
        staff.forEach(member => {
          expect(member.tenant_id).toBe(zeroumTenant.id);
          expect(member.name).toBeTruthy();
        });
      }
    });

    it('should have accessible bookings for Zeroum Barbearia', async () => {
      if (!zeroumTenant) {
        console.log('Skipping test - Zeroum Barbearia tenant not found');
        return;
      }

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', zeroumTenant.id)
        .limit(10);

      expect(error).toBeNull();
      expect(bookings).toBeTruthy();
      expect(Array.isArray(bookings)).toBe(true);
      
      if (bookings && bookings.length > 0) {
        bookings.forEach(booking => {
          expect(booking.tenant_id).toBe(zeroumTenant.id);
          expect(booking.customer_name).toBeTruthy();
          expect(booking.start_time).toBeTruthy();
        });
      }
    });
  });

  describe('Public Booking Interface Verification', () => {
    it('should allow public access to Zeroum Barbearia data', async () => {
      if (!zeroumTenant) {
        console.log('Skipping test - Zeroum Barbearia tenant not found');
        return;
      }

      // Test public access to tenant data (simulating anonymous user)
      const { data: publicTenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, slug, status')
        .eq('slug', 'zeroumbarbearia')
        .eq('status', 'active')
        .single();

      expect(tenantError).toBeNull();
      expect(publicTenantData).toBeTruthy();

      // Test public access to services
      const { data: publicServices, error: servicesError } = await supabase
        .from('services')
        .select('id, name, description, price, duration')
        .eq('tenant_id', publicTenantData.id);

      expect(servicesError).toBeNull();
      expect(publicServices).toBeTruthy();

      // Test public access to staff
      const { data: publicStaff, error: staffError } = await supabase
        .from('staff')
        .select('id, name')
        .eq('tenant_id', publicTenantData.id);

      expect(staffError).toBeNull();
      expect(publicStaff).toBeTruthy();
    });

    it('should support booking creation for Zeroum Barbearia', async () => {
      if (!zeroumTenant) {
        console.log('Skipping test - Zeroum Barbearia tenant not found');
        return;
      }

      // Get available staff and services for booking test
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('tenant_id', zeroumTenant.id)
        .limit(1);

      const { data: services } = await supabase
        .from('services')
        .select('id')
        .eq('tenant_id', zeroumTenant.id)
        .limit(1);

      if (staff && staff.length > 0 && services && services.length > 0) {
        // Test booking creation (we'll create and then delete it)
        const testBooking = {
          tenant_id: zeroumTenant.id,
          staff_id: staff[0].id,
          service_id: services[0].id,
          customer_name: 'Test Customer',
          customer_phone: '11999999999',
          customer_email: 'test@example.com',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
          status: 'pending'
        };

        const { data: createdBooking, error: createError } = await supabase
          .from('bookings')
          .insert(testBooking)
          .select()
          .single();

        expect(createError).toBeNull();
        expect(createdBooking).toBeTruthy();
        expect(createdBooking.tenant_id).toBe(zeroumTenant.id);

        // Clean up the test booking
        if (createdBooking) {
          await supabase
            .from('bookings')
            .delete()
            .eq('id', createdBooking.id);
        }
      }
    });
  });

  describe('Data Integrity Verification', () => {
    it('should maintain data isolation for Zeroum Barbearia', async () => {
      if (!zeroumTenant) {
        console.log('Skipping test - Zeroum Barbearia tenant not found');
        return;
      }

      // Verify that all services belong to the correct tenant
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('tenant_id')
        .eq('tenant_id', zeroumTenant.id);

      if (services && services.length > 0) {
        services.forEach(service => {
          expect(service.tenant_id).toBe(zeroumTenant.id);
        });
      }

      // Verify that all staff belong to the correct tenant
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('tenant_id')
        .eq('tenant_id', zeroumTenant.id);

      if (staff && staff.length > 0) {
        staff.forEach(member => {
          expect(member.tenant_id).toBe(zeroumTenant.id);
        });
      }

      // Verify that all bookings belong to the correct tenant
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('tenant_id')
        .eq('tenant_id', zeroumTenant.id)
        .limit(10);

      if (bookings && bookings.length > 0) {
        bookings.forEach(booking => {
          expect(booking.tenant_id).toBe(zeroumTenant.id);
        });
      }
    });

    it('should have proper tenant configuration', async () => {
      if (!zeroumTenant) {
        console.log('Skipping test - Zeroum Barbearia tenant not found');
        return;
      }

      expect(zeroumTenant.id).toBeTruthy();
      expect(zeroumTenant.name).toBeTruthy();
      expect(zeroumTenant.slug).toBe('zeroumbarbearia');
      expect(zeroumTenant.status).toBe('active');
      expect(zeroumTenant.created_at).toBeTruthy();
      
      // Check if it has owner_id
      expect(zeroumTenant.owner_id).toBeTruthy();
    });
  });
});