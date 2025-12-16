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

- [x] 13. Landing Page Implementation





  - Create marketing landing page at root URL with value proposition
  - Implement call-to-action buttons for signup and login
  - Replace existing development toggle with proper marketing content
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 13.1 Create marketing landing page component


  - Implement hero section with value proposition ("Your professional online agenda")
  - Add "Criar conta grátis" and "Entrar" call-to-action buttons
  - Include features overview and benefits section
  - Ensure responsive design and professional appearance
  - _Requirements: 9.1, 9.4_


- [x] 13.2 Implement landing page routing and navigation

  - Update App.tsx to serve landing page at root URL (/)
  - Add proper routing for signup and login CTAs
  - Ensure landing page is accessible without authentication
  - _Requirements: 9.2, 9.3, 9.5_

- [x] 13.3 Write unit tests for landing page


  - Test marketing content display and CTA functionality
  - Test routing behavior for signup and login buttons
  - Test public accessibility without authentication
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [x] 14. Authentication System Enhancement





  - Enhance authentication forms with mode-based switching
  - Implement post-authentication routing logic
  - Add email validation and duplicate prevention
  - _Requirements: 10.1, 10.5_

- [x] 14.1 Update authentication forms


  - Enhance Auth.tsx with improved login/signup forms
  - Add mode-based form switching (login vs signup)
  - Implement email validation and duplicate checking
  - Add proper error handling and user feedback
  - _Requirements: 10.1_

- [x] 14.2 Implement post-authentication routing


  - Add logic to redirect new users to onboarding
  - Redirect existing users to their admin dashboard
  - Handle edge cases for users without tenant association
  - _Requirements: 10.1, 10.5_

- [x] 14.3 Write unit tests for authentication enhancements


  - Test form validation and submission
  - Test post-auth routing logic
  - Test error handling for duplicate emails
  - _Requirements: 10.1, 10.5_

- [x] 15. Self-Service Onboarding Implementation









  - Create complete onboarding flow for new users
  - Implement shop name input and slug generation
  - Add real-time slug validation and tenant creation
  - _Requirements: 10.2, 10.3, 10.4_

- [x] 15.1 Create onboarding page component


  - Implement Onboarding.tsx with shop name input
  - Add auto-slug generation based on shop name
  - Create tenant creation form with validation
  - Include progress indicators and user guidance
  - _Requirements: 10.2, 10.4_

- [x] 15.2 Implement slug validation system


  - Create real-time slug availability checking
  - Add reserved word validation against system paths
  - Implement user-friendly validation feedback
  - Allow manual slug editing with live validation
  - _Requirements: 10.3, 11.1, 11.3_

- [x] 15.3 Write property test for onboarding user redirection


  - **Property 11: Onboarding user redirection**
  - **Validates: Requirements 10.1**

- [x] 15.4 Write property test for slug generation consistency


  - **Property 12: Slug generation consistency**
  - **Validates: Requirements 10.2**

- [x] 15.5 Write property test for real-time slug validation


  - **Property 13: Real-time slug validation**
  - **Validates: Requirements 10.3, 11.3**

- [x] 15.6 Write property test for tenant creation completeness


  - **Property 14: Tenant creation completeness**
  - **Validates: Requirements 10.4**

- [x] 15.7 Write unit tests for onboarding flow


  - Test shop name input and slug generation
  - Test slug validation and availability checking
  - Test tenant creation and user association
  - _Requirements: 10.2, 10.3, 10.4_

- [ ] 16. Reserved Slug Validation System





  - Implement comprehensive slug validation with reserved words
  - Create database functions for slug checking
  - Add user-friendly error messages and suggestions
  - _Requirements: 11.1, 11.2, 11.4, 11.5_

- [x] 16.1 Create slug validation database function


  - Implement validate_tenant_slug PostgreSQL function
  - Add reserved words checking (app, auth, api, dashboard, etc.)
  - Include database uniqueness validation
  - Return detailed validation results
  - _Requirements: 11.1, 11.3_


- [x] 16.2 Implement frontend slug validation

  - Add real-time validation in onboarding form
  - Display appropriate error messages for conflicts
  - Suggest alternative slugs when reserved words are used
  - Provide clear feedback about validation failures
  - _Requirements: 11.2, 11.5_

- [x] 16.3 Write property test for reserved slug rejection




  - **Property 15: Reserved slug rejection**

  - **Validates: Requirements 11.1**



- [x] 16.4 Write property test for generated slug safety

  - **Property 16: Generated slug safety**


  - **Validates: Requirements 11.4**


- [x] 16.5 Write unit tests for slug validation

  - Test reserved word rejection
  - Test database uniqueness checking
  - Test error message display and suggestions
  - _Requirements: 11.1, 11.2, 11.3, 11.5_




- [x] 17. Free Plan Limitations Implementation


  - Implement feature gating for Free Plan users
  - Add staff member limitations and upgrade prompts
  - Create premium feature blocking with clear upgrade paths
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 17.1 Implement staff limitation enforcement


  - Add validation to prevent Free Plan tenants from adding second staff member
  - Display upgrade prompt when staff limit is reached
  - Update staff management UI with plan-based restrictions
  - _Requirements: 12.1, 12.4_


- [x] 17.2 Implement premium feature gating

  - Block WhatsApp notification settings for Free Plan users
  - Block payment processing settings for Free Plan users
  - Display feature as disabled with upgrade options
  - Add clear upgrade paths to Pro Plan
  - _Requirements: 12.2, 12.3, 12.5_

- [x] 17.3 Write property test for Free Plan staff limitation


  - **Property 17: Free Plan staff limitation**
  - **Validates: Requirements 12.1**

- [x] 17.4 Write property test for Free Plan feature gating


  - **Property 18: Free Plan feature gating**
  - **Validates: Requirements 12.2, 12.3**


- [x] 17.5 Write unit tests for Free Plan limitations

  - Test staff limit enforcement and error messages
  - Test premium feature blocking and upgrade prompts
  - Test plan-based UI component behavior
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_






- [x] 18. Zeroum Barbearia Migration Support
  - Ensure seamless transition for existing Zeroum Barbearia setup
  - Verify all existing functionality works with new multi-tenant architecture
  - Test Pro Plan features for the first customer
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 18.1 Verify Zeroum Barbearia tenant setup
  - Ensure /zeroumbarbearia URL resolves correctly
  - Verify all existing services, staff, and bookings are accessible
  - Test public booking interface with existing data
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 18.2 Test Pro Plan features for Zeroum Barbearia
  - Verify WhatsApp notifications work for new bookings
  - Test Mercado Pago payment integration
  - Ensure all premium features are properly enabled
  - _Requirements: 13.4, 13.5_

- [x] 18.3 Write integration tests for Zeroum Barbearia
  - Test complete booking flow for the specific tenant
  - Test Pro Plan feature functionality
  - Test backward compatibility with existing data
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 19. Checkpoint - Ensure all new features work




  - Ensure all tests pass, ask the user if questions arise.


- [x] 20. Final Integration and User Acceptance Testing

  - Test complete user journeys from landing page to booking
  - Verify all routing modes work correctly
  - Validate security and data isolation with new features
  - _Requirements: All new requirements_

- [x] 20.1 End-to-end user journey testing
  - Test complete flow: landing page → signup → onboarding → admin dashboard
  - Test public booking flow with newly created tenants
  - Verify feature gating works correctly for Free vs Pro plans
  - _Requirements: 9.1, 10.1, 10.4, 12.1, 12.2_

- [x] 20.2 Security validation for new features
  - Test slug validation prevents routing conflicts
  - Verify tenant isolation works with onboarding flow
  - Test authentication boundaries for all new routes
  - _Requirements: 11.1, 11.3, 2.1, 2.2_

- [x] 20.3 Write comprehensive integration tests
  - Test complete self-service onboarding flow
  - Test landing page to booking completion journey
  - Test feature gating across different subscription plans
  - _Requirements: All new requirements_







- [x] 21. Final Checkpoint - Complete SaaS Platform


  - Ensure all tests pass, ask the user if questions arise.