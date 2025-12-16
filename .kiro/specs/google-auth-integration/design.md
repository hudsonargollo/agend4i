# Design Document: Google Authentication Integration

## Overview

This design document outlines the implementation of Google OAuth authentication for the AgendAi application. The system will integrate Google Sign-In capabilities while maintaining the existing email/password authentication flow and preserving the special zeroum@barbearia.com test account. The implementation leverages Supabase's built-in OAuth providers and extends the current authentication architecture.

## Architecture

### Current Authentication Flow
The application currently uses:
- Supabase Auth for user management and session handling
- React Context (AuthProvider) for state management
- Email/password authentication with form validation
- Automatic routing based on user tenant associations

### Enhanced Authentication Flow
The enhanced system will:
- Add Google OAuth as an additional authentication method
- Maintain backward compatibility with existing email/password flow
- Preserve the zeroum test account functionality
- Handle OAuth callbacks and error states
- Provide unified user experience across authentication methods

### Authentication Decision Tree
```
User Authentication Request
├── Google OAuth Selected
│   ├── Redirect to Google OAuth
│   ├── Handle OAuth Callback
│   │   ├── New User → Create Account + Redirect to Onboarding
│   │   └── Existing User → Authenticate + Redirect to Dashboard
│   └── Handle OAuth Errors
└── Traditional Auth Selected
    ├── Email/Password Form
    ├── Special Case: zeroum@barbearia.com
    └── Standard Validation Flow
```

## Components and Interfaces

### 1. Enhanced Auth Page Component
**File:** `src/pages/Auth.tsx`

The existing Auth component will be enhanced to:
- Maintain current Google OAuth button (already implemented)
- Improve error handling for OAuth flows
- Add better visual feedback for OAuth states
- Handle edge cases for account linking

### 2. OAuth Callback Handler
**File:** `src/pages/AuthCallback.tsx`

Enhanced callback handler will:
- Process OAuth success/failure states
- Handle user profile data from Google
- Manage routing for new vs existing users
- Provide better error messaging

### 3. Authentication Hook Enhancement
**File:** `src/hooks/useAuth.tsx`

The useAuth hook will be extended with:
- OAuth-specific error handling
- User profile management for OAuth users
- Session management improvements

### 4. Zeroum Account Management
**File:** `src/scripts/create-zeroum-account.ts`

Enhanced to ensure:
- Account persistence across deployments
- Proper tenant configuration
- Isolation from OAuth flows

## Data Models

### User Profile Data Structure
```typescript
interface GoogleUserProfile {
  email: string;
  full_name: string;
  avatar_url?: string;
  email_verified: boolean;
  provider: 'google';
  provider_id: string;
}

interface ZeroumAccount {
  email: 'zeroum@barbearia.com';
  password: 'rods1773#';
  full_name: 'Zeroum Barbearia Admin';
  tenant_slug: 'zeroumbarbearia';
  role: 'owner';
  plan: 'pro';
}
```

### Authentication State Management
```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  oauthLoading: boolean;
  provider?: 'email' | 'google';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

<function_calls>
<invoke name="prework">
<parameter name="featureName">google-auth-integration

### Property Reflection

After reviewing the prework analysis, I identified several areas where properties can be consolidated:

**Redundancy Analysis:**
- Properties 1.1 and 2.1 are identical (OAuth redirect behavior) - can be combined
- Properties 1.4 and 2.4 are similar (error handling) - can be combined into one comprehensive property
- Properties 1.2, 1.3, 2.2, and 2.3 can be consolidated into comprehensive OAuth flow properties
- Security properties 5.1-5.5 can be grouped into fewer, more comprehensive properties

**Consolidated Properties:**

Property 1: OAuth redirect initiation
*For any* authentication page (sign-in or sign-up), clicking the Google authentication button should initiate a redirect to Google OAuth with proper parameters
**Validates: Requirements 1.1, 2.1**

Property 2: OAuth account creation and authentication
*For any* successful Google OAuth response, the system should either create a new account (for new users) or authenticate existing users, with proper profile data mapping
**Validates: Requirements 1.2, 1.3, 2.2, 2.3**

Property 3: OAuth error handling consistency
*For any* OAuth failure or cancellation, the system should display appropriate error messages and return users to the correct authentication page
**Validates: Requirements 1.4, 2.4**

Property 4: Duplicate account handling
*For any* Google account that already exists in the system, sign-up attempts should redirect to the sign-in flow instead of creating duplicates
**Validates: Requirements 1.5**

Property 5: Session management consistency
*For any* successful Google OAuth authentication, the system should maintain sessions according to the same rules as traditional authentication
**Validates: Requirements 2.5**

Property 6: OAuth security implementation
*For any* OAuth request and response, the system should implement proper security measures including state validation, CSRF protection, and secure token handling
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

## Error Handling

### OAuth Error Scenarios
1. **Network Failures**: Handle connectivity issues during OAuth flow
2. **User Cancellation**: Graceful handling when users cancel OAuth consent
3. **Invalid Tokens**: Proper validation and error messaging for malformed tokens
4. **Rate Limiting**: Handle Google API rate limits gracefully
5. **Account Conflicts**: Manage scenarios where email exists with different provider

### Error Recovery Strategies
- Automatic retry for transient network errors
- Clear user messaging for actionable errors
- Fallback to traditional authentication when OAuth fails
- Logging for debugging without exposing sensitive data

### Zeroum Account Protection
- Prevent OAuth linking to zeroum account
- Maintain account isolation from user operations
- Ensure account persistence across system updates

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific scenarios and property-based tests for universal behaviors:

**Unit Testing:**
- Specific OAuth callback scenarios
- Zeroum account functionality
- Error boundary conditions
- UI component interactions

**Property-Based Testing:**
- OAuth flow consistency across different user profiles
- Security validation across various token formats
- Session management across authentication methods
- Error handling across different failure modes

**Property-Based Testing Library:** We will use **fast-check** for TypeScript/JavaScript property-based testing, configured to run a minimum of 100 iterations per property test.

**Test Tagging:** Each property-based test will be tagged with comments referencing the design document property using the format: `**Feature: google-auth-integration, Property {number}: {property_text}**`

### Integration Testing
- End-to-end OAuth flows
- Cross-browser compatibility
- Mobile authentication experience
- Session persistence across page refreshes

### Security Testing
- CSRF attack prevention
- Token validation and storage
- State parameter verification
- Session hijacking prevention

## Implementation Considerations

### Supabase Configuration
- Enable Google OAuth provider in Supabase dashboard
- Configure OAuth redirect URLs for all environments
- Set up proper scopes for user profile access

### Environment Variables
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### Performance Considerations
- Lazy load OAuth libraries
- Optimize callback handling
- Minimize authentication state changes
- Cache user profile data appropriately

### Accessibility
- Ensure OAuth buttons meet WCAG guidelines
- Provide keyboard navigation support
- Include proper ARIA labels
- Support screen readers

### Mobile Considerations
- Handle mobile OAuth redirects properly
- Optimize for touch interfaces
- Ensure responsive design
- Test across mobile browsers