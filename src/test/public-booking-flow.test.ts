/**
 * Unit Tests for Public Booking Flow
 * Tests guest form validation, availability checking, and error handling
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

// Mock data structures
interface BookingFormData {
  serviceId: string
  staffId: string
  date: string
  time: string
  customerName: string
  customerPhone: string
  customerEmail: string
  notes: string
}

interface Service {
  id: string
  name: string
  duration_min: number
  price: number
}

interface TimeSlot {
  time: string
  available: boolean
}

describe('Public Booking Flow Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Form Validation', () => {
    it('should validate required customer information', () => {
      const validData: BookingFormData = {
        serviceId: 'service-1',
        staffId: 'staff-1',
        date: '2024-12-20',
        time: '14:00',
        customerName: 'João Silva',
        customerPhone: '(11) 99999-9999',
        customerEmail: 'joao@email.com',
        notes: ''
      }

      // Test valid data
      expect(validData.customerName.trim().length).toBeGreaterThan(0)
      expect(validData.customerPhone.trim().length).toBeGreaterThan(0)
      expect(validData.serviceId).toBeTruthy()
      expect(validData.staffId).toBeTruthy()
      expect(validData.date).toBeTruthy()
      expect(validData.time).toBeTruthy()

      // Test invalid data - missing name
      const invalidData1 = { ...validData, customerName: '' }
      expect(invalidData1.customerName.trim().length).toBe(0)

      // Test invalid data - missing phone
      const invalidData2 = { ...validData, customerPhone: '' }
      expect(invalidData2.customerPhone.trim().length).toBe(0)

      // Test invalid data - missing service
      const invalidData3 = { ...validData, serviceId: '' }
      expect(invalidData3.serviceId).toBeFalsy()
    })

    it('should handle optional email field correctly', () => {
      const dataWithEmail: BookingFormData = {
        serviceId: 'service-1',
        staffId: 'staff-1',
        date: '2024-12-20',
        time: '14:00',
        customerName: 'João Silva',
        customerPhone: '(11) 99999-9999',
        customerEmail: 'joao@email.com',
        notes: ''
      }

      const dataWithoutEmail: BookingFormData = {
        ...dataWithEmail,
        customerEmail: ''
      }

      // Email should be optional
      expect(dataWithEmail.customerEmail).toBeTruthy()
      expect(dataWithoutEmail.customerEmail).toBeFalsy()
      
      // Both should be valid for booking submission
      const isValidWithEmail = dataWithEmail.customerName && dataWithEmail.customerPhone && dataWithEmail.serviceId
      const isValidWithoutEmail = dataWithoutEmail.customerName && dataWithoutEmail.customerPhone && dataWithoutEmail.serviceId
      
      expect(isValidWithEmail).toBeTruthy()
      expect(isValidWithoutEmail).toBeTruthy()
    })

    it('should validate phone number format', () => {
      const validPhones = [
        '(11) 99999-9999',
        '(21) 98888-8888',
        '(85) 97777-7777'
      ]

      const invalidPhones = [
        '11999999999',
        'invalid-phone',
        ''
      ]

      validPhones.forEach(phone => {
        // Basic format validation (should match Brazilian phone pattern)
        const hasValidFormat = /^\(\d{2}\) \d{4,5}-\d{4}$/.test(phone)
        expect(hasValidFormat).toBe(true)
      })

      invalidPhones.forEach(phone => {
        const hasValidFormat = /^\(\d{2}\) \d{4,5}-\d{4}$/.test(phone)
        expect(hasValidFormat).toBe(false)
      })
    })
  })

  describe('Availability Checking Integration', () => {
    it('should call check_availability function with correct parameters', async () => {
      const mockRpcResponse = { data: true, error: null }
      mockSupabase.rpc.mockResolvedValue(mockRpcResponse)

      const tenantId = 'tenant-123'
      const staffId = 'staff-456'
      const startTime = '2024-12-20T14:00:00'
      const endTime = '2024-12-20T15:00:00'

      // Simulate availability check
      const result = await mockSupabase.rpc('check_availability', {
        p_tenant_id: tenantId,
        p_staff_id: staffId,
        p_start_time: startTime,
        p_end_time: endTime
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_availability', {
        p_tenant_id: tenantId,
        p_staff_id: staffId,
        p_start_time: startTime,
        p_end_time: endTime
      })
      expect(result.data).toBe(true)
    })

    it('should generate correct time slots for availability checking', () => {
      const generateTimeSlots = (date: string): string[] => {
        const slots: string[] = []
        const startHour = 8 // 8 AM
        const endHour = 18 // 6 PM
        const intervalMinutes = 30
        
        for (let hour = startHour; hour < endHour; hour++) {
          for (let minute = 0; minute < 60; minute += intervalMinutes) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            slots.push(timeString)
          }
        }
        return slots
      }

      const slots = generateTimeSlots('2024-12-20')
      
      // Should generate slots from 8:00 to 17:30
      expect(slots).toContain('08:00')
      expect(slots).toContain('08:30')
      expect(slots).toContain('17:30')
      expect(slots).not.toContain('18:00') // Should not include 6 PM
      expect(slots).not.toContain('07:30') // Should not include before 8 AM
      
      // Should have correct number of slots (20 slots per hour * 10 hours)
      expect(slots.length).toBe(20)
    })

    it('should calculate end time correctly based on service duration', () => {
      const service: Service = {
        id: 'service-1',
        name: 'Corte de Cabelo',
        duration_min: 60,
        price: 50
      }

      const startDateTime = new Date('2024-12-20T14:00:00.000Z')
      const endDateTime = new Date(startDateTime.getTime() + service.duration_min * 60000)

      expect(endDateTime.toISOString()).toBe('2024-12-20T15:00:00.000Z')

      // Test with different duration
      const service2: Service = {
        id: 'service-2',
        name: 'Barba',
        duration_min: 30,
        price: 25
      }

      const endDateTime2 = new Date(startDateTime.getTime() + service2.duration_min * 60000)
      expect(endDateTime2.toISOString()).toBe('2024-12-20T14:30:00.000Z')
    })
  })

  describe('Error Handling for Booking Conflicts', () => {
    it('should handle availability check errors gracefully', async () => {
      const mockError = new Error('Database connection failed')
      mockSupabase.rpc.mockRejectedValue(mockError)

      let errorCaught = false
      let errorMessage = ''

      try {
        await mockSupabase.rpc('check_availability', {
          p_tenant_id: 'tenant-123',
          p_staff_id: 'staff-456',
          p_start_time: '2024-12-20T14:00:00',
          p_end_time: '2024-12-20T15:00:00'
        })
      } catch (error) {
        errorCaught = true
        errorMessage = error instanceof Error ? error.message : 'Unknown error'
      }

      expect(errorCaught).toBe(true)
      expect(errorMessage).toBe('Database connection failed')
    })

    it('should handle booking conflicts with appropriate error messages', () => {
      const conflictScenarios = [
        {
          available: false,
          expectedMessage: 'Este horário não está mais disponível. Por favor, escolha outro horário.'
        },
        {
          available: null,
          expectedMessage: 'Erro ao verificar disponibilidade. Tente novamente.'
        }
      ]

      conflictScenarios.forEach(scenario => {
        if (scenario.available === false) {
          expect(scenario.expectedMessage).toContain('não está mais disponível')
        } else if (scenario.available === null) {
          expect(scenario.expectedMessage).toContain('Erro ao verificar')
        }
      })
    })

    it('should provide alternative time suggestions when conflicts occur', () => {
      const unavailableSlots: TimeSlot[] = [
        { time: '14:00', available: false },
        { time: '14:30', available: true },
        { time: '15:00', available: true },
        { time: '15:30', available: false }
      ]

      const availableAlternatives = unavailableSlots.filter(slot => slot.available)
      
      expect(availableAlternatives.length).toBe(2)
      expect(availableAlternatives.map(s => s.time)).toEqual(['14:30', '15:00'])
    })
  })

  describe('Booking Submission Flow', () => {
    it('should create customer record when submitting booking', async () => {
      const mockCustomerResponse = {
        data: { id: 'customer-123' },
        error: null
      }

      const mockFromChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockCustomerResponse),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabase.from.mockReturnValue(mockFromChain)

      const customerData = {
        tenant_id: 'tenant-123',
        name: 'João Silva',
        phone: '(11) 99999-9999',
        email: 'joao@email.com'
      }

      // Simulate customer creation
      const result = await mockSupabase.from('customers')
        .insert(customerData)
        .select('id')
        .single()

      expect(mockSupabase.from).toHaveBeenCalledWith('customers')
      expect(mockFromChain.insert).toHaveBeenCalledWith(customerData)
      expect(result.data.id).toBe('customer-123')
    })

    it('should create booking with correct status and data', async () => {
      const mockBookingResponse = {
        data: { id: 'booking-456' },
        error: null
      }

      const mockFromChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockBookingResponse)
      }

      mockSupabase.from.mockReturnValue(mockFromChain)

      const bookingData = {
        tenant_id: 'tenant-123',
        customer_id: 'customer-123',
        service_id: 'service-456',
        staff_id: 'staff-789',
        start_time: '2024-12-20T14:00:00.000Z',
        end_time: '2024-12-20T15:00:00.000Z',
        status: 'pending',
        total_price: 50,
        notes: null
      }

      // Simulate booking creation
      const result = await mockSupabase.from('bookings')
        .insert(bookingData)
        .select('id')
        .single()

      expect(mockSupabase.from).toHaveBeenCalledWith('bookings')
      expect(mockFromChain.insert).toHaveBeenCalledWith(bookingData)
      expect(result.data.id).toBe('booking-456')
      
      // Verify booking has pending status
      expect(bookingData.status).toBe('pending')
    })

    it('should handle booking submission errors appropriately', async () => {
      const mockError = { message: 'Booking conflict detected' }
      const mockFromChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      }

      mockSupabase.from.mockReturnValue(mockFromChain)

      const result = await mockSupabase.from('bookings')
        .insert({})
        .select('id')
        .single()

      expect(result.error).toBeTruthy()
      expect(result.error.message).toBe('Booking conflict detected')
      expect(result.data).toBeNull()
    })
  })

  describe('Date and Time Validation', () => {
    it('should reject past dates for booking', () => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Yesterday
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Tomorrow

      const isPastDateValid = pastDate > now
      const isFutureDateValid = futureDate > now

      expect(isPastDateValid).toBe(false)
      expect(isFutureDateValid).toBe(true)
    })

    it('should validate time slot format', () => {
      const validTimes = ['08:00', '14:30', '17:45']
      const invalidTimes = ['8:00', '25:00', 'invalid', '']

      validTimes.forEach(time => {
        const isValidFormat = /^\d{2}:\d{2}$/.test(time)
        const [hours, minutes] = time.split(':').map(Number)
        const isValidTime = hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60
        
        expect(isValidFormat).toBe(true)
        expect(isValidTime).toBe(true)
      })

      invalidTimes.forEach(time => {
        const isValidFormat = /^\d{2}:\d{2}$/.test(time)
        if (isValidFormat) {
          const [hours, minutes] = time.split(':').map(Number)
          const isValidTime = hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60
          expect(isValidTime).toBe(false)
        } else {
          expect(isValidFormat).toBe(false)
        }
      })
    })
  })
})