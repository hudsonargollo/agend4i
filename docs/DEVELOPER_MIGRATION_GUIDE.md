# Developer Migration Guide

## Technical Implementation Details

This guide provides technical details for developers working with the domain migration from `agendai.online` to `agendai.clubemkt.digital`.

## Architecture Changes

### Domain Configuration Service

The migration introduced a centralized domain configuration service (`src/lib/domain.ts`) that:

- Detects the current environment (development, staging, production)
- Resolves the appropriate domain for each environment
- Provides URL generation utilities for tenant and admin paths
- Supports environment variable overrides

### Key Functions

```typescript
// Get current domain for environment
const domain = getCurrentDomain();

// Generate tenant URL
const tenantUrl = generateTenantUrl('business-slug');

// Generate admin URL
const adminUrl = generateAdminUrl('/dashboard');

// Generate public booking URL
const bookingUrl = generatePublicUrl('business-slug', '/book');
```

### Environment Detection Logic

```typescript
function detectEnvironment(): Environment {
  // 1. Check VITE_ENVIRONMENT variable
  if (import.meta.env.VITE_ENVIRONMENT) {
    return import.meta.env.VITE_ENVIRONMENT;
  }
  
  // 2. Check hostname patterns
  if (window.location.hostname === 'localhost') {
    return 'development';
  }
  
  if (window.location.hostname.includes('staging')) {
    return 'staging';
  }
  
  // 3. Default to production
  return 'production';
}
```

## Component Updates

### Onboarding Component (`src/pages/Onboarding.tsx`)

**Before:**
```tsx
<p>Your booking page will be available at: agendai.online/{slug}</p>
```

**After:**
```tsx
<p>Your booking page will be available at: {getCurrentDomain()}/{slug}</p>
```

### Dashboard Component (`src/pages/Dashboard.tsx`)

**Before:**
```tsx
const publicUrl = `https://agendai.online/${tenant.slug}`;
```

**After:**
```tsx
const publicUrl = generateTenantUrl(tenant.slug);
```

### Tenant Context (`src/hooks/useTenant.tsx`)

Updated to use centralized URL generation for all tenant-related operations.

## Environment Configuration

### Development Environment

```bash
# .env.development
VITE_APP_DOMAIN=localhost:8080
VITE_ENVIRONMENT=development
```

### Staging Environment

```bash
# .env.staging
VITE_APP_DOMAIN=staging.agendai.clubemkt.digital
VITE_ENVIRONMENT=staging
```

### Production Environment

```bash
# .env.production
VITE_APP_DOMAIN=agendai.clubemkt.digital
VITE_ENVIRONMENT=production
```
## Testing Strategy

### Property-Based Tests

The migration includes comprehensive property-based tests using fast-check:

1. **Environment Domain Resolution** - Validates correct domain for each environment
2. **URL Generation Consistency** - Ensures all generated URLs are valid and consistent
3. **Component Domain Display** - Verifies UI components show correct domain
4. **Routing Preservation** - Confirms tenant and admin routing patterns are maintained

### Unit Tests

Key unit tests cover:
- Domain configuration service functionality
- URL generation with various tenant slugs
- Environment detection logic
- Component rendering with new domain references

### Integration Tests

End-to-end tests verify:
- Complete user flows with new domain
- Cross-environment domain resolution
- External link generation and navigation

## Migration Validation

### Automated Checks

Run the following commands to validate the migration:

```bash
# Run all tests
npm test

# Run domain-specific tests
npm test -- --grep "domain"

# Run property-based tests
npm test -- --grep "property"

# Build and verify all environments
npm run build -- --mode development
npm run build -- --mode staging
npm run build -- --mode production
```

### Manual Verification

1. **Check for hardcoded references:**
   ```bash
   grep -r "agendai\.online" src/
   # Should return no results
   ```

2. **Verify environment resolution:**
   ```bash
   # Start dev server and check console logs
   npm run dev
   ```

3. **Test URL generation:**
   ```bash
   # Open browser console and test
   console.log(getCurrentDomain());
   console.log(generateTenantUrl('test-business'));
   ```

## Code Patterns

### DO: Use Domain Configuration Service

```typescript
import { getCurrentDomain, generateTenantUrl } from '@/lib/domain';

// Generate URLs dynamically
const bookingUrl = generateTenantUrl(tenantSlug);
const domain = getCurrentDomain();
```

### DON'T: Hardcode Domain References

```typescript
// ❌ Don't do this
const url = `https://agendai.clubemkt.digital/${tenant}`;
const domain = 'agendai.clubemkt.digital';

// ❌ Don't do this either
const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'agendai.clubemkt.digital' 
  : 'localhost:8080';
```

### URL Generation Best Practices

```typescript
// ✅ For tenant URLs
const tenantUrl = generateTenantUrl(slug, '/booking');

// ✅ For admin URLs  
const adminUrl = generateAdminUrl('/dashboard');

// ✅ For external links
const externalUrl = generatePublicUrl(slug, '/book', { external: true });

// ✅ For API endpoints
const apiUrl = generateApiUrl('/webhooks/booking');
```

## Troubleshooting

### Common Development Issues

1. **Domain not updating in development:**
   - Restart the dev server after changing environment files
   - Clear browser cache and local storage
   - Check console for domain configuration logs

2. **Build failing with domain errors:**
   - Verify environment variable syntax in .env files
   - Ensure no quotes around values in .env files
   - Check that all imports are correctly resolved

3. **Tests failing after migration:**
   - Update test mocks to use new domain
   - Verify test environment configuration
   - Check that domain service is properly mocked in tests

### Debugging Domain Resolution

Add debug logging to troubleshoot domain issues:

```typescript
// Add to domain configuration service
console.log('Environment:', detectEnvironment());
console.log('Domain override:', import.meta.env.VITE_APP_DOMAIN);
console.log('Resolved domain:', getCurrentDomain());
```

### Performance Considerations

- Domain resolution is cached after first call
- URL generation is optimized for frequent use
- Environment detection runs once at startup

## Future Considerations

### Adding New Environments

To add a new environment (e.g., 'preview'):

1. Create `.env.preview` file with domain configuration
2. Update environment detection logic in domain service
3. Add environment-specific build commands
4. Update documentation and deployment scripts

### Custom Domain Support

The architecture supports custom domains through:
- Environment variable overrides (`VITE_APP_DOMAIN`)
- Runtime domain detection
- Flexible URL generation utilities

### Monitoring and Analytics

Consider adding:
- Domain resolution metrics
- URL generation performance tracking
- Environment-specific error reporting
- Migration success metrics

## Security Considerations

### Domain Validation

The domain service includes validation for:
- URL format and structure
- Protocol selection (http/https)
- Port handling for development
- Path sanitization

### CORS Configuration

Ensure CORS settings include all valid domains:
```typescript
const allowedOrigins = [
  'https://agendai.clubemkt.digital',
  'https://staging.agendai.clubemkt.digital',
  'http://localhost:8080'
];
```

### Content Security Policy

Update CSP headers to include new domain:
```
Content-Security-Policy: default-src 'self' https://agendai.clubemkt.digital
```