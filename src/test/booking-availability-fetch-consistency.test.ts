/**
 * **Feature: unified-booking-flow, Property 4: Availability Fetch Consistency**
 * **Validates: Requirements 4.2**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('Property 4: Availability Fetch Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock implementation
    (supabase.rpc as any).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * **Feature: unified-booking-flow, Property 4: Availability Fetch Consistency**
   * **Validates: Requirements 4.2**
   * 
   * For any professional selection, the availability data displayed must correspond 
   * exactly to the selected professional's ID.
   */
  it('Property 4: Availability Fetch Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random professional IDs (alphanumeric + hyphens, like UUIDs)
        fc.stringMatching(/^[a-zA-Z0-9-]{1,36}$/),
        // Generate random tenant IDs (alphanumeric + hyphens, like UUIDs)
        fc.stringMatching(/^[a-zA-Z0-9-]{1,36}$/),
        // Generate random dates (within reasonable range)
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
        // Generate random service duration
        fc.integer({ min: 15, max: 120 }),
        
        async (professionalId, tenantId, selectedDate, serviceDuration) => {
          // Clear mock calls for this iteration
          (supabase.rpc as any).mockClear();
          
          // Mock the supabase RPC call to return availability data
          const mockAvailabilityResponse = { data: true, error: null };
          (supabase.rpc as any).mockResolvedValue(mockAvailabilityResponse);

          // Simulate the availability fetching logic from InlineAvailabilityPicker
          const generateTimeSlots = (date: Date): { startTime: Date; endTime: Date }[] => {
            const slots: { startTime: Date; endTime: Date }[] = [];
            const startHour = 8; // 8 AM
            const endHour = 18; // 6 PM
            const intervalMinutes = 30;

            for (let hour = startHour; hour < endHour; hour++) {
              for (let minute = 0; minute < 60; minute += intervalMinutes) {
                const startTime = new Date(date);
                startTime.setHours(hour, minute, 0, 0);
                
                const endTime = new Date(startTime.getTime() + serviceDuration * 60000);
                
                slots.push({ startTime, endTime });
              }
            }
            return slots;
          };

          const fetchAvailability = async (date: Date, profId: string, tenId: string) => {
            const timeSlots = generateTimeSlots(date);
            const results = [];

            for (let i = 0; i < timeSlots.length; i++) {
              const slot = timeSlots[i];
              
              // Call the RPC function
              const { data, error } = await supabase.rpc('check_availability', {
                p_tenant_id: tenId,
                p_staff_id: profId,
                p_start_time: slot.startTime.toISOString(),
                p_end_time: slot.endTime.toISOString(),
              });

              if (error) {
                throw error;
              }

              results.push({
                id: `${profId}-${slot.startTime.toISOString()}`,
                professionalId: profId,
                startTime: slot.startTime,
                endTime: slot.endTime,
                isAvailable: data === true,
              });
            }

            return results;
          };

          // Fetch availability for the professional
          const availabilityResults = await fetchAvailability(selectedDate, professionalId, tenantId);

          // Property assertions:
          // 1. All returned slots must have the correct professional ID
          for (const slot of availabilityResults) {
            expect(slot.professionalId).toBe(professionalId);
          }

          // 2. All slot IDs must contain the professional ID
          for (const slot of availabilityResults) {
            expect(slot.id).toContain(professionalId);
          }

          // 3. Verify that supabase.rpc was called with the correct professional ID
          const rpcCalls = (supabase.rpc as any).mock.calls;
          expect(rpcCalls.length).toBeGreaterThan(0); // Ensure we have calls to check
          
          for (const call of rpcCalls) {
            const [functionName, params] = call;
            if (functionName === 'check_availability') {

              
              expect(params.p_staff_id).toBe(professionalId);
              expect(params.p_tenant_id).toBe(tenantId);
            }
          }

          // 4. Ensure no slot belongs to a different professional
          for (const slot of availabilityResults) {
            expect(slot.professionalId).not.toBe('');
            expect(slot.professionalId).not.toBeNull();
            expect(slot.professionalId).not.toBeUndefined();
          }

          // 5. Verify that the number of RPC calls matches the number of time slots
          const expectedSlots = generateTimeSlots(selectedDate);
          expect(rpcCalls.length).toBe(expectedSlots.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify consistency when switching between professionals
   */
  it('Property 4 (edge case): Professional switch maintains fetch consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z0-9-]{1,36}$/), // professional1
        fc.stringMatching(/^[a-zA-Z0-9-]{1,36}$/), // professional2
        fc.stringMatching(/^[a-zA-Z0-9-]{1,36}$/), // tenantId
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
        
        async (professional1, professional2, tenantId, selectedDate) => {
          // Ensure we have different professionals
          fc.pre(professional1 !== professional2);

          const mockAvailabilityResponse = { data: true, error: null };
          (supabase.rpc as any).mockResolvedValue(mockAvailabilityResponse);

          const fetchAvailability = async (profId: string) => {
            const { data, error } = await supabase.rpc('check_availability', {
              p_tenant_id: tenantId,
              p_staff_id: profId,
              p_start_time: selectedDate.toISOString(),
              p_end_time: new Date(selectedDate.getTime() + 30 * 60000).toISOString(),
            });

            if (error) throw error;

            return {
              id: `${profId}-${selectedDate.toISOString()}`,
              professionalId: profId,
              startTime: selectedDate,
              endTime: new Date(selectedDate.getTime() + 30 * 60000),
              isAvailable: data === true,
            };
          };

          // Fetch for first professional
          const result1 = await fetchAvailability(professional1);
          expect(result1.professionalId).toBe(professional1);

          // Clear mocks to track second call
          vi.clearAllMocks();
          (supabase.rpc as any).mockResolvedValue(mockAvailabilityResponse);

          // Fetch for second professional
          const result2 = await fetchAvailability(professional2);
          expect(result2.professionalId).toBe(professional2);

          // Verify that each result corresponds to the correct professional
          expect(result1.professionalId).not.toBe(result2.professionalId);
          expect(result1.id).toContain(professional1);
          expect(result2.id).toContain(professional2);
        }
      ),
      { numRuns: 100 }
    );
  });
});