# Design Document

## Overview

This design document outlines the architecture for transforming the existing single-tenant agend4i application into a multi-tenant SaaS platform. The system will support isolated data for multiple businesses while enabling public booking access and premium features through subscription tiers.

The architecture leverages Supabase's Row Level Security (RLS) for data isolation, implements dual routing modes (public vs authenticated), and integrates with external services (Mercado Pago, WhatsApp) for premium functionality.

## Architecture

### Multi-Tenancy Strategy

**Data Isolation Approach**: Shared Database with Row Level Security (RLS)
- All tenant data shares the same database tables
- Each table includes a `tenant_id` column for data scoping
- RLS policies enforce automatic data filtering based on context
- Public access uses URL slug resolution to determine tenant context
- Authenticated access uses user membership to determine tenant context

**Routing Architecture**:
```
/:slug (Public Mode)
├── Public booking interface
├── Tenant resolution via slug
└── Anonymous user context

/app (Admin Mode)  
├── Authenticated tenant administration
├── Tenant resolution via user membership
└── Authenticated user context
```

### Security Model

**Authentication Contexts**:
1. **Anonymous (Public)**: Can view tenant data and create pending bookings
2. **Authenticated Staff**: Can view own calendar within tenant scope
3. **Authenticated Admin**: Can manage all tenant data
4. **Authenticated Owner**: Full tenant administration access

**Data Scoping Functions**:
- `is_tenant_member(tenant_id)`: Validates user membership
- `has_tenant_role(tenant_id, role)`: Validates role-based permissions
- `get_user_tenant_ids()`: Returns accessible tenant IDs for user

## Components and Interfaces

### Frontend Components

**Public Booking Interface** (`src/pages/PublicBooking.tsx`):
- Tenant-specific booking form
- Real-time availability checking
- Guest customer data collection
- Booking confirmation flow

**Tenant Context Provider** (`src/hooks/useTenant.tsx`):
- Dual-mode tenant resolution (slug vs membership)
- Context switching between public and admin modes
- Tenant data caching and state management

**Admin Dashboard** (`src/pages/Dashboard.tsx`):
- Feature gating based on subscription plan
- Subscription management interface
- Tenant settings and configuration

### Backend Services

**Availability Checking Service** (Database Function):
```sql
check_availability(tenant_id, staff_id, start_time, end_time) -> boolean
```
- Atomic availability validation
- Prevents double-booking through database-level locking
- Excludes cancelled/no-show bookings from conflicts

**WhatsApp Notification Service** (`supabase/functions/notify-whatsapp`):
- Triggered by booking creation webhook
- Plan-based feature gating
- Integration with Evolution API/Twilio
- Message templating with booking details

**Payment Processing Service** (`supabase/functions/mp-checkout`):
- Mercado Pago subscription creation
- Webhook handling for payment events
- Subscription status management
- Plan upgrade/downgrade logic

## Data Models

### Enhanced Tenant Model
```typescript
interface Tenant {
  id: string;
  slug: string; // URL identifier (e.g., "zeroum")
  name: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'inactive';
  mp_payer_id?: string; // Mercado Pago integration
  mp_subscription_id?: string;
  settings: TenantSettings;
  status: 'active' | 'suspended' | 'archived';
}
```

### Public Booking Model
```typescript
interface PublicBooking {
  tenant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  staff_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: 'pending'; // Always pending for public bookings
  notes?: string;
}
```

### Subscription Integration Model
```typescript
interface SubscriptionData {
  tenant_id: string;
  mp_payer_id: string;
  mp_subscription_id: string;
  plan: 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'cancelled';
  next_billing_date: string;
  amount: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After reviewing the prework analysis, several properties can be consolidated to eliminate redundancy and provide comprehensive validation:

**Property 1: Tenant data isolation**
*For any* database query with tenant context, all returned data should belong only to the specified tenant_id, regardless of access mode (public slug or authenticated membership)
**Validates: Requirements 2.1, 2.2, 2.4**

**Property 2: Booking availability validation**
*For any* booking request, the availability check should return false if there exists a conflicting booking (same staff, overlapping time, non-cancelled status) within the same tenant
**Validates: Requirements 1.2, 5.4, 5.5**

**Property 3: Concurrent booking prevention**
*For any* two simultaneous booking attempts for the same time slot and staff member, only one booking should succeed and be persisted to the database
**Validates: Requirements 1.4, 5.1**

**Property 4: Public booking creation**
*For any* valid public booking submission, a new booking record should be created with status 'pending' and the provided customer information
**Validates: Requirements 1.3**

**Property 5: Role-based data access**
*For any* authenticated user, data queries should be scoped to only tenants where they have active membership, and further filtered by their role permissions
**Validates: Requirements 2.3, 2.5**

**Property 6: Feature gating by subscription plan**
*For any* tenant accessing premium features (WhatsApp notifications, payment processing), the feature should be available if and only if the tenant has an active Pro or Enterprise subscription
**Validates: Requirements 3.3, 3.4, 7.5**

**Property 7: Subscription lifecycle management**
*For any* subscription status change (payment success, failure, cancellation), the tenant's plan and feature availability should be updated accordingly within the same transaction
**Validates: Requirements 3.2, 3.5, 6.3, 6.4**

**Property 8: WhatsApp notification triggering**
*For any* booking created for a Pro Plan tenant, a WhatsApp notification should be triggered if and only if the tenant has active Pro subscription and valid WhatsApp configuration
**Validates: Requirements 4.1, 4.3**

**Property 9: Payment integration security**
*For any* payment-related operation, only non-sensitive identifiers should be stored in the database, and all webhook authenticity should be verified before processing
**Validates: Requirements 6.1, 6.2, 6.5**

**Property 10: Interface routing consistency**
*For any* URL access pattern, the correct interface (public booking vs admin) should be loaded based on the URL structure (/:slug vs /app) with appropriate tenant context
**Validates: Requirements 8.1, 8.2, 8.4**

## Error Handling

### Database-Level Error Handling
- **RLS Policy Violations**: Return 403 Forbidden with tenant isolation message
- **Booking Conflicts**: Return 409 Conflict with availability information
- **Invalid Tenant Slugs**: Return 404 Not Found with suggestion for valid slugs
- **Subscription Validation Failures**: Return 402 Payment Required with upgrade information

### API Error Handling
- **WhatsApp API Failures**: Log error, continue booking process, notify admin
- **Mercado Pago API Failures**: Return payment error, maintain booking in pending state
- **Webhook Authentication Failures**: Log security event, return 401 Unauthorized
- **Rate Limiting**: Return 429 Too Many Requests with retry information

### Frontend Error Handling
- **Network Failures**: Display retry mechanism with exponential backoff
- **Authentication Errors**: Redirect to login with return URL preservation
- **Feature Access Denied**: Show upgrade prompt with clear feature comparison
- **Booking Conflicts**: Display alternative time slots with real-time availability

## Testing Strategy

### Unit Testing Approach
Unit tests will focus on specific component behavior and integration points:

- **Tenant Resolution Logic**: Test slug-to-tenant mapping and membership-based resolution
- **Availability Calculation**: Test booking conflict detection with various scenarios
- **Feature Gating Components**: Test UI component behavior based on subscription status
- **Payment Integration**: Test webhook processing and subscription status updates
- **Error Boundary Behavior**: Test graceful degradation and error recovery

### Property-Based Testing Approach
Property-based tests will verify universal behaviors across all valid inputs using **fast-check** library for TypeScript/JavaScript. Each test will run a minimum of 100 iterations to ensure comprehensive coverage:

- **Data Isolation Properties**: Generate random tenant/user combinations and verify data scoping
- **Booking Conflict Properties**: Generate random booking scenarios and verify availability logic
- **Subscription Management Properties**: Generate random subscription events and verify state transitions
- **Security Properties**: Generate various access attempts and verify authorization enforcement
- **API Integration Properties**: Generate random webhook payloads and verify processing correctness

### Integration Testing Strategy
- **Database RLS Testing**: Verify policies prevent cross-tenant access under all conditions
- **Payment Flow Testing**: Test complete subscription lifecycle with Mercado Pago sandbox
- **WhatsApp Integration Testing**: Verify notification delivery with test phone numbers
- **Multi-User Concurrency Testing**: Simulate concurrent booking attempts with load testing tools

### Performance Testing Considerations
- **Database Query Performance**: Monitor RLS policy impact on query execution time
- **Concurrent Booking Load**: Test system behavior under high booking volume
- **Webhook Processing Speed**: Ensure payment webhooks are processed within acceptable timeframes
- **Public Interface Responsiveness**: Verify public booking pages load quickly without authentication overhead