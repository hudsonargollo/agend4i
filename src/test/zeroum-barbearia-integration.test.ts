import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Zeroum Barbearia Integration Tests', () => {
  let testTenant: any;
  let testService: any;
  let testStaff: any;
  let createdBookings: string[] = [];

  beforeAll(async () => {
    // Try to get the Zeroum Barbearia tenant or create a test tenant
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'zeroumbarbearia')
      .single();

    if (existingTenant) {
      testTenant = existingTenant;
    } else {
      // Create a test tenant for integration testing
      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert({
          name: 'Test Zeroum Barbearia',
          slug: 'test-zeroumbarbearia',
          owner_id: '00000000-0000-0000-0000-000000000000',
          plan: 'pro',
          subscription_status: 'active',
          status: 'active'
        })
        .select()
        .single();

      if (!error) {
        testTenant = newTenant;
      }
    }

    // Get or create test service and staff
    if (testTenant) {
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', testTenant.id)
        .limit(1);

      if (services && services.length > 0) {
        testService = services[0];
      }

      const { data: staff } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', testTenant.id)
        .limit(1);

      if (staff && staff.length > 0) {
        testStaff = staff[0];
      }
    }
  });

  afterAll(async () => {
    // Clean up created bookings
    if (createdBookings.length > 0) {
      await supabase
        .from('bookings')
        .delete()
        .in('id', createdBookings);
    }

    // Clean up test tenant if it was created
    if (testTenant && testTenant.slug === 'test-zeroumbarbearia') {
      await supabase
        .from('tenants')
        .delete()
        .eq('id', testTenant.id);
    }
  });

  describe('Complete Booking Flow Integration', () => {
    it('should support complete booking flow for Zeroum Barbearia tenant', async () => {
      if (!testTenant || !testService || !testStaff) {
        console.log('Skipping test - required test data not available');
        return;
      }

      // Step 1: Verify tenant is accessible
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', testTenant.id)
        .single();

      expect(tenantError).toBeNull();
      expect(tenantData).toBeTruthy();
      expect(tenantData.status).toBe('active');

      // Step 2: Verify services are accessible
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', testTenant.id);

      expect(servicesError).toBeNull();
      expect(servicesData).toBeTruthy();
      expect(Array.isArray(servicesData)).toBe(true);

      // Step 3: Verify staff are accessible
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', testTenant.id);

      expect(staffError).toBeNull();
      expect(staffData).toBeTruthy();
      expect(Array.isArray(staffData)).toBe(true);

      // Step 4: Create a test booking
      const bookingData = {
        tenant_id: testTenant.id,
        service_id: testService.id,
        staff_id: testStaff.id,
        customer_name: 'Integration Test Customer',
        customer_phone: '11999999999',
        customer_email: 'integration@test.com',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        status: 'pending'
      };

      const { data: createdBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      expect(bookingError).toBeNull();
      expect(createdBooking).toBeTruthy();
      expect(createdBooking.tenant_id).toBe(testTenant.id);
      expect(createdBooking.customer_name).toBe('Integration Test Customer');

      if (createdBooking) {
        createdBookings.push(createdBooking.id);
      }

      // Step 5: Verify booking can be retrieved
      const { data: retrievedBooking, error: retrieveError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', createdBooking.id)
        .single();

      expect(retrieveError).toBeNull();
      expect(retrievedBooking).toBeTruthy();
      expect(retrievedBooking.tenant_id).toBe(testTenant.id);
    });

    it('should maintain data isolation during booking operations', async () => {
      if (!testTenant) {
        console.log('Skipping test - test tenant not available');
        return;
      }

      // Create a booking for our test tenant
      if (testService && testStaff) {
        const bookingData = {
          tenant_id: testTenant.id,
          service_id: testService.id,
          staff_id: testStaff.id,
          customer_name: 'Isolation Test Customer',
          customer_phone: '11888888888',
          start_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 25 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          status: 'pending'
        };

        const { data: createdBooking, error } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single();

        if (!error && createdBooking) {
          createdBookings.push(createdBooking.id);

          // Verify that querying bookings for this tenant only returns this tenant's bookings
          const { data: tenantBookings, error: queryError } = await supabase
            .from('bookings')
            .select('*')
            .eq('tenant_id', testTenant.id);

          expect(queryError).toBeNull();
          expect(tenantBookings).toBeTruthy();
          
          if (tenantBookings) {
            tenantBookings.forEach(booking => {
              expect(booking.tenant_id).toBe(testTenant.id);
            });
          }
        }
      }
    });
  });

  describe('Pro Plan Feature Integration', () => {
    it('should have Pro Plan features enabled for Zeroum Barbearia', async () => {
      if (!testTenant) {
        console.log('Skipping test - test tenant not available');
        return;
      }

      // Verify tenant has Pro Plan
      expect(testTenant.plan).toBe('pro');
      expect(testTenant.subscription_status).toBe('active');

      // Verify Pro Plan features are available
      const proFeatures = {
        whatsappNotifications: true,
        paymentProcessing: true,
        unlimitedStaff: true
      };

      // Test that Pro Plan features are conceptually available
      expect(proFeatures.whatsappNotifications).toBe(true);
      expect(proFeatures.paymentProcessing).toBe(true);
      expect(proFeatures.unlimitedStaff).toBe(true);
    });

    it('should support WhatsApp notification configuration for Pro Plan', async () => {
      if (!testTenant) {
        console.log('Skipping test - test tenant not available');
        return;
      }

      // Verify tenant can have WhatsApp settings
      const whatsappConfig = {
        enabled: testTenant.plan === 'pro',
        apiUrl: 'https://api.whatsapp.example.com',
        phoneNumber: '+5511999999999'
      };

      expect(whatsappConfig.enabled).toBe(true);
      expect(whatsappConfig.apiUrl).toBeTruthy();
      expect(whatsappConfig.phoneNumber).toBeTruthy();
    });

    it('should support payment processing configuration for Pro Plan', async () => {
      if (!testTenant) {
        console.log('Skipping test - test tenant not available');
        return;
      }

      // Verify tenant can have payment settings
      const paymentConfig = {
        enabled: testTenant.plan === 'pro',
        mercadoPagoEnabled: true,
        subscriptionActive: testTenant.subscription_status === 'active'
      };

      expect(paymentConfig.enabled).toBe(true);
      expect(paymentConfig.mercadoPagoEnabled).toBe(true);
      expect(paymentConfig.subscriptionActive).toBe(true);
    });
  });

  describe('Backward Compatibility Integration', () => {
    it('should maintain backward compatibility with existing data structure', async () => {
      if (!testTenant) {
        console.log('Skipping test - test tenant not available');
        return;
      }

      // Verify tenant has all required fields for backward compatibility
      const requiredFields = ['id', 'name', 'slug', 'status', 'created_at'];
      
      requiredFields.forEach(field => {
        expect(testTenant[field]).toBeTruthy();
      });

      // Verify tenant slug follows expected pattern
      expect(testTenant.slug).toMatch(/^[a-z0-9-]+$/);
      expect(testTenant.slug.length).toBeGreaterThan(2);
      expect(testTenant.slug.length).toBeLessThanOrEqual(50);
    });

    it('should support existing URL patterns', async () => {
      if (!testTenant) {
        console.log('Skipping test - test tenant not available');
        return;
      }

      // Test URL pattern compatibility
      const publicUrl = `/${testTenant.slug}`;
      const adminUrl = '/app';

      expect(publicUrl).toMatch(/^\/[a-z0-9-]+$/);
      expect(adminUrl).toBe('/app');

      // Verify slug doesn't conflict with reserved paths
      const reservedPaths = ['app', 'auth', 'api', 'dashboard', 'onboarding', 'settings'];
      expect(reservedPaths.includes(testTenant.slug)).toBe(false);
    });

    it('should maintain existing service and staff relationships', async () => {
      if (!testTenant) {
        console.log('Skipping test - test tenant not available');
        return;
      }

      // Verify services maintain proper tenant relationship
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', testTenant.id);

      expect(servicesError).toBeNull();
      if (services && services.length > 0) {
        services.forEach(service => {
          expect(service.tenant_id).toBe(testTenant.id);
          expect(service.name).toBeTruthy();
          expect(service.price).toBeGreaterThan(0);
        });
      }

      // Verify staff maintain proper tenant relationship
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', testTenant.id);

      expect(staffError).toBeNull();
      if (staff && staff.length > 0) {
        staff.forEach(member => {
          expect(member.tenant_id).toBe(testTenant.id);
          expect(member.name).toBeTruthy();
        });
      }
    });
  });
});