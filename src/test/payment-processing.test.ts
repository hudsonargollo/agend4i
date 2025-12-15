/**
 * Unit Tests for Payment Processing
 * Tests subscription preference generation, webhook authentication, and subscription status transitions
 * Requirements: 3.1, 3.2, 6.1, 6.2, 6.3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { generateAdminURL } from '@/lib/domain'

// Mock MercadoPago preference structure
interface MercadoPagoPreference {
  items: Array<{
    title: string
    quantity: number
    unit_price: number
    currency_id: string
  }>
  payer: {
    email: string
  }
  external_reference: string
  notification_url: string
  back_urls: {
    success: string
    failure: string
    pending: string
  }
  auto_return: string
  subscription_data?: {
    frequency: number
    frequency_type: string
    repetitions?: number
  }
}

// Plan configurations
const PLAN_CONFIG = {
  pro: {
    title: 'Plano Pro - Agendai',
    price: 29.90,
    features: ['WhatsApp notifications', 'Payment processing', 'Advanced analytics']
  },
  enterprise: {
    title: 'Plano Enterprise - Agendai',
    price: 99.90,
    features: ['All Pro features', 'Custom branding', 'Priority support', 'API access']
  }
}

// Mock subscription request
interface CreateSubscriptionRequest {
  tenant_id: string
  plan: 'pro' | 'enterprise'
  payer_email: string
}
// Function to create MercadoPago preference (extracted from the serverless function)
function createMercadoPagoPreference(
  request: CreateSubscriptionRequest,
  baseUrl: string
): MercadoPagoPreference {
  const planConfig = PLAN_CONFIG[request.plan]
  
  return {
    items: [{
      title: planConfig.title,
      quantity: 1,
      unit_price: planConfig.price,
      currency_id: 'BRL'
    }],
    payer: {
      email: request.payer_email
    },
    external_reference: `tenant_${request.tenant_id}_${request.plan}`,
    notification_url: `${baseUrl}/functions/v1/mp-checkout`,
    back_urls: {
      success: generateAdminURL('/billing?status=success'),
      failure: generateAdminURL('/billing?status=failure'),
      pending: generateAdminURL('/billing?status=pending')
    },
    auto_return: 'approved',
    subscription_data: {
      frequency: 1,
      frequency_type: 'months'
    }
  }
}

// Function to determine subscription status from payment status
function getSubscriptionStatusFromPayment(paymentStatus: string): string {
  switch (paymentStatus) {
    case 'approved':
      return 'active'
    case 'pending':
      return 'past_due'
    case 'cancelled':
    case 'rejected':
      return 'cancelled'
    default:
      return 'inactive'
  }
}

// Function to validate subscription request
function validateSubscriptionRequest(request: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!request.tenant_id || request.tenant_id === '') {
    errors.push('Missing tenant_id')
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.tenant_id)) {
    errors.push('Invalid tenant_id format')
  }
  
  if (!request.plan || request.plan === '') {
    errors.push('Missing plan')
  } else if (!['pro', 'enterprise'].includes(request.plan)) {
    errors.push('Invalid plan')
  }
  
  if (!request.payer_email || request.payer_email === '') {
    errors.push('Missing payer_email')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.payer_email)) {
    errors.push('Invalid email format')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Webhook signature verification function (extracted from serverless function)
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    let signatureBuffer: Uint8Array
    
    if (signature.startsWith('sha256=')) {
      const hexSignature = signature.replace('sha256=', '')
      signatureBuffer = new Uint8Array(
        hexSignature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      )
    } else if (signature.match(/^[0-9a-fA-F]+$/)) {
      signatureBuffer = new Uint8Array(
        signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      )
    } else {
      const binaryString = atob(signature)
      signatureBuffer = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        signatureBuffer[i] = binaryString.charCodeAt(i)
      }
    }

    return await crypto.subtle.verify('HMAC', key, signatureBuffer, encoder.encode(payload))
  } catch (error) {
    return false
  }
}

// External reference parsing function (extracted from serverless function)
function parseExternalReference(externalRef: string): { tenantId: string; plan: string } | null {
  try {
    if (!externalRef || typeof externalRef !== 'string') {
      return null
    }

    const pattern = /^tenant_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(pro|enterprise)$/
    const match = externalRef.match(pattern)
    
    if (!match) {
      return null
    }

    return {
      tenantId: match[1],
      plan: match[2]
    }
  } catch (error) {
    return null
  }
}

// Payment data sanitization function (extracted from serverless function)
function sanitizePaymentData(payment: any): { payerId: string; subscriptionId: string } | null {
  try {
    const payerId = payment?.payer?.id
    const subscriptionId = payment?.id

    if (!payerId || !subscriptionId || 
        typeof payerId !== 'string' || typeof subscriptionId !== 'string' ||
        payerId.trim() === '' || subscriptionId.trim() === '') {
      return null
    }

    const idPattern = /^[a-zA-Z0-9_-]+$/
    if (!idPattern.test(payerId) || !idPattern.test(subscriptionId)) {
      return null
    }

    return {
      payerId: payerId.trim(),
      subscriptionId: subscriptionId.trim()
    }
  } catch (error) {
    return null
  }
}

// Mock webhook payload structure
interface WebhookPayload {
  id: string
  live_mode: boolean
  type: string
  date_created: string
  application_id: string
  user_id: string
  version: number
  api_version: string
  action: string
  data: {
    id: string
  }
}

// Mock payment response structure
interface PaymentResponse {
  id: string
  status: string
  external_reference: string
  payer: {
    id: string
    email?: string
  }
  transaction_amount?: number
  installments?: number
}

// Webhook processing simulation function
function processWebhookPayment(
  webhookData: WebhookPayload,
  paymentResponse: PaymentResponse
): { success: boolean; subscriptionStatus: string; error?: string } {
  try {
    // Validate webhook data structure
    if (!webhookData.data?.id || typeof webhookData.data.id !== 'string') {
      throw new Error('Invalid webhook data structure')
    }

    // Parse external_reference
    const refData = parseExternalReference(paymentResponse.external_reference)
    if (!refData) {
      throw new Error('Invalid or malformed external_reference')
    }

    // Sanitize payment data
    const sanitizedData = sanitizePaymentData(paymentResponse)
    if (!sanitizedData) {
      throw new Error('Failed to sanitize payment data')
    }

    // Determine subscription status
    const subscriptionStatus = getSubscriptionStatusFromPayment(paymentResponse.status)

    return {
      success: true,
      subscriptionStatus
    }
  } catch (error) {
    return {
      success: false,
      subscriptionStatus: 'inactive',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
describe('Payment Processing Unit Tests', () => {
  beforeAll(async () => {
    console.log('Setting up payment processing tests...')
  })

  afterAll(async () => {
    console.log('Cleaning up payment processing tests...')
  })

  describe('Subscription Preference Generation', () => {
    it('should generate correct preference for Pro plan', () => {
      const request: CreateSubscriptionRequest = {
        tenant_id: '12345678-1234-1234-1234-123456789012',
        plan: 'pro',
        payer_email: 'test@example.com'
      }
      const baseUrl = 'https://test.supabase.co'

      const preference = createMercadoPagoPreference(request, baseUrl)

      expect(preference.items).toHaveLength(1)
      expect(preference.items[0]).toEqual({
        title: 'Plano Pro - Agendai',
        quantity: 1,
        unit_price: 29.90,
        currency_id: 'BRL'
      })
      expect(preference.payer.email).toBe('test@example.com')
      expect(preference.external_reference).toBe('tenant_12345678-1234-1234-1234-123456789012_pro')
      expect(preference.notification_url).toBe('https://test.supabase.co/functions/v1/mp-checkout')
      expect(preference.back_urls.success).toBe(generateAdminURL('/billing?status=success'))
      expect(preference.subscription_data).toEqual({
        frequency: 1,
        frequency_type: 'months'
      })
    })

    it('should generate correct preference for Enterprise plan', () => {
      const request: CreateSubscriptionRequest = {
        tenant_id: '87654321-4321-4321-4321-210987654321',
        plan: 'enterprise',
        payer_email: 'enterprise@example.com'
      }
      const baseUrl = 'https://prod.supabase.co'

      const preference = createMercadoPagoPreference(request, baseUrl)

      expect(preference.items[0]).toEqual({
        title: 'Plano Enterprise - Agendai',
        quantity: 1,
        unit_price: 99.90,
        currency_id: 'BRL'
      })
      expect(preference.payer.email).toBe('enterprise@example.com')
      expect(preference.external_reference).toBe('tenant_87654321-4321-4321-4321-210987654321_enterprise')
      expect(preference.back_urls.success).toBe(generateAdminURL('/billing?status=success'))
    })

    it('should handle different base URLs correctly', () => {
      const request: CreateSubscriptionRequest = {
        tenant_id: '11111111-2222-3333-4444-555555555555',
        plan: 'pro',
        payer_email: 'test@domain.com'
      }

      const testUrls = [
        'https://dev.supabase.co',
        'https://staging.supabase.co',
        'https://custom.supabase.co'
      ]

      testUrls.forEach(baseUrl => {
        const preference = createMercadoPagoPreference(request, baseUrl)
        expect(preference.notification_url).toBe(`${baseUrl}/functions/v1/mp-checkout`)
        expect(preference.back_urls.success).toBe(generateAdminURL('/billing?status=success'))
      })
    })
  })
  describe('Subscription Request Validation', () => {
    it('should validate correct subscription requests', () => {
      const validRequest = {
        tenant_id: '12345678-1234-1234-1234-123456789012',
        plan: 'pro',
        payer_email: 'valid@example.com'
      }

      const result = validateSubscriptionRequest(validRequest)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject requests with missing fields', () => {
      const invalidRequests = [
        { plan: 'pro', payer_email: 'test@example.com' }, // missing tenant_id
        { tenant_id: '12345678-1234-1234-1234-123456789012', payer_email: 'test@example.com' }, // missing plan
        { tenant_id: '12345678-1234-1234-1234-123456789012', plan: 'pro' }, // missing payer_email
        {} // missing all fields
      ]

      invalidRequests.forEach(request => {
        const result = validateSubscriptionRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    it('should reject requests with invalid tenant_id format', () => {
      const invalidTenantIds = [
        'invalid-uuid',
        '12345678-1234-1234-1234', // too short
        '12345678-1234-1234-1234-123456789012-extra', // too long
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // invalid characters
      ]

      invalidTenantIds.forEach(tenantId => {
        const request = {
          tenant_id: tenantId,
          plan: 'pro',
          payer_email: 'test@example.com'
        }
        const result = validateSubscriptionRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Invalid tenant_id format')
      })

      // Test empty string separately (should be "missing")
      const emptyRequest = {
        tenant_id: '',
        plan: 'pro',
        payer_email: 'test@example.com'
      }
      const emptyResult = validateSubscriptionRequest(emptyRequest)
      expect(emptyResult.valid).toBe(false)
      expect(emptyResult.errors).toContain('Missing tenant_id')
    })

    it('should reject requests with invalid plan', () => {
      const invalidPlans = ['free', 'basic', 'premium', 'invalid']

      invalidPlans.forEach(plan => {
        const request = {
          tenant_id: '12345678-1234-1234-1234-123456789012',
          plan: plan,
          payer_email: 'test@example.com'
        }
        const result = validateSubscriptionRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Invalid plan')
      })

      // Test empty string separately (should be "missing")
      const emptyRequest = {
        tenant_id: '12345678-1234-1234-1234-123456789012',
        plan: '',
        payer_email: 'test@example.com'
      }
      const emptyResult = validateSubscriptionRequest(emptyRequest)
      expect(emptyResult.valid).toBe(false)
      expect(emptyResult.errors).toContain('Missing plan')
    })

    it('should reject requests with invalid email format', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com'
      ]

      invalidEmails.forEach(email => {
        const request = {
          tenant_id: '12345678-1234-1234-1234-123456789012',
          plan: 'pro',
          payer_email: email
        }
        const result = validateSubscriptionRequest(request)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Invalid email format')
      })

      // Test empty string separately (should be "missing")
      const emptyRequest = {
        tenant_id: '12345678-1234-1234-1234-123456789012',
        plan: 'pro',
        payer_email: ''
      }
      const emptyResult = validateSubscriptionRequest(emptyRequest)
      expect(emptyResult.valid).toBe(false)
      expect(emptyResult.errors).toContain('Missing payer_email')
    })
  })
  describe('Subscription Status Transitions', () => {
    it('should map payment statuses to correct subscription statuses', () => {
      const statusMappings = [
        { payment: 'approved', subscription: 'active' },
        { payment: 'pending', subscription: 'past_due' },
        { payment: 'cancelled', subscription: 'cancelled' },
        { payment: 'rejected', subscription: 'cancelled' },
        { payment: 'unknown', subscription: 'inactive' },
        { payment: '', subscription: 'inactive' }
      ]

      statusMappings.forEach(({ payment, subscription }) => {
        const result = getSubscriptionStatusFromPayment(payment)
        expect(result).toBe(subscription)
      })
    })

    it('should handle edge cases in payment status mapping', () => {
      const edgeCases = [
        null,
        undefined,
        'APPROVED', // uppercase
        'Pending', // mixed case
        'failed',
        'processing',
        'refunded'
      ]

      edgeCases.forEach(status => {
        const result = getSubscriptionStatusFromPayment(status as string)
        expect(result).toBe('inactive') // Should default to inactive for unknown statuses
      })
    })
  })

  describe('External Reference Generation', () => {
    it('should generate consistent external references', () => {
      const testCases = [
        {
          tenantId: '12345678-1234-1234-1234-123456789012',
          plan: 'pro',
          expected: 'tenant_12345678-1234-1234-1234-123456789012_pro'
        },
        {
          tenantId: '87654321-4321-4321-4321-210987654321',
          plan: 'enterprise',
          expected: 'tenant_87654321-4321-4321-4321-210987654321_enterprise'
        }
      ]

      testCases.forEach(({ tenantId, plan, expected }) => {
        const request: CreateSubscriptionRequest = {
          tenant_id: tenantId,
          plan: plan as 'pro' | 'enterprise',
          payer_email: 'test@example.com'
        }
        const preference = createMercadoPagoPreference(request, 'https://test.supabase.co')
        expect(preference.external_reference).toBe(expected)
      })
    })

    it('should generate unique external references for different tenants', () => {
      const tenantIds = [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333'
      ]

      const externalRefs = tenantIds.map(tenantId => {
        const request: CreateSubscriptionRequest = {
          tenant_id: tenantId,
          plan: 'pro',
          payer_email: 'test@example.com'
        }
        const preference = createMercadoPagoPreference(request, 'https://test.supabase.co')
        return preference.external_reference
      })

      // All external references should be unique
      const uniqueRefs = new Set(externalRefs)
      expect(uniqueRefs.size).toBe(externalRefs.length)
    })
  })

  describe('Webhook Authentication', () => {
    it('should verify valid webhook signatures correctly', async () => {
      const payload = '{"id":"12345","type":"payment","data":{"id":"payment_123"}}'
      const secret = 'test_webhook_secret_key_12345'
      
      // Create a valid signature using the same algorithm
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      const isValid = await verifyWebhookSignature(payload, signature, secret)
      expect(isValid).toBe(true)
    })

    it('should reject invalid webhook signatures', async () => {
      const payload = '{"id":"12345","type":"payment"}'
      const secret = 'test_webhook_secret'
      const invalidSignature = 'invalid_signature_12345'
      
      const isValid = await verifyWebhookSignature(payload, invalidSignature, secret)
      expect(isValid).toBe(false)
    })

    it('should handle different signature formats', async () => {
      const payload = 'test payload'
      const secret = 'secret'
      
      // Test empty signature
      const emptyResult = await verifyWebhookSignature(payload, '', secret)
      expect(emptyResult).toBe(false)
      
      // Test malformed hex signature
      const malformedResult = await verifyWebhookSignature(payload, 'invalid_hex', secret)
      expect(malformedResult).toBe(false)
      
      // Test GitHub-style signature format
      const githubStyleResult = await verifyWebhookSignature(payload, 'sha256=invalid', secret)
      expect(githubStyleResult).toBe(false)
    })

    it('should handle signature verification errors gracefully', async () => {
      const payload = 'test'
      const secret = 'secret'
      
      // Test with invalid base64 signature
      const invalidBase64 = 'invalid_base64_signature!'
      const result = await verifyWebhookSignature(payload, invalidBase64, secret)
      expect(result).toBe(false)
    })
  })

  describe('Webhook Processing', () => {
    it('should process valid payment webhooks successfully', () => {
      const webhookData: WebhookPayload = {
        id: 'webhook_123',
        live_mode: true,
        type: 'payment',
        date_created: '2023-01-01T00:00:00Z',
        application_id: 'app_123',
        user_id: 'user_123',
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: { id: 'payment_123' }
      }

      const paymentResponse: PaymentResponse = {
        id: 'payment_123',
        status: 'approved',
        external_reference: 'tenant_12345678-1234-1234-1234-123456789012_pro',
        payer: {
          id: 'payer_123',
          email: 'test@example.com'
        }
      }

      const result = processWebhookPayment(webhookData, paymentResponse)
      
      expect(result.success).toBe(true)
      expect(result.subscriptionStatus).toBe('active')
      expect(result.error).toBeUndefined()
    })

    it('should handle webhook processing errors', () => {
      const invalidWebhookData: WebhookPayload = {
        id: 'webhook_123',
        live_mode: true,
        type: 'payment',
        date_created: '2023-01-01T00:00:00Z',
        application_id: 'app_123',
        user_id: 'user_123',
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: { id: '' } // Invalid empty ID
      }

      const paymentResponse: PaymentResponse = {
        id: 'payment_123',
        status: 'approved',
        external_reference: 'tenant_12345678-1234-1234-1234-123456789012_pro',
        payer: { id: 'payer_123' }
      }

      const result = processWebhookPayment(invalidWebhookData, paymentResponse)
      
      expect(result.success).toBe(false)
      expect(result.subscriptionStatus).toBe('inactive')
      expect(result.error).toBe('Invalid webhook data structure')
    })

    it('should handle invalid external references in webhooks', () => {
      const webhookData: WebhookPayload = {
        id: 'webhook_123',
        live_mode: true,
        type: 'payment',
        date_created: '2023-01-01T00:00:00Z',
        application_id: 'app_123',
        user_id: 'user_123',
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: { id: 'payment_123' }
      }

      const paymentResponse: PaymentResponse = {
        id: 'payment_123',
        status: 'approved',
        external_reference: 'invalid_reference_format',
        payer: { id: 'payer_123' }
      }

      const result = processWebhookPayment(webhookData, paymentResponse)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid or malformed external_reference')
    })

    it('should handle invalid payment data in webhooks', () => {
      const webhookData: WebhookPayload = {
        id: 'webhook_123',
        live_mode: true,
        type: 'payment',
        date_created: '2023-01-01T00:00:00Z',
        application_id: 'app_123',
        user_id: 'user_123',
        version: 1,
        api_version: 'v1',
        action: 'payment.updated',
        data: { id: 'payment_123' }
      }

      const paymentResponse: PaymentResponse = {
        id: '', // Invalid empty ID
        status: 'approved',
        external_reference: 'tenant_12345678-1234-1234-1234-123456789012_pro',
        payer: { id: '' } // Invalid empty payer ID
      }

      const result = processWebhookPayment(webhookData, paymentResponse)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to sanitize payment data')
    })
  })

  describe('External Reference Parsing', () => {
    it('should parse valid external references correctly', () => {
      const validReferences = [
        {
          ref: 'tenant_12345678-1234-1234-1234-123456789012_pro',
          expected: { tenantId: '12345678-1234-1234-1234-123456789012', plan: 'pro' }
        },
        {
          ref: 'tenant_87654321-4321-4321-4321-210987654321_enterprise',
          expected: { tenantId: '87654321-4321-4321-4321-210987654321', plan: 'enterprise' }
        }
      ]

      validReferences.forEach(({ ref, expected }) => {
        const result = parseExternalReference(ref)
        expect(result).toEqual(expected)
      })
    })

    it('should reject invalid external references', () => {
      const invalidReferences = [
        '',
        'invalid_format',
        'tenant_invalid-uuid_pro',
        'tenant_12345678-1234-1234-1234-123456789012_free',
        'tenant_12345678-1234-1234-1234-123456789012_invalid',
        'not_tenant_12345678-1234-1234-1234-123456789012_pro',
        null,
        undefined
      ]

      invalidReferences.forEach(ref => {
        const result = parseExternalReference(ref as string)
        expect(result).toBeNull()
      })
    })
  })

  describe('Payment Data Sanitization', () => {
    it('should sanitize valid payment data correctly', () => {
      const validPayment = {
        id: 'payment_123',
        status: 'approved',
        payer: {
          id: 'payer_123',
          email: 'test@example.com',
          identification: {
            type: 'CPF',
            number: '12345678901'
          }
        },
        external_reference: 'tenant_12345678-1234-1234-1234-123456789012_pro',
        transaction_amount: 29.90,
        installments: 1
      }

      const result = sanitizePaymentData(validPayment)
      
      expect(result).toEqual({
        payerId: 'payer_123',
        subscriptionId: 'payment_123'
      })
    })

    it('should reject invalid payment data', () => {
      const invalidPayments = [
        { id: '', payer: { id: 'payer_123' } }, // Empty subscription ID
        { id: 'payment_123', payer: { id: '' } }, // Empty payer ID
        { id: 'payment_123', payer: {} }, // Missing payer ID
        { payer: { id: 'payer_123' } }, // Missing subscription ID
        { id: 'payment@123', payer: { id: 'payer_123' } }, // Invalid characters
        { id: 'payment_123', payer: { id: 'payer@123' } }, // Invalid characters
        null,
        undefined,
        {}
      ]

      invalidPayments.forEach(payment => {
        const result = sanitizePaymentData(payment)
        expect(result).toBeNull()
      })
    })
  })

  describe('Plan Configuration', () => {
    it('should have correct plan configurations', () => {
      expect(PLAN_CONFIG.pro).toEqual({
        title: 'Plano Pro - Agendai',
        price: 29.90,
        features: ['WhatsApp notifications', 'Payment processing', 'Advanced analytics']
      })

      expect(PLAN_CONFIG.enterprise).toEqual({
        title: 'Plano Enterprise - Agendai',
        price: 99.90,
        features: ['All Pro features', 'Custom branding', 'Priority support', 'API access']
      })
    })

    it('should have enterprise plan priced higher than pro plan', () => {
      expect(PLAN_CONFIG.enterprise.price).toBeGreaterThan(PLAN_CONFIG.pro.price)
    })

    it('should have all plans with positive prices', () => {
      Object.values(PLAN_CONFIG).forEach(plan => {
        expect(plan.price).toBeGreaterThan(0)
      })
    })
  })
})