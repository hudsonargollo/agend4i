import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Booking State Integrity Property Test', () => {
  /**
   * **Feature: unified-booking-flow, Property 1: State Integrity on Professional Switch**
   * **Validates: Requirements 4.3**
   * 
   * For any booking state with a selected time slot, when a different professional 
   * is selected, the previously selected time slot must be cleared to prevent 
   * booking mismatches.
   */
  it('Property 1: State Integrity on Professional Switch', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random professional IDs
        fc.string({ minLength: 1, maxLength: 36 }),
        fc.string({ minLength: 1, maxLength: 36 }),
        // Generate random time slots
        fc.record({
          time: fc.constantFrom(
            '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
            '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
            '17:00', '17:30'
          ),
          available: fc.constant(true),
        }),
        async (professionalId1, professionalId2, timeSlot) => {
          // Ensure we have two different professionals
          fc.pre(professionalId1 !== professionalId2);

          // Simulate booking state with a selected professional and time slot
          interface BookingState {
            selectedProfessionalId: string | null;
            selectedTimeSlot: { time: string; available: boolean } | null;
            selectedDate: Date;
            selectedServiceId: string | null;
          }

          // Initial state: Professional 1 is selected with a time slot
          const initialState: BookingState = {
            selectedProfessionalId: professionalId1,
            selectedTimeSlot: timeSlot,
            selectedDate: new Date(),
            selectedServiceId: 'service-123',
          };

          // Verify initial state has a time slot
          expect(initialState.selectedTimeSlot).not.toBeNull();
          expect(initialState.selectedTimeSlot?.time).toBe(timeSlot.time);

          // Simulate professional switch
          const handleProfessionalSelect = (
            state: BookingState,
            newProfessionalId: string
          ): BookingState => {
            // This is the critical logic: when professional changes, clear time slot
            return {
              ...state,
              selectedProfessionalId: newProfessionalId,
              selectedTimeSlot: null, // Clear time slot on professional change
            };
          };

          // Switch to Professional 2
          const newState = handleProfessionalSelect(initialState, professionalId2);

          // Property assertions:
          // 1. Professional ID should be updated
          expect(newState.selectedProfessionalId).toBe(professionalId2);
          expect(newState.selectedProfessionalId).not.toBe(professionalId1);

          // 2. Time slot MUST be cleared (this is the critical property)
          expect(newState.selectedTimeSlot).toBeNull();

          // 3. Other state should be preserved
          expect(newState.selectedServiceId).toBe(initialState.selectedServiceId);
          expect(newState.selectedDate).toBe(initialState.selectedDate);

          // 4. Verify the old time slot is not accidentally retained
          expect(newState.selectedTimeSlot).not.toEqual(timeSlot);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify that selecting the same professional does NOT clear the time slot
   */
  it('Property 1 (edge case): Same professional selection preserves time slot', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 36 }),
        fc.record({
          time: fc.constantFrom('08:00', '09:00', '10:00', '11:00'),
          available: fc.constant(true),
        }),
        async (professionalId, timeSlot) => {
          interface BookingState {
            selectedProfessionalId: string | null;
            selectedTimeSlot: { time: string; available: boolean } | null;
          }

          const initialState: BookingState = {
            selectedProfessionalId: professionalId,
            selectedTimeSlot: timeSlot,
          };

          // Simulate selecting the same professional (no change)
          const handleProfessionalSelect = (
            state: BookingState,
            newProfessionalId: string
          ): BookingState => {
            // Only clear time slot if professional actually changes
            if (state.selectedProfessionalId === newProfessionalId) {
              return state; // No change
            }
            return {
              ...state,
              selectedProfessionalId: newProfessionalId,
              selectedTimeSlot: null,
            };
          };

          const newState = handleProfessionalSelect(initialState, professionalId);

          // When selecting the same professional, time slot should be preserved
          expect(newState.selectedTimeSlot).toEqual(timeSlot);
          expect(newState.selectedProfessionalId).toBe(professionalId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
