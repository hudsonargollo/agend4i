# Implementation Plan

- [x] 1. Create domain configuration service




  - [x] 1.1 Implement environment-aware domain configuration


    - Create `src/lib/domain.ts` with environment detection logic
    - Implement domain resolution for development, staging, and production
    - Add environment variable override support (`VITE_APP_DOMAIN`)
    - Create URL generation utilities for tenant and admin paths
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.2 Write property test for environment domain resolution


    - **Property 1: Environment-appropriate domain resolution**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

  - [x] 1.3 Write property test for environment variable override

    - **Property 2: Environment variable override precedence**
    - **Validates: Requirements 2.4**

- [x] 2. Update onboarding component domain references




  - [x] 2.1 Replace hardcoded domain in onboarding UI


    - Update `src/pages/Onboarding.tsx` to use domain configuration service
    - Replace `agendai.online/` display with dynamic domain resolution
    - Update slug availability display to show correct domain
    - Update success message to reference new domain
    - _Requirements: 1.1, 1.3_

  - [x] 2.2 Write property test for onboarding domain display


    - **Property 3: UI component domain display consistency**
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [x] 2.3 Write property test for success message domain


    - **Property 4: Success message domain consistency**
    - **Validates: Requirements 1.3**

- [x] 3. Update dashboard component domain references




  - [x] 3.1 Replace hardcoded domain in dashboard UI


    - Update `src/pages/Dashboard.tsx` to use domain configuration service
    - Replace `agendai.online/{slug}` with dynamic URL generation
    - Update public URL display and external link generation
    - Ensure tenant-specific URL generation works correctly
    - _Requirements: 1.2, 1.4_

  - [x] 3.2 Write property test for dashboard URL generation


    - **Property 3: UI component domain display consistency**
    - **Validates: Requirements 1.1, 1.2, 1.4**

- [x] 4. Update tenant context and URL generation





  - [x] 4.1 Enhance tenant context with domain-aware URL generation


    - Update `src/hooks/useTenant.tsx` if it contains URL generation logic
    - Ensure all tenant-related URL generation uses the domain service
    - Update any utility functions that generate tenant URLs
    - _Requirements: 1.5, 3.1, 3.3_

  - [x] 4.2 Write property test for code domain consistency


    - **Property 5: Code domain reference consistency**
    - **Validates: Requirements 1.5**

  - [x] 4.3 Write property test for tenant routing preservation


    - **Property 6: Tenant routing pattern preservation**
    - **Validates: Requirements 3.1, 3.4**

- [x] 5. Update admin interface URL generation





  - [x] 5.1 Ensure admin routing uses correct domain


    - Review and update any admin URL generation to use domain service
    - Verify `/app` routing structure is preserved with new domain
    - Update any navigation components that generate admin URLs
    - _Requirements: 3.2_

  - [x] 5.2 Write property test for admin routing preservation


    - **Property 7: Admin routing pattern preservation**
    - **Validates: Requirements 3.2**


- [x] 6. Add environment configuration support


  - [x] 6.1 Configure Vite environment variables


    - Add `VITE_APP_DOMAIN` support in vite configuration
    - Create environment-specific configuration files if needed
    - Document environment variable usage for different deployments
    - _Requirements: 2.4_


  - [x] 6.2 Write property test for URL generation validity






    - **Property 8: URL generation validity**
    - **Validates: Requirements 3.3, 4.4**


- [x] 7. Scan and update any remaining domain references


  - [x] 7.1 Perform comprehensive domain reference audit



    - Search codebase for any remaining `agendai.online` references
    - Update any hardcoded domain strings in components, utilities, or configuration
    - Verify all URL generation goes through the domain configuration service
    - Update any comments or documentation that reference the old domain
    - _Requirements: 1.5, 4.5_


- [x] 8. Update environment files and configuration



  - [x] 8.1 Add domain configuration to environment files

    - Update `.env` files with appropriate domain configuration
    - Add staging and production environment examples
    - Document the domain configuration options
    - _Requirements: 2.1, 2.2, 2.3_


- [x] 9. Test cross-environment functionality




  - [x] 9.1 Verify domain resolution in all environments

    - Test domain configuration in development mode (localhost)
    - Test domain configuration with staging environment variables
    - Test domain configuration in production mode
    - Verify environment variable overrides work correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 10. Update documentation and migration guides




  - [x] 10.1 Create domain migration documentation

    - Document the domain change for users and developers
    - Create migration guide for updating external integrations
    - Update README with new domain information
    - Document environment configuration options
    - _Requirements: 4.2, 4.3_



- [x] 11. Final checkpoint - Ensure all domain references are updated



  - Ensure all tests pass, ask the user if questions arise.
  - Verify no hardcoded `agendai.online` references remain in codebase
  - Test onboarding flow displays correct domain
  - Test dashboard shows correct public URLs
  - Verify environment-specific domain resolution works
  - Test URL generation produces valid, working links