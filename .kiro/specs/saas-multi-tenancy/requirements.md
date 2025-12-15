# Requirements Document

## Introduction

This document specifies the requirements for transforming the existing single-tenant agend4i application into a multi-tenant SaaS platform. The system will support isolated data for multiple businesses (tenants) while allowing public access for their customers to make bookings. The primary goal is to launch "Zeroum Barbearia" as the first paid tenant using Pro Plan features including WhatsApp reminders and Mercado Pago subscription integration.

## Glossary

- **Tenant**: A business entity (e.g., Zeroum Barbearia) that uses the SaaS platform with isolated data
- **SaaS_Platform**: The multi-tenant booking system that serves multiple businesses
- **Public_User**: An unauthenticated customer who can view and create bookings for a specific tenant
- **Tenant_Owner**: An authenticated user with full administrative access to their tenant's data
- **Staff_Member**: An authenticated user with limited access to view their own calendar within a tenant
- **RLS**: Row Level Security - PostgreSQL security feature for data isolation
- **Booking_Slot**: A time period available for appointment scheduling
- **Pro_Plan**: Premium subscription tier with WhatsApp notifications and payment processing
- **Free_Plan**: Basic subscription tier with limited features
- **MP_Integration**: Mercado Pago payment processing integration
- **WhatsApp_Notification**: Automated message sent to customers via WhatsApp API

## Requirements

### Requirement 1

**User Story:** As a public user, I want to book appointments at a specific business without creating an account, so that I can quickly schedule services.

#### Acceptance Criteria

1. WHEN a public user visits a tenant-specific URL (e.g., agendai.clubemkt.digital/zeroum), THE SaaS_Platform SHALL display available booking slots for that tenant
2. WHEN a public user selects a time slot, THE SaaS_Platform SHALL validate availability in real-time before allowing booking creation
3. WHEN a public user submits booking information, THE SaaS_Platform SHALL create a pending booking with their contact details
4. WHEN a booking slot becomes unavailable during selection, THE SaaS_Platform SHALL prevent double-booking and display an error message
5. WHEN a public user completes a booking, THE SaaS_Platform SHALL redirect them to a confirmation page

### Requirement 2

**User Story:** As a tenant owner, I want complete data isolation from other tenants, so that my business information remains private and secure.

#### Acceptance Criteria

1. WHEN accessing tenant data, THE SaaS_Platform SHALL enforce row-level security based on tenant_id
2. WHEN a tenant owner logs in, THE SaaS_Platform SHALL scope all data queries to their specific tenant_id
3. WHEN database operations are performed, THE SaaS_Platform SHALL prevent cross-tenant data access through RLS policies
4. WHEN public users access tenant data, THE SaaS_Platform SHALL resolve tenant_id from URL slug and restrict access accordingly
5. WHEN staff members access the system, THE SaaS_Platform SHALL limit their view to their own calendar within the tenant

### Requirement 3

**User Story:** As a tenant owner, I want to upgrade to a Pro Plan with premium features, so that I can enhance my business operations with automated notifications and payment processing.

#### Acceptance Criteria

1. WHEN a tenant owner initiates a Pro Plan upgrade, THE SaaS_Platform SHALL redirect them to Mercado Pago checkout
2. WHEN a payment is completed, THE SaaS_Platform SHALL update the tenant's subscription status to active
3. WHEN a tenant has an active Pro Plan, THE SaaS_Platform SHALL enable WhatsApp notification features
4. WHEN a tenant has an active Pro Plan, THE SaaS_Platform SHALL enable Mercado Pago payment processing
5. WHEN a tenant's subscription expires, THE SaaS_Platform SHALL downgrade them to Free Plan features

### Requirement 4

**User Story:** As a Pro Plan customer, I want automatic WhatsApp notifications sent to my clients, so that booking confirmations are delivered instantly without manual intervention.

#### Acceptance Criteria

1. WHEN a booking is created for a Pro Plan tenant, THE SaaS_Platform SHALL trigger a WhatsApp notification to the customer
2. WHEN sending WhatsApp notifications, THE SaaS_Platform SHALL include booking details, business name, and appointment time
3. WHEN a tenant is on Free Plan, THE SaaS_Platform SHALL not send WhatsApp notifications
4. WHEN WhatsApp delivery fails, THE SaaS_Platform SHALL log the error and continue normal operation
5. WHEN WhatsApp notifications are sent, THE SaaS_Platform SHALL use the tenant's configured WhatsApp integration

### Requirement 5

**User Story:** As a system administrator, I want robust concurrency control for booking slots, so that double-bookings are prevented even under high load.

#### Acceptance Criteria

1. WHEN multiple users attempt to book the same slot simultaneously, THE SaaS_Platform SHALL allow only one booking to succeed
2. WHEN checking slot availability, THE SaaS_Platform SHALL use database-level locking to prevent race conditions
3. WHEN a booking conflict is detected, THE SaaS_Platform SHALL return an appropriate error message
4. WHEN validating bookings, THE SaaS_Platform SHALL exclude cancelled and no-show appointments from conflict detection
5. WHEN availability checks are performed, THE SaaS_Platform SHALL consider staff_id, tenant_id, and time overlap

### Requirement 6

**User Story:** As a tenant owner, I want to manage subscription billing through Mercado Pago, so that I can handle payments securely and automatically.

#### Acceptance Criteria

1. WHEN creating a subscription, THE SaaS_Platform SHALL generate a Mercado Pago payment preference with tenant identification
2. WHEN processing webhook notifications, THE SaaS_Platform SHALL verify payment authenticity and update subscription status
3. WHEN subscription payments fail, THE SaaS_Platform SHALL update the tenant status to past_due
4. WHEN subscriptions are cancelled, THE SaaS_Platform SHALL downgrade tenant features to Free Plan
5. WHEN handling payment data, THE SaaS_Platform SHALL store only necessary identifiers and not sensitive payment information

### Requirement 7

**User Story:** As a tenant owner, I want feature gating based on my subscription plan, so that I understand which features are available and can upgrade when needed.

#### Acceptance Criteria

1. WHEN a Free Plan tenant accesses Pro features, THE SaaS_Platform SHALL display upgrade prompts
2. WHEN rendering the admin interface, THE SaaS_Platform SHALL disable or blur unavailable features based on plan
3. WHEN a tenant's plan changes, THE SaaS_Platform SHALL immediately reflect feature availability in the UI
4. WHEN displaying billing information, THE SaaS_Platform SHALL show current plan status and available upgrades
5. WHEN Pro features are accessed, THE SaaS_Platform SHALL validate the tenant's subscription status before allowing usage

### Requirement 8

**User Story:** As a system architect, I want clear separation between public booking interface and tenant administration, so that the system maintains security boundaries and user experience clarity.

#### Acceptance Criteria

1. WHEN users access /:slug URLs, THE SaaS_Platform SHALL load the public booking interface for that tenant
2. WHEN users access /app URLs, THE SaaS_Platform SHALL load the authenticated tenant administration interface
3. WHEN routing between modes, THE SaaS_Platform SHALL maintain appropriate authentication and authorization contexts
4. WHEN loading tenant data, THE SaaS_Platform SHALL use different data scoping strategies for public vs authenticated access
5. WHEN errors occur, THE SaaS_Platform SHALL provide appropriate error messages for each interface type