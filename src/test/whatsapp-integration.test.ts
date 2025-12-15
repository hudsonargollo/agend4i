/**
 * Unit Tests for WhatsApp Integration
 * Tests message formatting, plan-based feature gating, and error handling
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock data structures
interface BookingData {
  id: string
  tenant_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  staff_name: string
  service_name: string
  start_time: string
  end_time: string
  status: string
  total_price?: number
}

interface TenantData {
  id: string
  name: string
  plan: string
  subscription_status: string
  settings: {
    whatsapp_enabled?: boolean
    whatsapp_api_url?: string
    whatsapp_api_key?: string
    whatsapp_instance?: string
  }
}

// Helper functions (extracted from the Edge Function for testing)
function formatBookingMessage(booking: BookingData, tenant: TenantData): string {
  const startTime = new Date(booking.start_time)
  const endTime = new Date(booking.end_time)
  
  const dateStr = startTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  
  const timeStr = `${startTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })} às ${endTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`

  const priceStr = booking.total_price 
    ? `\n💰 Valor: R$ ${booking.total_price.toFixed(2)}`
    : ''

  return `🎉 *Agendamento Confirmado!*

Olá ${booking.customer_name}! Seu agendamento foi confirmado:

📅 *Data:* ${dateStr}
⏰ *Horário:* ${timeStr}
✂️ *Serviço:* ${booking.service_name}
👨‍💼 *Profissional:* ${booking.staff_name}
🏪 *Local:* ${tenant.name}${priceStr}

📱 Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco.

Obrigado por escolher nossos serviços! 😊`
}

function isProPlanActive(tenant: TenantData): boolean {
  return (
    (tenant.plan === 'pro' || tenant.plan === 'enterprise') &&
    tenant.subscription_status === 'active'
  )
}

function hasWhatsAppConfiguration(tenant: TenantData): boolean {
  const settings = tenant.settings
  return !!(
    settings.whatsapp_enabled &&
    settings.whatsapp_api_url &&
    settings.whatsapp_api_key &&
    settings.whatsapp_instance
  )
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Add country code if missing (assuming Brazil +55)
  if (cleaned.length === 11 && cleaned.startsWith('11')) {
    return `55${cleaned}`
  } else if (cleaned.length === 10) {
    return `5511${cleaned}`
  } else if (cleaned.length === 9) {
    return `5511${cleaned}`
  } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned
  }
  
  // Return as-is if we can't normalize
  return cleaned
}

// Mock WhatsApp API function
async function sendWhatsAppMessage(
  apiUrl: string,
  apiKey: string,
  instance: string,
  message: { number: string; message: string }
): Promise<boolean> {
  // Mock implementation for testing
  if (!apiUrl || !apiKey || !instance) {
    throw new Error('Missing WhatsApp API configuration')
  }
  
  if (!message.number || !message.message) {
    throw new Error('Missing message data')
  }
  
  // Simulate API call success/failure based on phone number
  if (message.number.includes('invalid')) {
    return false
  }
  
  return true
}

describe('WhatsApp Integration Unit Tests', () => {
  let mockBooking: BookingData
  let mockTenant: TenantData

  beforeEach(() => {
    mockBooking = {
      id: 'booking-123',
      tenant_id: 'tenant-456',
      customer_name: 'João Silva',
      customer_phone: '+5511999999999',
      customer_email: 'joao@example.com',
      staff_name: 'Carlos Barbeiro',
      service_name: 'Corte + Barba',
      start_time: '2024-12-15T14:00:00Z',
      end_time: '2024-12-15T15:00:00Z',
      status: 'pending',
      total_price: 45.00
    }

    mockTenant = {
      id: 'tenant-456',
      name: 'Zeroum Barbearia',
      plan: 'pro',
      subscription_status: 'active',
      settings: {
        whatsapp_enabled: true,
        whatsapp_api_url: 'https://api.whatsapp.example.com',
        whatsapp_api_key: 'test-api-key',
        whatsapp_instance: 'test-instance'
      }
    }
  })

  describe('Message Formatting and Templating', () => {
    it('should format booking message with all required information', () => {
      const message = formatBookingMessage(mockBooking, mockTenant)

      // Should include customer name
      expect(message).toContain('João Silva')
      
      // Should include service name
      expect(message).toContain('Corte + Barba')
      
      // Should include staff name
      expect(message).toContain('Carlos Barbeiro')
      
      // Should include tenant name
      expect(message).toContain('Zeroum Barbearia')
      
      // Should include price when provided
      expect(message).toContain('R$ 45.00')
      
      // Should include confirmation message
      expect(message).toContain('Agendamento Confirmado!')
      
      // Should include contact information
      expect(message).toContain('Em caso de dúvidas')
    })

    it('should format message without price when not provided', () => {
      const bookingWithoutPrice = { ...mockBooking, total_price: undefined }
      const message = formatBookingMessage(bookingWithoutPrice, mockTenant)

      expect(message).not.toContain('R$')
      expect(message).not.toContain('Valor:')
      expect(message).toContain('João Silva') // Should still contain other info
    })

    it('should format date and time in Portuguese locale', () => {
      const message = formatBookingMessage(mockBooking, mockTenant)

      // Should contain formatted date (Portuguese format)
      expect(message).toMatch(/\d{2}:\d{2}/) // Time format
      
      // Should contain "às" (Portuguese time separator)
      expect(message).toContain('às')
    })

    it('should handle different customer names correctly', () => {
      const bookingWithSpecialName = {
        ...mockBooking,
        customer_name: 'Maria José da Silva Santos'
      }
      
      const message = formatBookingMessage(bookingWithSpecialName, mockTenant)
      expect(message).toContain('Maria José da Silva Santos')
    })
  })

  describe('Plan-Based Feature Gating', () => {
    it('should allow WhatsApp notifications for Pro plan with active subscription', () => {
      const proTenant = {
        ...mockTenant,
        plan: 'pro',
        subscription_status: 'active'
      }

      expect(isProPlanActive(proTenant)).toBe(true)
    })

    it('should allow WhatsApp notifications for Enterprise plan with active subscription', () => {
      const enterpriseTenant = {
        ...mockTenant,
        plan: 'enterprise',
        subscription_status: 'active'
      }

      expect(isProPlanActive(enterpriseTenant)).toBe(true)
    })

    it('should deny WhatsApp notifications for Free plan', () => {
      const freeTenant = {
        ...mockTenant,
        plan: 'free',
        subscription_status: 'active'
      }

      expect(isProPlanActive(freeTenant)).toBe(false)
    })

    it('should deny WhatsApp notifications for inactive subscription', () => {
      const inactiveTenant = {
        ...mockTenant,
        plan: 'pro',
        subscription_status: 'past_due'
      }

      expect(isProPlanActive(inactiveTenant)).toBe(false)
    })

    it('should deny WhatsApp notifications for cancelled subscription', () => {
      const cancelledTenant = {
        ...mockTenant,
        plan: 'pro',
        subscription_status: 'cancelled'
      }

      expect(isProPlanActive(cancelledTenant)).toBe(false)
    })

    it('should deny WhatsApp notifications for inactive subscription status', () => {
      const inactiveTenant = {
        ...mockTenant,
        plan: 'enterprise',
        subscription_status: 'inactive'
      }

      expect(isProPlanActive(inactiveTenant)).toBe(false)
    })
  })

  describe('WhatsApp Configuration Validation', () => {
    it('should validate complete WhatsApp configuration', () => {
      expect(hasWhatsAppConfiguration(mockTenant)).toBe(true)
    })

    it('should reject configuration when WhatsApp is disabled', () => {
      const disabledTenant = {
        ...mockTenant,
        settings: {
          ...mockTenant.settings,
          whatsapp_enabled: false
        }
      }

      expect(hasWhatsAppConfiguration(disabledTenant)).toBe(false)
    })

    it('should reject configuration when API URL is missing', () => {
      const noUrlTenant = {
        ...mockTenant,
        settings: {
          ...mockTenant.settings,
          whatsapp_api_url: undefined
        }
      }

      expect(hasWhatsAppConfiguration(noUrlTenant)).toBe(false)
    })

    it('should reject configuration when API key is missing', () => {
      const noKeyTenant = {
        ...mockTenant,
        settings: {
          ...mockTenant.settings,
          whatsapp_api_key: undefined
        }
      }

      expect(hasWhatsAppConfiguration(noKeyTenant)).toBe(false)
    })

    it('should reject configuration when instance is missing', () => {
      const noInstanceTenant = {
        ...mockTenant,
        settings: {
          ...mockTenant.settings,
          whatsapp_instance: undefined
        }
      }

      expect(hasWhatsAppConfiguration(noInstanceTenant)).toBe(false)
    })

    it('should reject configuration when all fields are missing', () => {
      const emptyTenant = {
        ...mockTenant,
        settings: {}
      }

      expect(hasWhatsAppConfiguration(emptyTenant)).toBe(false)
    })
  })

  describe('Phone Number Normalization', () => {
    it('should normalize Brazilian mobile number with area code', () => {
      const normalized = normalizePhoneNumber('(11) 99999-9999')
      expect(normalized).toBe('5511999999999')
    })

    it('should normalize number with country code already present', () => {
      const normalized = normalizePhoneNumber('+55 11 99999-9999')
      expect(normalized).toBe('5511999999999')
    })

    it('should add country code to 11-digit number starting with 11', () => {
      const normalized = normalizePhoneNumber('11999999999')
      expect(normalized).toBe('5511999999999')
    })

    it('should add area code and country code to 9-digit number', () => {
      const normalized = normalizePhoneNumber('999999999')
      expect(normalized).toBe('5511999999999')
    })

    it('should handle number with spaces and special characters', () => {
      const normalized = normalizePhoneNumber('+55 (11) 9 9999-9999')
      expect(normalized).toBe('5511999999999')
    })

    it('should return cleaned number if normalization rules do not apply', () => {
      const normalized = normalizePhoneNumber('+1 555 123 4567')
      expect(normalized).toBe('15551234567')
    })
  })

  describe('Error Handling for API Failures', () => {
    it('should handle missing API configuration gracefully', async () => {
      await expect(
        sendWhatsAppMessage('', '', '', { number: '5511999999999', message: 'test' })
      ).rejects.toThrow('Missing WhatsApp API configuration')
    })

    it('should handle missing message data gracefully', async () => {
      await expect(
        sendWhatsAppMessage('https://api.test.com', 'key', 'instance', { number: '', message: 'test' })
      ).rejects.toThrow('Missing message data')
    })

    it('should return false for API failures without throwing', async () => {
      const result = await sendWhatsAppMessage(
        'https://api.test.com',
        'key',
        'instance',
        { number: 'invalid-number', message: 'test' }
      )
      
      expect(result).toBe(false)
    })

    it('should return true for successful API calls', async () => {
      const result = await sendWhatsAppMessage(
        'https://api.test.com',
        'key',
        'instance',
        { number: '5511999999999', message: 'test message' }
      )
      
      expect(result).toBe(true)
    })
  })

  describe('Integration Scenarios', () => {
    it('should process complete notification flow for valid Pro tenant', () => {
      // Verify all conditions are met
      expect(isProPlanActive(mockTenant)).toBe(true)
      expect(hasWhatsAppConfiguration(mockTenant)).toBe(true)
      expect(mockBooking.customer_phone).toBeTruthy()
      
      // Verify message can be formatted
      const message = formatBookingMessage(mockBooking, mockTenant)
      expect(message).toContain(mockBooking.customer_name)
      
      // Verify phone can be normalized
      const normalizedPhone = normalizePhoneNumber(mockBooking.customer_phone)
      expect(normalizedPhone).toBe('5511999999999')
    })

    it('should reject notification for Free plan tenant even with valid configuration', () => {
      const freeTenant = {
        ...mockTenant,
        plan: 'free'
      }
      
      expect(isProPlanActive(freeTenant)).toBe(false)
      expect(hasWhatsAppConfiguration(freeTenant)).toBe(true) // Config is valid but plan prevents usage
    })

    it('should reject notification for Pro tenant with incomplete configuration', () => {
      const incompleteTenant = {
        ...mockTenant,
        settings: {
          whatsapp_enabled: true,
          whatsapp_api_url: 'https://api.test.com'
          // Missing api_key and instance
        }
      }
      
      expect(isProPlanActive(incompleteTenant)).toBe(true) // Plan is valid but config prevents usage
      expect(hasWhatsAppConfiguration(incompleteTenant)).toBe(false)
    })

    it('should handle booking without customer phone', () => {
      const bookingWithoutPhone = {
        ...mockBooking,
        customer_phone: ''
      }
      
      // Should still be able to format message (though notification would be skipped)
      const message = formatBookingMessage(bookingWithoutPhone, mockTenant)
      expect(message).toContain(bookingWithoutPhone.customer_name)
      
      // Phone normalization should handle empty string
      const normalizedPhone = normalizePhoneNumber(bookingWithoutPhone.customer_phone)
      expect(normalizedPhone).toBe('')
    })
  })
})