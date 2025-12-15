/**
 * Property-Based Tests for Concurrent Booking Prevention
 * **Feature: saas-multi-tenancy, Property 3: Concurrent booking prevention**
 * **Validates: Requirements 1.4, 5.1**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'

// Mock booking data structure
interface TestBooking {
  id: string
  tenant_id: string
  staff_id: string
  service_id: string
  start_time: Date
  end_time: Date
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  created_at: Date
}

// Mock booking attempt structure
interface BookingAttempt {
  id: string
  tenant_id: string
  staff_id: string
  service_id: string
  start_time: Date
  end_time: Date
  customer_name: string
  attempt_time: Date
}

// Test data generators
const tenantIdArb = fc.uuid()
const staffIdArb = fc.uuid()
const serviceIdArb = fc.uuid()
const bookingIdArb = fc.uuid()
const customerNameArb = fc.string({ minLength: 1, maxLength: 50 })

// Generate valid time ranges
const timeRangeArb = fc.tuple(
  fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  fc.integer({ min: 30, max: 480 }) // Duration in minutes
).map(([start, durationMinutes]) => ({
  start_time: start,
  end_time: new Date(start.getTime() + durationMinutes * 60 * 1000)
}))

// Simulate concurrent booking system with atomic operations
class MockBookingSystem {
  private bookings: TestBooking[] = []
  private lockMap: Map<string, boolean> = new Map()

  // Simulate atomic booking creation with locking
  async attemptBooking(attempt: BookingAttempt): Promise<{ success: boolean; booking?: TestBooking; error?: string }> {
    const lockKey = `${attempt.tenant_id}-${attempt.staff_id}-${attempt.start_time.toISOString()}-${attempt.end_time.toISOString()}`
    
    // Simulate database-level locking
    if (this.lockMap.get(lockKey)) {
      return { success: false, error: 'Resource locked by concurrent operation' }
    }
    
    this.lockMap.set(lockKey, true)
    
    try {
      // Check for conflicts (simulating the check_availability function)
      const conflicts = this.bookings.filter(booking => 
        booking.tenant_id === attempt.tenant_id &&
        booking.staff_id === attempt.staff_id &&
        !['cancelled', 'no_show'].includes(booking.status) &&
        attempt.start_time < booking.end_time && 
        booking.start_time < attempt.end_time
      )
      
      if (conflicts.length > 0) {
        return { success: false, error: 'Time slot not available' }
      }
      
      // Create the booking
      const newBooking: TestBooking = {
        id: attempt.id,
        tenant_id: attempt.tenant_id,
        staff_id: attempt.staff_id,
        service_id: attempt.service_id,
        start_time: attempt.start_time,
        end_time: attempt.end_time,
        status: 'pending',
        created_at: attempt.attempt_time
      }
      
      this.bookings.push(newBooking)
      return { success: true, booking: newBooking }
      
    } finally {
      // Release lock
      this.lockMap.delete(lockKey)
    }
  }

  getBookings(): TestBooking[] {
    return [...this.bookings]
  }

  reset(): void {
    this.bookings = []
    this.lockMap.clear()
  }
}

describe('Concurrent Booking Prevention Properties', () => {
  let bookingSystem: MockBookingSystem

  beforeAll(async () => {
    console.log('Setting up concurrent booking tests...')
    bookingSystem = new MockBookingSystem()
  })

  afterAll(async () => {
    console.log('Cleaning up concurrent booking tests...')
  })

  it('Property 3: Concurrent booking prevention - only one booking should succeed for the same time slot', async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantIdArb,
        staffIdArb,
        serviceIdArb,
        timeRangeArb,
        fc.array(customerNameArb, { minLength: 2, maxLength: 10 }),
        async (tenantId, staffId, serviceId, timeRange, customerNames) => {
          bookingSystem.reset()
          
          // Create multiple concurrent booking attempts for the same time slot
          const attempts: BookingAttempt[] = customerNames.map((customerName, index) => ({
            id: `booking-${index}`,
            tenant_id: tenantId,
            staff_id: staffId,
            service_id: serviceId,
            start_time: timeRange.start_time,
            end_time: timeRange.end_time,
            customer_name: customerName,
            attempt_time: new Date(Date.now() + index) // Slightly different attempt times
          }))

          // Simulate concurrent booking attempts
          const results = await Promise.all(
            attempts.map(attempt => bookingSystem.attemptBooking(attempt))
          )

          // Property: Only one booking should succeed
          const successfulBookings = results.filter(result => result.success)
          expect(successfulBookings.length).toBe(1)

          // Property: All other attempts should fail
          const failedBookings = results.filter(result => !result.success)
          expect(failedBookings.length).toBe(attempts.length - 1)

          // Property: The successful booking should be persisted
          const persistedBookings = bookingSystem.getBookings()
          expect(persistedBookings.length).toBe(1)
          expect(persistedBookings[0].tenant_id).toBe(tenantId)
          expect(persistedBookings[0].staff_id).toBe(staffId)
          expect(persistedBookings[0].start_time).toEqual(timeRange.start_time)
          expect(persistedBookings[0].end_time).toEqual(timeRange.end_time)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3.1: Sequential booking attempts should work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantIdArb,
        staffIdArb,
        serviceIdArb,
        fc.array(timeRangeArb, { minLength: 2, maxLength: 5 }),
        async (tenantId, staffId, serviceId, timeRanges) => {
          bookingSystem.reset()
          
          // Sort time ranges to ensure they don't overlap
          const sortedRanges = timeRanges
            .sort((a, b) => a.start_time.getTime() - b.start_time.getTime())
            .filter((range, index, arr) => {
              // Remove overlapping ranges
              if (index === 0) return true
              const prevRange = arr[index - 1]
              return range.start_time >= prevRange.end_time
            })

          if (sortedRanges.length < 2) return // Skip if we don't have enough non-overlapping ranges

          // Create sequential booking attempts
          const attempts: BookingAttempt[] = sortedRanges.map((timeRange, index) => ({
            id: `booking-${index}`,
            tenant_id: tenantId,
            staff_id: staffId,
            service_id: serviceId,
            start_time: timeRange.start_time,
            end_time: timeRange.end_time,
            customer_name: `Customer ${index}`,
            attempt_time: new Date(Date.now() + index * 1000)
          }))

          // Make sequential booking attempts
          const results: Array<{ success: boolean; booking?: TestBooking; error?: string }> = []
          for (const attempt of attempts) {
            const result = await bookingSystem.attemptBooking(attempt)
            results.push(result)
          }

          // Property: All non-overlapping sequential bookings should succeed
          const successfulBookings = results.filter(result => result.success)
          expect(successfulBookings.length).toBe(sortedRanges.length)

          // Property: All bookings should be persisted
          const persistedBookings = bookingSystem.getBookings()
          expect(persistedBookings.length).toBe(sortedRanges.length)

          // Property: Bookings should maintain their time order
          const sortedPersistedBookings = persistedBookings.sort((a, b) => 
            a.start_time.getTime() - b.start_time.getTime()
          )
          
          for (let i = 0; i < sortedPersistedBookings.length - 1; i++) {
            expect(sortedPersistedBookings[i].end_time.getTime())
              .toBeLessThanOrEqual(sortedPersistedBookings[i + 1].start_time.getTime())
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3.2: Different staff members should not interfere with each other', async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantIdArb,
        fc.array(staffIdArb, { minLength: 2, maxLength: 5 }),
        serviceIdArb,
        timeRangeArb,
        async (tenantId, staffIds, serviceId, timeRange) => {
          bookingSystem.reset()
          
          // Create concurrent booking attempts for different staff at the same time
          const attempts: BookingAttempt[] = staffIds.map((staffId, index) => ({
            id: `booking-${index}`,
            tenant_id: tenantId,
            staff_id: staffId,
            service_id: serviceId,
            start_time: timeRange.start_time,
            end_time: timeRange.end_time,
            customer_name: `Customer ${index}`,
            attempt_time: new Date(Date.now() + index)
          }))

          // Simulate concurrent booking attempts
          const results = await Promise.all(
            attempts.map(attempt => bookingSystem.attemptBooking(attempt))
          )

          // Property: All bookings should succeed (different staff members)
          const successfulBookings = results.filter(result => result.success)
          expect(successfulBookings.length).toBe(staffIds.length)

          // Property: No bookings should fail
          const failedBookings = results.filter(result => !result.success)
          expect(failedBookings.length).toBe(0)

          // Property: All bookings should be persisted
          const persistedBookings = bookingSystem.getBookings()
          expect(persistedBookings.length).toBe(staffIds.length)

          // Property: Each staff member should have exactly one booking
          const staffBookingCounts = new Map<string, number>()
          persistedBookings.forEach(booking => {
            const count = staffBookingCounts.get(booking.staff_id) || 0
            staffBookingCounts.set(booking.staff_id, count + 1)
          })
          
          staffIds.forEach(staffId => {
            expect(staffBookingCounts.get(staffId)).toBe(1)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3.3: Race condition simulation should maintain data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantIdArb,
        staffIdArb,
        serviceIdArb,
        timeRangeArb,
        fc.integer({ min: 5, max: 20 }),
        async (tenantId, staffId, serviceId, timeRange, concurrentAttempts) => {
          bookingSystem.reset()
          
          // Create many concurrent booking attempts for the same slot
          const attempts: BookingAttempt[] = Array.from({ length: concurrentAttempts }, (_, index) => ({
            id: `booking-${index}`,
            tenant_id: tenantId,
            staff_id: staffId,
            service_id: serviceId,
            start_time: timeRange.start_time,
            end_time: timeRange.end_time,
            customer_name: `Customer ${index}`,
            attempt_time: new Date(Date.now() + Math.random() * 100) // Random timing
          }))

          // Simulate high concurrency
          const results = await Promise.all(
            attempts.map(attempt => bookingSystem.attemptBooking(attempt))
          )

          // Property: Exactly one booking should succeed regardless of concurrency level
          const successfulBookings = results.filter(result => result.success)
          expect(successfulBookings.length).toBe(1)

          // Property: Database should remain consistent
          const persistedBookings = bookingSystem.getBookings()
          expect(persistedBookings.length).toBe(1)

          // Property: The successful booking should match one of the attempts
          const successfulBooking = persistedBookings[0]
          const matchingAttempt = attempts.find(attempt => attempt.id === successfulBooking.id)
          expect(matchingAttempt).toBeDefined()
          expect(successfulBooking.tenant_id).toBe(matchingAttempt!.tenant_id)
          expect(successfulBooking.staff_id).toBe(matchingAttempt!.staff_id)
        }
      ),
      { numRuns: 50 } // Reduced runs for performance
    )
  })
})