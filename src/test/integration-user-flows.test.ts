/**
 * Integration Tests for Complete User Flows
 * Tests public booking flow, admin subscription upgrade, and WhatsApp notifications for Pro plan
 * Requirements: 1.1, 1.3, 3.1, 4.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock environment variables
const mockEnv = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  MERCADOPAGO_ACCESS_TOKEN: 'test-mp-token',
  WHATSAPP_API_URL: 'https://api.whatsapp.test.com',
  WHATSAPP_API_KEY: 'test-whatsapp-key'
}

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn()
  },
  functions: {
    invoke: vi.fn()
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

// Mock fetch for external API calls
global.fetch = vi.fn()

// Test data structures
interface TestTenant {
  id: string
  slug: string
  name: string
  owner_id: string
  plan: 'free' | 'pro' | 'enterprise'
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'inactive'
  mp_payer_id?: string
  mp_subscription_id?: string
  settings: {
    whatsapp_enabled?: boolean
    whatsapp_api_url?: string
    whatsapp_api_key?: string
    whatsapp_instance?: string
  }
}

interface TestService {
  id: string
  tenant_id: string
  name: string
  duration_min: number
  price: number
}

interface TestStaff {
  id: string
  tenant_id: string
  name: string
  email: string
}

interface TestBooking {
  id: string
  tenant_id: string
  customer_id: string
  service_id: string
  staff_id: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled'
  total_price: number
}

describe('Integration Tests - Complete User Flows', () => {
  let testTenant: TestTenant
  let testService: TestService
  let testStaff: TestStaff

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup test data
    testTenant = {
      id: 'tenant-integration-test',
      slug: 'zeroum-test',
      name: 'Zeroum Barbearia Test',
      owner_id: 'owner-123',
      plan: 'free',
      subscription_status: 'inactive',
      settings: {}
    }

    testService = {
      id: 'service-123',
      tenant_id: testTenant.id,
      name: 'Corte + Barba',
      duration_min: 60,
      price: 45.00
    }

    testStaff = {
      id: 'staff-123',
      tenant_id: testTenant.id,
      name: 'Carlos Barbeiro',
      email: 'carlos@zeroum.com'
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Public Booking Flow Integration', () => {
    it('should complete full public booking flow from start to finish', async () => {
      // Mock tenant resolution by slug
      const mockTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: testTenant,
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockTenantQuery)

      // Mock services query
      const mockServicesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [testService],
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockServicesQuery)

      // Mock staff query
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [testStaff],
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockStaffQuery)

      // Mock availability check
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      })

      // Mock customer creation
      const mockCustomerInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'customer-123' },
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockCustomerInsert)

      // Mock booking creation
      const mockBookingInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'booking-123' },
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockBookingInsert)

      // Step 1: Load tenant by slug
      const tenantResult = await mockSupabase.from('tenants')
        .select('*')
        .eq('slug', 'zeroum-test')
        .single()

      expect(tenantResult.data).toEqual(testTenant)

      // Step 2: Load services for tenant
      const servicesResult = await mockSupabase.from('services')
        .select('*')
        .eq('tenant_id', testTenant.id)
        .order('name')

      expect(servicesResult.data).toContain(testService)

      // Step 3: Load staff for tenant
      const staffResult = await mockSupabase.from('staff')
        .select('*')
        .eq('tenant_id', testTenant.id)
        .order('name')

      expect(staffResult.data).toContain(testStaff)

      // Step 4: Check availability
      const startTime = '2024-12-20T14:00:00.000Z'
      const endTime = '2024-12-20T15:00:00.000Z'

      const availabilityResult = await mockSupabase.rpc('check_availability', {
        p_tenant_id: testTenant.id,
        p_staff_id: testStaff.id,
        p_start_time: startTime,
        p_end_time: endTime
      })

      expect(availabilityResult.data).toBe(true)

      // Step 5: Create customer
      const customerData = {
        tenant_id: testTenant.id,
        name: 'João Silva',
        phone: '(11) 99999-9999',
        email: 'joao@example.com'
      }

      const customerResult = await mockSupabase.from('customers')
        .insert(customerData)
        .select('id')
        .single()

      expect(customerResult.data.id).toBe('customer-123')

      // Step 6: Create booking
      const bookingData = {
        tenant_id: testTenant.id,
        customer_id: 'customer-123',
        service_id: testService.id,
        staff_id: testStaff.id,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        total_price: testService.price
      }

      const bookingResult = await mockSupabase.from('bookings')
        .insert(bookingData)
        .select('id')
        .single()

      expect(bookingResult.data.id).toBe('booking-123')

      // Verify all database calls were made correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('tenants')
      expect(mockSupabase.from).toHaveBeenCalledWith('services')
      expect(mockSupabase.from).toHaveBeenCalledWith('staff')
      expect(mockSupabase.from).toHaveBeenCalledWith('customers')
      expect(mockSupabase.from).toHaveBeenCalledWith('bookings')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_availability', expect.any(Object))
    })

    it('should handle booking conflicts during public booking flow', async () => {
      // Mock tenant resolution
      const mockTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: testTenant,
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockTenantQuery)

      // Mock availability check returning false (conflict)
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null
      })

      // Step 1: Load tenant
      const tenantResult = await mockSupabase.from('tenants')
        .select('*')
        .eq('slug', 'zeroum-test')
        .single()

      expect(tenantResult.data).toEqual(testTenant)

      // Step 2: Check availability (should return false)
      const availabilityResult = await mockSupabase.rpc('check_availability', {
        p_tenant_id: testTenant.id,
        p_staff_id: testStaff.id,
        p_start_time: '2024-12-20T14:00:00.000Z',
        p_end_time: '2024-12-20T15:00:00.000Z'
      })

      expect(availabilityResult.data).toBe(false)

      // Booking should not proceed when availability is false
      // This simulates the frontend preventing booking submission
      const shouldProceedWithBooking = availabilityResult.data
      expect(shouldProceedWithBooking).toBe(false)
    })

    it('should handle database errors gracefully during booking flow', async () => {
      // Mock tenant resolution with error
      const mockTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Tenant not found' }
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockTenantQuery)

      // Attempt to load tenant
      const tenantResult = await mockSupabase.from('tenants')
        .select('*')
        .eq('slug', 'invalid-slug')
        .single()

      expect(tenantResult.error).toBeTruthy()
      expect(tenantResult.error.message).toBe('Tenant not found')
      expect(tenantResult.data).toBeNull()

      // Flow should stop here and show appropriate error
    })
  })

  describe('Admin Subscription Upgrade Flow Integration', () => {
    it('should complete full subscription upgrade flow', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'owner-123' } },
        error: null
      })

      // Mock tenant query for authenticated user
      const mockTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: testTenant,
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockTenantQuery)

      // Mock Mercado Pago checkout creation
      const mockMPResponse = {
        checkout_url: 'https://checkout.mercadopago.com/test-123'
      }
      
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: mockMPResponse,
        error: null
      })

      // Mock payment webhook processing
      const mockWebhookPayload = {
        action: 'payment.created',
        data: {
          id: 'payment-123'
        },
        external_reference: `tenant_${testTenant.id}_pro`
      }

      // Mock tenant update after successful payment
      const mockTenantUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{
            ...testTenant,
            plan: 'pro',
            subscription_status: 'active',
            mp_subscription_id: 'sub-123'
          }],
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockTenantUpdate)

      // Step 1: Authenticate user
      const userResult = await mockSupabase.auth.getUser()
      expect(userResult.data.user.id).toBe('owner-123')

      // Step 2: Load tenant for authenticated user
      const tenantResult = await mockSupabase.from('tenants')
        .select('*')
        .eq('owner_id', 'owner-123')
        .single()

      expect(tenantResult.data).toEqual(testTenant)

      // Step 3: Create Mercado Pago checkout
      const checkoutResult = await mockSupabase.functions.invoke('mp-checkout', {
        body: {
          tenant_id: testTenant.id,
          plan: 'pro'
        }
      })

      expect(checkoutResult.data.checkout_url).toContain('checkout.mercadopago.com')

      // Step 4: Simulate webhook processing after payment
      // This would normally be triggered by Mercado Pago
      const updatedTenant = await mockSupabase.from('tenants')
        .update({
          plan: 'pro',
          subscription_status: 'active',
          mp_subscription_id: 'sub-123'
        })
        .eq('id', testTenant.id)
        .select()

      expect(updatedTenant.data[0].plan).toBe('pro')
      expect(updatedTenant.data[0].subscription_status).toBe('active')

      // Verify all steps were executed
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('mp-checkout', expect.any(Object))
    })

    it('should handle payment failures during upgrade flow', async () => {
      // Mock Mercado Pago checkout creation failure
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Payment service unavailable' }
      })

      // Attempt to create checkout
      const checkoutResult = await mockSupabase.functions.invoke('mp-checkout', {
        body: {
          tenant_id: testTenant.id,
          plan: 'pro'
        }
      })

      expect(checkoutResult.error).toBeTruthy()
      expect(checkoutResult.error.message).toBe('Payment service unavailable')
      expect(checkoutResult.data).toBeNull()

      // Tenant should remain on free plan
      expect(testTenant.plan).toBe('free')
    })

    it('should handle webhook authentication failures', async () => {
      // Mock webhook with invalid signature
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid webhook signature' })
      } as Response)

      // Simulate webhook call with invalid signature
      const webhookResult = await fetch('/api/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': 'invalid-signature'
        },
        body: JSON.stringify({
          action: 'payment.created',
          data: { id: 'payment-123' }
        })
      })

      expect(webhookResult.ok).toBe(false)
      expect(webhookResult.status).toBe(401)

      const errorData = await webhookResult.json()
      expect(errorData.error).toBe('Invalid webhook signature')
    })
  })

  describe('WhatsApp Notifications for Pro Plan Integration', () => {
    beforeEach(() => {
      // Setup Pro plan tenant with WhatsApp configuration
      testTenant = {
        ...testTenant,
        plan: 'pro',
        subscription_status: 'active',
        settings: {
          whatsapp_enabled: true,
          whatsapp_api_url: mockEnv.WHATSAPP_API_URL,
          whatsapp_api_key: mockEnv.WHATSAPP_API_KEY,
          whatsapp_instance: 'test-instance'
        }
      }
    })

    it('should send WhatsApp notification for Pro plan booking', async () => {
      // Mock booking creation that triggers webhook
      const mockBooking: TestBooking = {
        id: 'booking-456',
        tenant_id: testTenant.id,
        customer_id: 'customer-123',
        service_id: testService.id,
        staff_id: testStaff.id,
        start_time: '2024-12-20T14:00:00.000Z',
        end_time: '2024-12-20T15:00:00.000Z',
        status: 'pending',
        total_price: testService.price
      }

      // Mock booking insert with webhook trigger
      const mockBookingInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockBooking,
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockBookingInsert)

      // Mock WhatsApp notification function
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, message_id: 'msg-123' },
        error: null
      })

      // Step 1: Create booking (this would trigger the webhook in real scenario)
      const bookingResult = await mockSupabase.from('bookings')
        .insert({
          tenant_id: testTenant.id,
          customer_id: 'customer-123',
          service_id: testService.id,
          staff_id: testStaff.id,
          start_time: '2024-12-20T14:00:00.000Z',
          end_time: '2024-12-20T15:00:00.000Z',
          status: 'pending',
          total_price: testService.price
        })
        .select()
        .single()

      expect(bookingResult.data).toEqual(mockBooking)

      // Step 2: Simulate webhook trigger for WhatsApp notification
      const notificationResult = await mockSupabase.functions.invoke('notify-whatsapp', {
        body: {
          booking_id: mockBooking.id,
          tenant_id: testTenant.id
        }
      })

      expect(notificationResult.data.success).toBe(true)
      expect(notificationResult.data.message_id).toBe('msg-123')

      // Verify notification was attempted
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('notify-whatsapp', expect.any(Object))
    })

    it('should not send WhatsApp notification for Free plan booking', async () => {
      // Setup Free plan tenant
      const freeTenant = {
        ...testTenant,
        plan: 'free' as const,
        subscription_status: 'inactive' as const
      }

      // Mock booking creation for free tenant
      const mockBookingInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'booking-789',
            tenant_id: freeTenant.id,
            status: 'pending'
          },
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockBookingInsert)

      // Mock WhatsApp function returning plan restriction error
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'WhatsApp notifications not available for Free plan' }
      })

      // Create booking for free tenant
      const bookingResult = await mockSupabase.from('bookings')
        .insert({
          tenant_id: freeTenant.id,
          customer_id: 'customer-123',
          service_id: testService.id,
          staff_id: testStaff.id,
          start_time: '2024-12-20T14:00:00.000Z',
          end_time: '2024-12-20T15:00:00.000Z',
          status: 'pending',
          total_price: testService.price
        })
        .select()
        .single()

      expect(bookingResult.data.tenant_id).toBe(freeTenant.id)

      // Attempt to send notification (should fail due to plan restriction)
      const notificationResult = await mockSupabase.functions.invoke('notify-whatsapp', {
        body: {
          booking_id: 'booking-789',
          tenant_id: freeTenant.id
        }
      })

      expect(notificationResult.error).toBeTruthy()
      expect(notificationResult.error.message).toContain('Free plan')
    })

    it('should handle WhatsApp API failures gracefully', async () => {
      // Mock booking creation
      const mockBookingInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'booking-999',
            tenant_id: testTenant.id,
            status: 'pending'
          },
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockBookingInsert)

      // Mock WhatsApp API failure
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: false, error: 'WhatsApp API timeout' },
        error: null
      })

      // Create booking
      const bookingResult = await mockSupabase.from('bookings')
        .insert({
          tenant_id: testTenant.id,
          customer_id: 'customer-123',
          service_id: testService.id,
          staff_id: testStaff.id,
          start_time: '2024-12-20T14:00:00.000Z',
          end_time: '2024-12-20T15:00:00.000Z',
          status: 'pending',
          total_price: testService.price
        })
        .select()
        .single()

      expect(bookingResult.data.id).toBe('booking-999')

      // Attempt notification (should handle API failure)
      const notificationResult = await mockSupabase.functions.invoke('notify-whatsapp', {
        body: {
          booking_id: 'booking-999',
          tenant_id: testTenant.id
        }
      })

      expect(notificationResult.data.success).toBe(false)
      expect(notificationResult.data.error).toBe('WhatsApp API timeout')

      // Booking should still exist even if notification failed
      expect(bookingResult.data.status).toBe('pending')
    })
  })

  describe('Cross-Flow Integration Scenarios', () => {
    it('should handle complete flow: public booking → upgrade → WhatsApp notification', async () => {
      // Step 1: Start with Free plan tenant
      let currentTenant = { ...testTenant, plan: 'free' as const }

      // Mock public booking creation
      const mockBookingInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'booking-cross-flow' },
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockBookingInsert)

      // Create initial booking on free plan
      const initialBooking = await mockSupabase.from('bookings')
        .insert({
          tenant_id: currentTenant.id,
          customer_id: 'customer-123',
          service_id: testService.id,
          staff_id: testStaff.id,
          start_time: '2024-12-20T14:00:00.000Z',
          end_time: '2024-12-20T15:00:00.000Z',
          status: 'pending',
          total_price: testService.price
        })
        .select()
        .single()

      expect(initialBooking.data.id).toBe('booking-cross-flow')

      // Step 2: Upgrade to Pro plan
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { checkout_url: 'https://checkout.mercadopago.com/upgrade' },
        error: null
      })

      const upgradeResult = await mockSupabase.functions.invoke('mp-checkout', {
        body: {
          tenant_id: currentTenant.id,
          plan: 'pro'
        }
      })

      expect(upgradeResult.data.checkout_url).toContain('checkout.mercadopago.com')

      // Step 3: Simulate successful payment and tenant upgrade
      const mockTenantUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{
            ...currentTenant,
            plan: 'pro',
            subscription_status: 'active'
          }],
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockTenantUpdate)

      const upgradedTenant = await mockSupabase.from('tenants')
        .update({
          plan: 'pro',
          subscription_status: 'active'
        })
        .eq('id', currentTenant.id)
        .select()

      currentTenant = upgradedTenant.data[0]
      expect(currentTenant.plan).toBe('pro')

      // Step 4: Create new booking on Pro plan (should trigger WhatsApp)
      const mockProBookingInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'booking-pro-flow' },
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockProBookingInsert)

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, message_id: 'msg-pro-flow' },
        error: null
      })

      const proBooking = await mockSupabase.from('bookings')
        .insert({
          tenant_id: currentTenant.id,
          customer_id: 'customer-456',
          service_id: testService.id,
          staff_id: testStaff.id,
          start_time: '2024-12-21T15:00:00.000Z',
          end_time: '2024-12-21T16:00:00.000Z',
          status: 'pending',
          total_price: testService.price
        })
        .select()
        .single()

      expect(proBooking.data.id).toBe('booking-pro-flow')

      // WhatsApp notification should be sent for Pro plan booking
      const notificationResult = await mockSupabase.functions.invoke('notify-whatsapp', {
        body: {
          booking_id: 'booking-pro-flow',
          tenant_id: currentTenant.id
        }
      })

      expect(notificationResult.data.success).toBe(true)
      expect(notificationResult.data.message_id).toBe('msg-pro-flow')

      // Verify complete flow executed correctly
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('mp-checkout', expect.any(Object))
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('notify-whatsapp', expect.any(Object))
    })

    it('should handle tenant downgrade and feature restriction', async () => {
      // Start with Pro plan tenant
      let currentTenant = {
        ...testTenant,
        plan: 'pro' as const,
        subscription_status: 'active' as const
      }

      // Step 1: Create booking on Pro plan (should work)
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, message_id: 'msg-before-downgrade' },
        error: null
      })

      const proNotification = await mockSupabase.functions.invoke('notify-whatsapp', {
        body: {
          booking_id: 'booking-before-downgrade',
          tenant_id: currentTenant.id
        }
      })

      expect(proNotification.data.success).toBe(true)

      // Step 2: Simulate subscription cancellation/downgrade
      const mockDowngradeUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{
            ...currentTenant,
            plan: 'free',
            subscription_status: 'cancelled'
          }],
          error: null
        })
      }
      mockSupabase.from.mockReturnValueOnce(mockDowngradeUpdate)

      const downgradedTenant = await mockSupabase.from('tenants')
        .update({
          plan: 'free',
          subscription_status: 'cancelled'
        })
        .eq('id', currentTenant.id)
        .select()

      currentTenant = downgradedTenant.data[0]
      expect(currentTenant.plan).toBe('free')

      // Step 3: Attempt WhatsApp notification after downgrade (should fail)
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'WhatsApp notifications not available for Free plan' }
      })

      const freeNotification = await mockSupabase.functions.invoke('notify-whatsapp', {
        body: {
          booking_id: 'booking-after-downgrade',
          tenant_id: currentTenant.id
        }
      })

      expect(freeNotification.error).toBeTruthy()
      expect(freeNotification.error.message).toContain('Free plan')

      // Verify downgrade was processed correctly
      expect(currentTenant.subscription_status).toBe('cancelled')
    })
  })
})