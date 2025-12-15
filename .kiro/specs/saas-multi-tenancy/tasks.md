# Implementation Plan

- [x] 1. Database Schema Setup (COMPLETED)
  - Multi-tenant database schema with RLS policies implemented
  - Tenant, staff, services, customers, bookings tables created
  - Basic RLS policies for authenticated users implemented
  - Security functions (is_tenant_member, has_tenant_role) implemented

- [x] 2. Basic Multi-Tenant Infrastructure (COMPLETED)
  - useTenant hook with membership-based tenant resolution implemented
  - PublicBooking page with tenant slug resolution implemented
  - Basic routing structure with /:slug pattern implemented
  - Tenant data display (services, staff) for public view implemented

- [x] 3. Database Security Enhancements





  - Add missing RLS policies and database functions for public booking
  - Add Mercado Pago integration columns to tenants table
  - Implement atomic availability checking function with concurrency control
  - _Requirements: 1.2, 1.4, 2.1, 5.1, 5.4, 5.5, 6.1_

- [x] 3.1 Create booking RLS policy for public access


  - Add RLS policy allowing anonymous users to INSERT bookings with status 'pending'
  - Ensure tenant_id validation in the policy
  - _Requirements: 1.3, 2.1_

- [x] 3.2 Implement check_availability database function


  - Create PostgreSQL function to detect booking conflicts atomically
  - Include staff_id, tenant_id, and time overlap validation
  - Exclude cancelled and no-show bookings from conflict detection
  - _Requirements: 1.2, 5.1, 5.4, 5.5_

- [x] 3.3 Add payment integration columns to tenants table


  - Add mp_payer_id, mp_subscription_id, subscription_status columns
  - Set appropriate defaults and constraints
  - _Requirements: 6.1, 6.2_

- [x] 3.4 Write property test for tenant data isolation


  - **Property 1: Tenant data isolation**
  - **Validates: Requirements 2.1, 2.2, 2.4**

- [x] 3.5 Write property test for booking availability validation


  - **Property 2: Booking availability validation**
  - **Validates: Requirements 1.2, 5.4, 5.5**

- [x] 3.6 Write property test for concurrent booking prevention



  - **Property 3: Concurrent booking prevention**
  - **Validates: Requirements 1.4, 5.1**


- [x] 4. Public Booking Interface Enhancement



  - Complete the booking form functionality in PublicBooking.tsx
  - Implement real-time availability checking with user feedback
  - Create booking confirmation flow for public users
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 4.1 Implement booking form in PublicBooking component


  - Add booking form with service selection, time slot picker, and customer info
  - Implement pre-flight availability checking before form submission
  - Add guest customer information collection (name, phone, email)
  - Handle booking conflicts with appropriate error messages
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4.2 Implement booking confirmation page


  - Create confirmation page with booking details
  - Add redirect logic after successful booking submission
  - _Requirements: 1.5_

- [x] 4.3 Write property test for public booking creation


  - **Property 4: Public booking creation**
  - **Validates: Requirements 1.3**

- [x] 4.4 Write unit tests for public booking flow


  - Test guest form validation and submission
  - Test availability checking integration
  - Test error handling for booking conflicts
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 5. Dual Interface Routing Implementation





  - Implement proper /app vs /:slug routing separation
  - Update useTenant hook for dual-mode operation
  - Add context switching between public and admin modes
  - _Requirements: 2.2, 2.4, 8.1, 8.2, 8.4_

- [x] 5.1 Update routing for dual interfaces


  - Implement /app/* routing for authenticated admin interface
  - Maintain /:slug routing for public booking interface
  - Add proper tenant context loading for each mode
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 5.2 Enhance useTenant hook for dual-mode operation


  - Add slug-based tenant resolution for public URLs
  - Maintain existing membership-based resolution for authenticated users
  - Implement context switching logic between modes
  - _Requirements: 2.2, 2.4, 8.1, 8.2, 8.4_

- [x] 5.3 Write property test for role-based data access


  - **Property 5: Role-based data access**
  - **Validates: Requirements 2.3, 2.5**

- [x] 5.4 Write property test for interface routing consistency



  - **Property 10: Interface routing consistency**
  - **Validates: Requirements 8.1, 8.2, 8.4**

- [x] 5.5 Write unit tests for tenant context management


  - Test slug resolution functionality
  - Test membership-based tenant loading
  - Test context switching between modes
  - _Requirements: 2.2, 2.4, 8.1, 8.2_

- [x] 6. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. WhatsApp Notification Service





  - Create serverless function for WhatsApp notifications (Supabase Edge Function)
  - Implement plan-based feature gating for notifications
  - Add booking webhook trigger for notification sending
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.1 Create notify-whatsapp serverless function


  - Implement WhatsApp notification service with Evolution API integration
  - Create Supabase Edge Function for WhatsApp notifications
  - Add message templating with booking details and business information
  - Include error handling and logging for delivery failures
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 7.2 Implement booking webhook trigger


  - Create database trigger for booking INSERT events
  - Add webhook payload generation with booking and tenant data
  - Ensure proper error handling for webhook failures
  - _Requirements: 4.1, 4.5_


- [x] 7.3 Write property test for WhatsApp notification triggering

  - **Property 8: WhatsApp notification triggering**
  - **Validates: Requirements 4.1, 4.3**

- [x] 7.4 Write unit tests for WhatsApp integration


  - Test message formatting and templating
  - Test plan-based feature gating
  - Test error handling for API failures
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Mercado Pago Integration Service





  - Create serverless function for payment processing (Supabase Edge Function)
  - Implement subscription creation and webhook handling
  - Add subscription status management
  - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8.1 Create mp-checkout serverless function


  - Implement Mercado Pago subscription preference creation
  - Create Supabase Edge Function for payment processing
  - Add webhook handler for payment events
  - Include subscription status updates and tenant plan management
  - _Requirements: 3.1, 3.2, 6.1, 6.2_

- [x] 8.2 Implement payment security measures


  - Add webhook signature verification
  - Ensure only necessary payment identifiers are stored
  - Implement secure external_reference handling
  - _Requirements: 6.2, 6.5_


- [x] 8.3 Write property test for subscription lifecycle management

  - **Property 7: Subscription lifecycle management**
  - **Validates: Requirements 3.2, 3.5, 6.3, 6.4**



- [x] 8.4 Write property test for payment integration security




  - **Property 9: Payment integration security**


  - **Validates: Requirements 6.1, 6.2, 6.5**

- [x] 8.5 Write unit tests for payment processing




  - Test subscription preference generation
  - Test webhook authentication and processing
  - Test subscription status transitions
  - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3_

- [x] 9. Feature Gating Implementation




  - Add subscription-based feature gating throughout the application
  - Create billing management interface for subscription upgrades
  - Implement feature availability validation
  - _Requirements: 3.3, 3.4, 7.5_


- [x] 9.1 Implement feature gating logic

  - Add subscription status checking for premium features
  - Create feature availability validation functions
  - Implement graceful degradation for unavailable features
  - _Requirements: 3.3, 3.4, 7.5_

- [x] 9.2 Create billing management interface


  - Add subscription status display in admin dashboard
  - Implement upgrade button with Mercado Pago integration
  - Add feature comparison and upgrade prompts
  - _Requirements: 3.1, 7.1, 7.4_

- [x] 9.3 Write property test for feature gating by subscription plan


  - **Property 6: Feature gating by subscription plan**
  - **Validates: Requirements 3.3, 3.4, 7.5**

- [x] 9.4 Write unit tests for billing interface


  - Test subscription status display
  - Test upgrade flow integration
  - Test feature gating UI components
  - _Requirements: 3.1, 3.3, 3.4_


- [x] 10. Error Handling and User Experience



  - Implement comprehensive error handling for all integration points
  - Add user-friendly error messages and recovery options
  - Create fallback mechanisms for service failures
  - _Requirements: 4.4, 5.3, 6.3_

- [x] 10.1 Implement error handling for booking conflicts


  - Add user-friendly messages for booking conflicts
  - Provide alternative time slot suggestions
  - Implement retry mechanisms for transient failures
  - _Requirements: 1.4, 5.3_

- [x] 10.2 Add error handling for external service failures


  - Implement graceful degradation for WhatsApp API failures
  - Add retry logic for Mercado Pago API calls
  - Create fallback mechanisms for webhook processing
  - _Requirements: 4.4, 6.3_

- [x] 10.3 Write unit tests for error handling


  - Test booking conflict error messages
  - Test external service failure handling
  - Test retry mechanisms and fallback behavior
  - _Requirements: 1.4, 4.4, 5.3, 6.3_


- [x] 11. Final Integration and Testing




  - Integrate all components and test end-to-end functionality
  - Verify data isolation and security measures
  - Test complete user flows for both public and authenticated users
  - _Requirements: All requirements_

- [x] 11.1 Integration testing for complete user flows


  - Test public booking flow from start to finish
  - Test admin subscription upgrade and feature access
  - Verify WhatsApp notifications for Pro plan bookings
  - _Requirements: 1.1, 1.3, 3.1, 4.1_

- [x] 11.2 Security validation testing


  - Verify RLS policies prevent cross-tenant access
  - Test authentication and authorization boundaries
  - Validate webhook security and payment data handling
  - _Requirements: 2.1, 2.3, 6.2, 6.5_

- [x] 11.3 Write integration tests for multi-tenant security


  - Test cross-tenant data isolation
  - Test role-based access control
  - Test public vs authenticated access boundaries
  - _Requirements: 2.1, 2.2, 2.3, 2.5_  


- [x] 12. Final Checkpoint - Ensure all tests pass








  - Ensure all tests pass, ask the user if questions arise.