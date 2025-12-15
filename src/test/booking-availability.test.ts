/**
 * Property-Based Tests for Booking Availability Validation
 * **Feature: saas-multi-tenancy, Property 2: Booking availability validation**
 * **Validates: Requirements 1.2, 5.4, 5.5**
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
}

// Test data generators
const tenantIdArb = fc.uuid()
const staffIdArb = fc.uuid()
const serviceIdArb = fc.uuid()
const bookingIdArb = fc.uuid()

// Generate valid time ranges (end_time > start_time)
const timeRangeArb = fc.tuple(
  fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  fc.integer({ min: 30, max: 480 }) // Duration in minutes (30min to 8 hours)
).map(([start, durationMinutes]) => ({
  start_time: start,
  end_time: new Date(start.getTime() + durationMinutes * 60 * 1000)
}))

const bookingStatusArb = fc.constantFrom('pending', 'confirmed', 'cancelled', 'completed', 'no_show')

// Availability checking function (mock implementation)
function checkAvailability(
  tenantId: string,
  staffId: string,
  startTime: Date,
  endTime: Date,
  existingBookings: TestBooking[],
  excludeBookingId?: string
): boolean {
  // Validate input parameters
  if (!tenantId || !staffId || !startTime || !endTime) {
    return false
  }
  
  // Validate time range
  if (startTime >= endTime) {
    return false
  }
  
  // Check for conflicting bookings
  const conflicts = existingBookings.filter(booking => 
    booking.tenant_id === tenantId &&
    booking.staff_id === staffId &&
    !['cancelled', 'no_show'].includes(booking.status) &&
    (excludeBookingId ? booking.id !== excludeBookingId : true) &&
    // Time overlap detection: two ranges overlap if start1 < end2 AND start2 < end1
    startTime < booking.end_time && booking.start_time < endTime
  )
  
  return conflicts.length === 0
}

// Helper function to create overlapping time ranges
function createOverlappingTimeRange(baseRange: { start_time: Date, end_time: Date }): { start_time: Date, end_time: Date } {
  const duration = baseRange.end_time.getTime() - baseRange.start_time.getTime()
  const overlapStart = new Date(baseRange.start_time.getTime() + duration * 0.25) // Start 25% into the base range
  const overlapEnd = new Date(overlapStart.getTime() + duration * 0.5) // 50% duration
  return { start_time: overlapStart, end_time: overlapEnd }
}

describe('Booking Availability Validation Properties', () => {
  beforeAll(async () => {
    console.log('Setting up booking availability tests...')
  })

  afterAll(async () => {
    console.log('Cleaning up booking availability tests...')
  })

  it('Property 2: Booking availability validation - should return false for conflicting bookings', async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantIdArb,
        staffIdArb,
        serviceIdArb,
        timeRangeArb,
        fc.array(fc.record({
          id: bookingIdArb,
          tenant_id: tenantIdArb,
          staff_id: staffIdArb,
          service_id: serviceIdArb,
          timeRange: timeRangeArb,
          status: bookingStatusArb
        }), { minLength: 0, maxLength: 10 }),
        async (tenantId, staffId, serviceId, newBookingTime, existingBookingData) => {
          // Create existing bookings
          const existingBookings: TestBooking[] = existingBookingData.map(data => ({
            id: data.id,
            tenant_id: data.tenant_id,
            staff_id: data.staff_id,
            service_id: data.service_id,
            start_time: data.timeRange.start_time,
            end_time: data.timeRange.end_time,
            status: data.status
          }))

          // Test availability for new booking
          const isAvailable = checkAvailability(
            tenantId,
            staffId,
            newBookingTime.start_time,
            newBookingTime.end_time,
            existingBookings
          )

          // Find actual conflicts
          const conflicts = existingBookings.filter(booking => 
            booking.tenant_id === tenantId &&
            booking.staff_id === staffId &&
            !['cancelled', 'no_show'].includes(booking.status) &&
            newBookingTime.start_time < booking.end_time && 
            booking.start_time < newBookingTime.end_time
          )

          // Property: Availability should be false if and only if there are conflicts
          if (conflicts.length > 0) {
            expect(isAvailable).toBe(false)
          } else {
            expect(isAvailable).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2.1: Cancelled and no-show bookings should not affect availability', async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantIdArb,
        staffIdArb,
        timeRangeArb,
        async (tenantId, staffId, timeRange) => {
          // Create cancelled and no-show bookings that would otherwise conflict
          const cancelledBooking: TestBooking = {
            id: fc.sample(bookingIdArb, 1)[0],
            tenant_id: tenantId,
            staff_id: staffId,
            service_id: fc.sample(serviceIdArb, 1)[0],
            start_time: timeRange.start_time,
            end_time: timeRange.end_time,
            status: 'cancelled'
          }

          const noShowBooking: TestBooking = {
            id: fc.sample(bookingIdArb, 1)[0],
            tenant_id: tenantId,
            staff_id: staffId,
            service_id: fc.sample(serviceIdArb, 1)[0],
            start_time: timeRange.start_time,
            end_time: timeRange.end_time,
            status: 'no_show'
          }

          const existingBookings = [cancelledBooking, noShowBooking]

          // Check availability for the same time slot
          const isAvailable = checkAvailability(
            tenantId,
            staffId,
            timeRange.start_time,
            timeRange.end_time,
            existingBookings
          )

          // Property: Cancelled and no-show bookings should not prevent new bookings
          expect(isAvailable).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2.2: Different staff members should not conflict with each other', async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantIdArb,
        fc.array(staffIdArb, { minLength: 2, maxLength: 5 }),
        timeRangeArb,
        async (tenantId, staffIds, timeRange) => {
          // Create bookings for different staff at the same time
          const existingBookings: TestBooking[] = staffIds.slice(0, -1).map(staffId => ({
            id: fc.sample(bookingIdArb, 1)[0],
            tenant_id: tenantId,
            staff_id: staffId,
            service_id: fc.sample(serviceIdArb, 1)[0],
            start_time: timeRange.start_time,
            end_time: timeRange.end_time,
            status: 'confirmed'
          }))

          // Check availability for the last staff member at the same time
          const lastStaffId = staffIds[staffIds.length - 1]
          const isAvailable = checkAvailability(
            tenantId,
            lastStaffId,
            timeRange.start_time,
            timeRange.end_time,
            existingBookings
          )

          // Property: Different staff members should be able to have bookings at the same time
          expect(isAvailable).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2.3: Different tenants should not conflict with each other', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(tenantIdArb, { minLength: 2, maxLength: 5 }),
        staffIdArb,
        timeRangeArb,
        async (tenantIds, staffId, timeRange) => {
          // Create bookings for different tenants with the same staff ID at the same time
          const existingBookings: TestBooking[] = tenantIds.slice(0, -1).map(tenantId => ({
            id: fc.sample(bookingIdArb, 1)[0],
            tenant_id: tenantId,
            staff_id: staffId,
            service_id: fc.sample(serviceIdArb, 1)[0],
            start_time: timeRange.start_time,
            end_time: timeRange.end_time,
            status: 'confirmed'
          }))

          // Check availability for the last tenant at the same time
          const lastTenantId = tenantIds[tenantIds.length - 1]
          const isAvailable = checkAvailability(
            lastTenantId,
            staffId,
            timeRange.start_time,
            timeRange.end_time,
            existingBookings
          )

          // Property: Different tenants should be able to have bookings at the same time (even with same staff ID)
          expect(isAvailable).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2.4: Time overlap detection should be accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantIdArb,
        staffIdArb,
        timeRangeArb,
        async (tenantId, staffId, baseTimeRange) => {
          // Create an overlapping time range
          const overlappingRange = createOverlappingTimeRange(baseTimeRange)
          
          const existingBooking: TestBooking = {
            id: fc.sample(bookingIdArb, 1)[0],
            tenant_id: tenantId,
            staff_id: staffId,
            service_id: fc.sample(serviceIdArb, 1)[0],
            start_time: baseTimeRange.start_time,
            end_time: baseTimeRange.end_time,
            status: 'confirmed'
          }

          // Check availability for overlapping time
          const isAvailable = checkAvailability(
            tenantId,
            staffId,
            overlappingRange.start_time,
            overlappingRange.end_time,
            [existingBooking]
          )

          // Property: Overlapping times should not be available
          expect(isAvailable).toBe(false)

          // Create a non-overlapping time range (after the existing booking)
          const nonOverlappingRange = {
            start_time: new Date(baseTimeRange.end_time.getTime() + 60000), // 1 minute after
            end_time: new Date(baseTimeRange.end_time.getTime() + 120000)   // 2 minutes after
          }

          const isAvailableNonOverlapping = checkAvailability(
            tenantId,
            staffId,
            nonOverlappingRange.start_time,
            nonOverlappingRange.end_time,
            [existingBooking]
          )

          // Property: Non-overlapping times should be available
          expect(isAvailableNonOverlapping).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})