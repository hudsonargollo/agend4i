# Requirements Document

## Introduction

This feature migrates the existing SaaS multi-tenancy application from using `agendai.online` domain references to the new custom domain `agendai.clubemkt.digital`. The migration involves updating all hardcoded domain references, user-facing messages, and configuration to reflect the new domain structure while maintaining the existing tenant-based routing functionality.

## Glossary

- **Domain Migration**: The process of changing all references from the old domain to the new domain
- **Tenant Slug**: The unique identifier used in URLs to identify specific tenants (e.g., `/{tenant}`)
- **Public URL**: The customer-facing URL where tenants' booking pages are accessible
- **Hardcoded References**: Direct domain strings embedded in the application code
- **Environment Configuration**: Domain-related settings that may vary between environments

## Requirements

### Requirement 1

**User Story:** As a business owner, I want all references to the old domain updated to the new domain, so that my tenants see consistent branding and correct URLs throughout the application.

#### Acceptance Criteria

1. WHEN viewing the onboarding process THEN the system SHALL display `agendai.clubemkt.digital/{slug}` instead of `agendai.online/{slug}`
2. WHEN viewing the dashboard THEN the system SHALL show the public URL as `agendai.clubemkt.digital/{tenant}` 
3. WHEN creating a new tenant THEN the system SHALL reference the new domain in success messages
4. WHEN displaying tenant information THEN the system SHALL use the new domain in all user-facing text
5. WHERE domain references exist in code THEN the system SHALL use the new domain consistently

### Requirement 2

**User Story:** As a developer, I want domain configuration to be environment-aware, so that I can use different domains for development, staging, and production environments.

#### Acceptance Criteria

1. WHEN running in development mode THEN the system SHALL use `localhost:8080` for local testing
2. WHEN running in staging mode THEN the system SHALL use `staging.agendai.clubemkt.digital` 
3. WHEN running in production mode THEN the system SHALL use `agendai.clubemkt.digital`
4. WHEN environment variables are configured THEN the system SHALL override default domain settings
5. WHERE no environment configuration exists THEN the system SHALL fall back to production domain

### Requirement 3

**User Story:** As a tenant user, I want all existing functionality to work seamlessly with the new domain, so that the migration is transparent to end users.

#### Acceptance Criteria

1. WHEN accessing tenant booking pages THEN the system SHALL maintain the same routing pattern `/{tenant}`
2. WHEN using admin interface THEN the system SHALL preserve the `/app` routing structure
3. WHEN generating public URLs THEN the system SHALL create valid links using the new domain
4. WHEN sharing booking links THEN the system SHALL provide URLs that work correctly
5. WHERE existing bookings reference old URLs THEN the system SHALL continue to function properly

### Requirement 4

**User Story:** As a system administrator, I want the domain migration to be backward compatible, so that existing integrations and bookmarks continue to work during the transition period.

#### Acceptance Criteria

1. WHEN old domain URLs are accessed THEN the system SHALL provide clear migration information
2. WHEN updating external integrations THEN the system SHALL provide new URL formats
3. WHEN documenting the change THEN the system SHALL include migration guides for users
4. WHEN testing the migration THEN the system SHALL verify all URL generation works correctly
5. WHERE legacy references exist THEN the system SHALL identify and update them systematically