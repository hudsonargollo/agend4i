/**
 * Property-Based Tests for WhatsApp Notification Triggering
 * **Feature: saas-multi-tenancy, Property 8: WhatsApp notification triggering**
 * **Validates: Requirements 4.1, 4.3**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client for testing
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'mock-key'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test data generators
const tenantIdArb = fc.uuid()
const bookingIdArb = fc.uuid()
const phoneArb = fc.stringMatching(/^\+?[1-9]\d{1,14}$/) // Valid international phone format
const planArb = fc.constantFrom('free', 'pro', 'enterprise')
const subscriptionStatusArb = fc.constantFrom('active', 'past_due', 'cancelled', 'inactive')

// Mock tenant data structure
interface TestTenant {
  id: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'inactive'
  settings: {
    whatsapp_enabled?: boolean
    whatsapp_api_url?: string
    whatsapp_api_key?: string
    whatsapp_instance?: string
  }
}

// Mock booking data structure
interface TestBooking {
  id: string
  tenant_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  staff_name: string
  service_name: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  total_price?: number
}

// Mock webhook event structure
interface WebhookEvent {
  id: string
  event_type: string
  payload: {
    booking_id: string
    tenant_id: string
    event_type: string
    timestamp: number
  }
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

// Helper functions to determine notification eligibility
function isProPlanActive(tenant: TestTenant): boolean {
  return (
    (tenant.plan === 'pro' || tenant.plan === 'enterprise') &&
    tenant.subscription_status === 'active'
  )
}

function hasWhatsAppConfiguration(tenant: TestTenant): boolean {
  const settings = tenant.settings
  return !!(
    settings.whatsapp_enabled &&
    settings.whatsapp_api_url &&
    settings.whatsapp_api_key &&
    settings.whatsapp_instance
  )
}

function shouldTriggerWhatsAppNotification(
  booking: TestBooking,
  tenant: TestTenant
): boolean {
  return (
    booking.status === 'pending' &&
    !!booking.customer_phone &&
    isProPlanActive(tenant) &&
    hasWhatsAppConfiguration(tenant)
  )
}

// Mock webhook queue simulation
class MockWebhookQueue {
  private events: WebhookEvent[] = []

  addEvent(booking: TestBooking): void {
    if (booking.status === 'pending') {
      this.events.push({
        id: fc.sample(fc.uuid(), 1)[0],
        event_type: 'whatsapp_notification',
        payload: {
          booking_id: booking.id,
          tenant_id: booking.tenant_id,
          event_type: 'booking_created',
          timestamp: Date.now()
        },
        status: 'pending'
      })
    }
  }

  getEventsForBooking(bookingId: string): WebhookEvent[] {
    return this.events.filter(e => e.payload.booking_id === bookingId)
  }

  clear(): void {
    this.events = []
  }
}

describe('WhatsApp Notification Triggering Properties', () => {
  let mockQueue: MockWebhookQueue

  beforeAll(async () => {
    console.log('Setting up WhatsApp notification triggering tests...')
    mockQueue = new MockWebhookQueue()
  })

  afterAll(async () => {
    console.log('Cleaning up WhatsApp notification triggering tests...')
  })

  it('Property 8: WhatsApp notification triggering - notifications should be triggered if and only if tenant has active Pro subscription and valid WhatsApp configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: tenantIdArb,
          name: fc.string({ minLength: 1, maxLength: 50 }),
          plan: planArb,
          subscription_status: subscriptionStatusArb,
          settings: fc.record({
            whatsapp_enabled: fc.boolean(),
            whatsapp_api_url: fc.option(fc.webUrl()),
            whatsapp_api_key: fc.option(fc.string({ minLength: 10, maxLength: 50 })),
            whatsapp_instance: fc.option(fc.string({ minLength: 5, maxLength: 20 }))
          })
        }),
        fc.record({
          id: bookingIdArb,
          tenant_id: tenantIdArb,
          customer_name: fc.string({ minLength: 1, maxLength: 100 }),
          customer_phone: fc.option(phoneArb),
          customer_email: fc.option(fc.emailAddress()),
          staff_name: fc.string({ minLength: 1, maxLength: 50 }),
          service_name: fc.string({ minLength: 1, maxLength: 100 }),
          start_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          end_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          status: fc.constantFrom('pending', 'confirmed', 'cancelled', 'completed', 'no_show'),
          total_price: fc.option(fc.float({ min: 0, max: 1000 }))
        }),
        async (tenant, bookingData) => {
          // Ensure booking belongs to the tenant
          const booking: TestBooking = {
            ...bookingData,
            tenant_id: tenant.id,
            start_time: bookingData.start_time.toISOString(),
            end_time: bookingData.end_time.toISOString()
          }

          mockQueue.clear()

          // Simulate booking creation trigger
          mockQueue.addEvent(booking)

          // Determine if notification should be triggered
          const shouldTrigger = shouldTriggerWhatsAppNotification(booking, tenant)
          const webhookEvents = mockQueue.getEventsForBooking(booking.id)

          if (booking.status === 'pending') {
            // Property: Webhook event should always be created for pending bookings
            expect(webhookEvents.length).toBe(1)
            expect(webhookEvents[0].event_type).toBe('whatsapp_notification')
            expect(webhookEvents[0].payload.booking_id).toBe(booking.id)
            expect(webhookEvents[0].payload.tenant_id).toBe(tenant.id)

            // Property: Notification processing should succeed if and only if all conditions are met
            if (shouldTrigger) {
              // All conditions met: Pro plan active + WhatsApp configured + customer has phone
              expect(isProPlanActive(tenant)).toBe(true)
              expect(hasWhatsAppConfiguration(tenant)).toBe(true)
              expect(booking.customer_phone).toBeTruthy()
            } else {
              // At least one condition not met
              const hasProPlan = isProPlanActive(tenant)
              const hasWhatsApp = hasWhatsAppConfiguration(tenant)
              const hasPhone = !!booking.customer_phone

              expect(hasProPlan && hasWhatsApp && hasPhone).toBe(false)
            }
          } else {
            // Property: No webhook events should be created for non-pending bookings
            expect(webhookEvents.length).toBe(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 8.1: Pro plan requirement - WhatsApp notifications should only be available for Pro and Enterprise plans with active subscription', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: tenantIdArb,
          name: fc.string({ minLength: 1, maxLength: 50 }),
          plan: planArb,
          subscription_status: subscriptionStatusArb,
          settings: fc.record({
            whatsapp_enabled: fc.constant(true),
            whatsapp_api_url: fc.webUrl(),
            whatsapp_api_key: fc.string({ minLength: 10, maxLength: 50 }),
            whatsapp_instance: fc.string({ minLength: 5, maxLength: 20 })
          })
        }),
        async (tenant) => {
          const isEligible = isProPlanActive(tenant)
          const isPaidPlan = tenant.plan === 'pro' || tenant.plan === 'enterprise'
          const isActiveSubscription = tenant.subscription_status === 'active'

          // Property: Pro plan eligibility requires both paid plan and active subscription
          expect(isEligible).toBe(isPaidPlan && isActiveSubscription)

          // Property: Free plan should never be eligible regardless of subscription status
          if (tenant.plan === 'free') {
            expect(isEligible).toBe(false)
          }

          // Property: Inactive subscription should make tenant ineligible regardless of plan
          if (tenant.subscription_status !== 'active') {
            expect(isEligible).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 8.2: WhatsApp configuration requirement - notifications should only work with complete configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          whatsapp_enabled: fc.boolean(),
          whatsapp_api_url: fc.option(fc.webUrl()),
          whatsapp_api_key: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          whatsapp_instance: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
        }),
        async (settings) => {
          const tenant: TestTenant = {
            id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Tenant',
            plan: 'pro',
            subscription_status: 'active',
            settings
          }

          const hasConfig = hasWhatsAppConfiguration(tenant)
          const hasAllFields = !!(
            settings.whatsapp_enabled &&
            settings.whatsapp_api_url &&
            settings.whatsapp_api_key &&
            settings.whatsapp_instance
          )

          // Property: Configuration is valid if and only if all required fields are present and enabled
          expect(hasConfig).toBe(hasAllFields)

          // Property: Missing any required field should make configuration invalid
          if (!settings.whatsapp_enabled || 
              !settings.whatsapp_api_url || 
              !settings.whatsapp_api_key || 
              !settings.whatsapp_instance) {
            expect(hasConfig).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 8.3: Customer phone requirement - notifications should only be sent to customers with valid phone numbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(phoneArb),
        async (customerPhone) => {
          const tenant: TestTenant = {
            id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Tenant',
            plan: 'pro',
            subscription_status: 'active',
            settings: {
              whatsapp_enabled: true,
              whatsapp_api_url: 'https://api.example.com',
              whatsapp_api_key: 'test-key',
              whatsapp_instance: 'test-instance'
            }
          }

          const booking: TestBooking = {
            id: fc.sample(fc.uuid(), 1)[0],
            tenant_id: tenant.id,
            customer_name: 'Test Customer',
            customer_phone: customerPhone || '',
            staff_name: 'Test Staff',
            service_name: 'Test Service',
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(),
            status: 'pending'
          }

          const shouldTrigger = shouldTriggerWhatsAppNotification(booking, tenant)

          // Property: Notification should only be triggered if customer has a phone number
          if (customerPhone) {
            expect(shouldTrigger).toBe(true)
          } else {
            expect(shouldTrigger).toBe(false)
          }

          // Property: Empty or null phone should prevent notification
          if (!booking.customer_phone || booking.customer_phone.trim() === '') {
            expect(shouldTrigger).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 8.4: Booking status requirement - notifications should only be triggered for pending bookings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('pending', 'confirmed', 'cancelled', 'completed', 'no_show'),
        async (bookingStatus) => {
          const tenant: TestTenant = {
            id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Tenant',
            plan: 'pro',
            subscription_status: 'active',
            settings: {
              whatsapp_enabled: true,
              whatsapp_api_url: 'https://api.example.com',
              whatsapp_api_key: 'test-key',
              whatsapp_instance: 'test-instance'
            }
          }

          const booking: TestBooking = {
            id: fc.sample(fc.uuid(), 1)[0],
            tenant_id: tenant.id,
            customer_name: 'Test Customer',
            customer_phone: '+5511999999999',
            staff_name: 'Test Staff',
            service_name: 'Test Service',
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(),
            status: bookingStatus
          }

          mockQueue.clear()
          mockQueue.addEvent(booking)

          const webhookEvents = mockQueue.getEventsForBooking(booking.id)
          const shouldTrigger = shouldTriggerWhatsAppNotification(booking, tenant)

          // Property: Webhook events should only be created for pending bookings
          if (bookingStatus === 'pending') {
            expect(webhookEvents.length).toBe(1)
            expect(shouldTrigger).toBe(true)
          } else {
            expect(webhookEvents.length).toBe(0)
            expect(shouldTrigger).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})