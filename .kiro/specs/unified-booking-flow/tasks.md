# Implementation Plan

- [x] 1. Create new booking components





  - Create foundational components for the unified booking flow
  - _Requirements: 1.3, 4.2_


- [x] 1.1 Create `src/components/booking/InlineAvailabilityPicker.tsx`

  - Implement component with `professionalId`, `selectedDate`, `onDateChange`, and `onTimeSlotSelect` props
  - Implement availability fetching using Supabase `check_availability` RPC
  - Render Calendar component for date selection
  - Render TimeSlotGrid component for time selection
  - Implement skeleton loading state during fetch
  - Handle empty states with "No availability" message
  - _Requirements: 1.2, 1.3, 4.2, 5.1_

- [x] 1.2 Create `src/components/booking/TimeSlotGrid.tsx`

  - Implement component with `slots`, `selectedSlot`, and `onSlotSelect` props
  - Display available time slots in a responsive grid layout
  - Highlight selected slot with primary color
  - Disable and visually dim unavailable slots
  - _Requirements: 1.3, 5.2_

- [x] 1.3 Write property test for state integrity

  - **Property 1: State Integrity on Professional Switch**
  - **Validates: Requirements 4.3**
  - Generate random booking states with selected time slots
  - Simulate professional switches
  - Verify time slot is cleared when professional changes

- [x] 2. Refactor ProfessionalCard component




  - Enhance ProfessionalCard to support selection state and expandable content
  - _Requirements: 1.1, 5.3_

- [x] 2.1 Update `src/components/ProfessionalCard.tsx`


  - Add `isSelected` boolean prop for active state styling
  - Add `onSelect` callback prop that passes professional ID
  - Add `expandedContent` optional prop for mobile accordion pattern
  - Apply `ring-2 ring-primary` border when `isSelected` is true
  - Add neon green glow effect using `shadow-[0_0_15px_rgba(0,255,0,0.3)]`
  - Implement smooth expansion animation using framer-motion
  - _Requirements: 1.1, 5.3_


- [x] 2.2 Write property test for layout stability

  - **Property 2: Layout Stability on Mobile Expansion**
  - **Validates: Requirements 5.4**
  - Generate random scroll positions and card positions
  - Simulate card expansion on mobile viewport
  - Verify card header remains visible in viewport after expansion

- [x] 3. Refactor PublicBooking page





  - Transform multi-step wizard into single-page unified flow
  - _Requirements: 1.2, 2.1, 2.2, 3.1, 4.1_

- [x] 3.1 Remove wizard step logic from `src/pages/PublicBooking.tsx`


  - Remove `currentStep` state and navigation logic
  - Keep service selection as initial step if needed
  - Remove "Next Step" buttons and step indicators
  - _Requirements: 1.2_


- [x] 3.2 Implement responsive layout switching

  - Use `useMediaQuery` hook from `src/hooks/use-mobile.tsx`
  - Implement accordion pattern for mobile (< 768px)
  - Implement split view pattern for desktop (>= 768px)
  - Ensure only one professional expanded at a time on mobile
  - _Requirements: 3.1, 3.3_


- [x] 3.3 Implement state management

  - Add `selectedProfessionalId` state (string | null)
  - Add `selectedDate` state (Date, default to new Date())
  - Add `selectedTimeSlot` state (BookingSlot | null)
  - Implement `handleProfessionalSelect` that clears time slot when professional changes
  - Preserve `selectedServiceId` when switching professionals
  - _Requirements: 2.2, 4.1, 4.3_


- [x] 3.4 Write property test for single expansion

  - **Property 3: Single Expansion on Mobile**
  - **Validates: Requirements 3.3**
  - Generate sequences of professional selections on mobile viewport
  - Verify only one professional is expanded at any time
  - Verify previously expanded professionals are collapsed




- [x] 4. Integrate availability fetching


  - Connect components to Supabase backend for real-time availability

  - _Requirements: 1.2, 4.2_

- [x] 4.1 Wire InlineAvailabilityPicker to Supabase

  - Connect to Supabase client from `src/integrations/supabase/client.ts`
  - Call `check_availability` RPC with professionalId and date
  - Handle loading states with skeleton loader
  - Handle error states with user-friendly messages and retry button
  - Handle empty states (no slots available)
  - _Requirements: 1.2, 1.4, 4.2, 5.1_


- [x] 4.2 Write property test for fetch consistency

  - **Property 4: Availability Fetch Consistency**
  - **Validates: Requirements 4.2**
  - Generate random professional IDs
  - Simulate availability fetches
  - Verify returned data always matches the requested professional ID

- [x] 5. Add visual polish and animations
  - Implement design system styling and smooth transitions
  - _Requirements: 5.3, 5.4_

- [x] 5.1 Implement selection animations


  - Add framer-motion to card expansion with height: 0 to auto transition
  - Add cross-fade transition when switching between professionals
  - Add fade-in animation for availability data (opacity transition 300ms)
  - Ensure smooth accordion animation using `animate-accordion-down` class
  - _Requirements: 5.3_

- [x] 5.2 Implement visual feedback


  - Apply neon green border to selected professional
  - Add hover states with `hover:ring-1 hover:ring-primary/50`
  - Ensure unavailable professionals are visually dimmed
  - Add skeleton loaders using existing Skeleton component
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.3 Write unit tests for visual states


  - Test professional card selection styling
  - Test skeleton loader display during fetch
  - Test unavailable professional dimming
  - Test mobile accordion expansion behavior
  - _Requirements: 5.1, 5.2, 5.3_



- [x] 6. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.



- [x] 7. Integration testing



  - Test complete user flows across the unified booking experience
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1_



- [x] 7.1 Write integration test for complete booking flow

  - Test flow from professional selection to time slot selection to confirmation
  - Test switching between professionals and comparing availability
  - Test mobile vs desktop layout behavior
  - Test error recovery flows (network errors, empty states)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1_

- [x] 8. Fix BookingSlot interface compatibility





  - Add missing `time` property to BookingSlot interface in TimeSlotGrid.tsx
  - Update InlineAvailabilityPicker to populate the time property when creating slots
  - Ensure compatibility between new unified flow and existing booking logic
  - _Requirements: 4.1, 4.3_

- [x] 9. Add customer information form




  - Create customer information form component that appears after time slot selection
  - Include fields for name, phone, email, and optional notes
  - Implement form validation and error handling
  - Connect form to existing booking submission logic
  - _Requirements: 1.1, 1.2_

- [x] 10. Add booking confirmation flow




  - Display booking summary with selected service, professional, date, and time
  - Show customer information and total price
  - Implement booking submission with loading states
  - Display success confirmation with booking details
  - Handle booking conflicts and suggest alternatives
  - _Requirements: 1.1, 1.2, 4.1_
