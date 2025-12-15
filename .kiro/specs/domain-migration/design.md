# Design Document: Domain Migration

## Overview

This design implements the migration from `agendai.online` to `agendai.clubemkt.digital` across the entire SaaS multi-tenancy application. The solution provides environment-aware domain configuration, updates all user-facing references, and maintains backward compatibility during the transition period.

## Architecture

The domain migration follows a configuration-driven approach with these key components:

### Environment-Based Domain Resolution
- **Development**: `localhost:8080` for local development
- **Staging**: `staging.agendai.clubemkt.digital` for testing
- **Production**: `agendai.clubemkt.digital` for live environment

### Configuration Hierarchy
1. **Environment variables** - Highest priority for deployment-specific overrides
2. **Build-time configuration** - Vite environment-specific settings
3. **Default configuration** - Fallback to production domain

### URL Generation Strategy
- Centralized domain configuration service
- Dynamic URL generation based on current environment
- Consistent tenant slug handling across all interfaces

## Components and Interfaces

### Domain Configuration Service (`src/lib/domain.ts`)
- **Environment detection** - Determines current runtime environment
- **Domain resolution** - Returns appropriate domain for current context
- **URL generation** - Creates tenant-specific and admin URLs
- **Validation** - Ensures generated URLs are properly formatted

### Updated UI Components
- **Onboarding component** - Updated domain display in tenant creation flow
- **Dashboard component** - Updated public URL generation and display
- **Tenant context** - Updated URL generation for tenant-specific operations
- **Navigation components** - Updated external link generation

### Environment Configuration
- **Vite environment variables** - `VITE_APP_DOMAIN` for environment-specific domains
- **Runtime configuration** - Dynamic domain resolution based on deployment context
- **Build configuration** - Environment-specific domain injection during build

## Data Models

### Domain Configuration
```typescript
interface DomainConfig {
  environment: 'development' | 'staging' | production';
  baseDomain: string;
  protocol: 'http' | 'https';
  port?: number;
}

interface URLGenerationOptions {
  tenant?: string;
  path?: string;
  admin?: boolean;
  external?: boolean;
}
```

### Environment Detection
```typescript
interface EnvironmentContext {
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  currentDomain: string;
  baseURL: string;
}
```

### Migration Tracking
```typescript
interface MigrationStatus {
  component: string;
  oldReference: string;
  newReference: string;
  updated: boolean;
  verified: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Environment-appropriate domain resolution**
*For any* environment context (development, staging, production), the domain configuration service should return the correct domain for that environment
**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

**Property 2: Environment variable override precedence**
*For any* configured environment variable `VITE_APP_DOMAIN`, it should override the default domain configuration regardless of detected environment
**Validates: Requirements 2.4**

**Property 3: UI component domain display consistency**
*For any* user-facing component (onboarding, dashboard, tenant info), the displayed domain should match the current environment's configured domain
**Validates: Requirements 1.1, 1.2, 1.4**

**Property 4: Success message domain consistency**
*For any* tenant creation success message, the message should reference the correct domain for the current environment
**Validates: Requirements 1.3**

**Property 5: Code domain reference consistency**
*For any* generated URL or domain reference in the application, it should use the domain appropriate for the current environment
**Validates: Requirements 1.5**

**Property 6: Tenant routing pattern preservation**
*For any* tenant slug, the generated URL should maintain the `/{tenant}` pattern with the correct domain for the current environment
**Validates: Requirements 3.1, 3.4**

**Property 7: Admin routing pattern preservation**
*For any* admin interface URL generation, the `/app` path structure should be preserved with the correct domain
**Validates: Requirements 3.2**

**Property 8: URL generation validity**
*For any* generated public or booking URL, it should be properly formatted with correct protocol, domain, and path structure
**Validates: Requirements 3.3, 4.4**

## Error Handling

### Configuration Errors
- **Missing environment variables** - Fall back to production domain with warning
- **Invalid domain format** - Validate domain format and provide clear error messages
- **Network connectivity issues** - Handle domain resolution failures gracefully

### Migration Errors
- **Incomplete updates** - Identify and report any remaining old domain references
- **URL generation failures** - Provide fallback URL generation with error logging
- **Environment detection failures** - Default to production configuration with alerts

### User Experience Errors
- **Broken links** - Validate all generated URLs before displaying to users
- **Inconsistent branding** - Ensure all domain references use the same format
- **Navigation issues** - Test all internal and external link generation

## Testing Strategy

### Unit Tests
- Domain configuration service functionality
- URL generation with various tenant slugs and paths
- Environment detection logic
- Component rendering with new domain references

### Property-Based Tests
The property-based testing will use **fast-check** (already available in the project) to generate random configurations and validate domain handling across all scenarios. Each property-based test will run a minimum of 100 iterations:

- **Domain resolution across environments** - Generate random environment configurations
- **URL generation consistency** - Generate random tenant slugs and path combinations
- **Component domain display** - Generate random tenant data and verify UI updates
- **Routing preservation** - Generate random navigation scenarios and verify functionality
- **Environment variable handling** - Generate random environment configurations

### Integration Tests
- End-to-end URL generation and navigation testing
- Cross-environment domain resolution verification
- Component integration with new domain configuration
- Backward compatibility validation

### Manual Testing Scenarios
- Onboarding flow with new domain display
- Dashboard public URL generation and sharing
- Tenant booking page access via new domain
- Admin interface functionality with new domain
- Environment switching and domain resolution