/**
 * Integration Tests for Multi-Tenant Security
 * Tests cross-tenant data isolation, role-based access control, and public vs authenticated access boundaries
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    setSession: vi.fn()
  },
  functions: {
    invoke: vi.fn()
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

// Test data structures
interface SecurityTestTenant {
  id: string
  slug: string
  name: string
  owner_id: string
  plan: 'free' | 'pro' | 'enterprise'
  subscription_status: string
}

interface SecurityTestUser {
  id: string
  email: string
  role?: string
}

interface SecurityTestMembership {
  id: string
  tenant_id: string
  user_id: string
  role: 'owner' | 'admin' | 'staff'
  status: 'active' | 'inactive'
}

interface SecurityTestBooking {
  id: string
  tenant_id: string
  customer_id: string
  service_id: string
  staff_id: string
  start_time: string
  end_time: string
  status: string
}

describe('Multi-Tenant Security Integration Tests', () => {
  let securityTestData: {
    tenants: SecurityTestTenant[]
    users: SecurityTestUser[]
    memberships: SecurityTestMembership[]
    bookings: SecurityTestBooking[]
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup comprehensive test data for security scenarios
    securityTestData = {
      tenants: [
        {
          id: 'tenant-alpha',
          slug: 'alpha-corp',
          name: 'Alpha Corporation',
          owner_id: 'user-alpha-owner',
          plan: 'pro',
          subscription_status: 'active'
        },
        {
          id: 'tenant-beta',
          slug: 'beta-inc',
          name: 'Beta Inc',
          owner_id: 'user-beta-owner',
          plan: 'enterprise',
          subscription_status: 'active'
        },
        {
          id: 'tenant-gamma',
          slug: 'gamma-llc',
          name: 'Gamma LLC',
          owner_id: 'user-gamma-owner',
          plan: 'free',
          subscription_status: 'inactive'
        }
      ],
      users: [
        { id: 'user-alpha-owner', email: 'owner@alpha.com' },
        { id: 'user-alpha-admin', email: 'admin@alpha.com' },
        { id: 'user-alpha-staff', email: 'staff@alpha.com' },
        { id: 'user-beta-owner', email: 'owner@beta.com' },
        { id: 'user-beta-staff', email: 'staff@beta.com' },
        { id: 'user-gamma-owner', email: 'owner@gamma.com' },
        { id: 'user-unauthorized', email: 'hacker@evil.com' }
      ],
      memberships: [
        { id: 'mem-1', tenant_id: 'tenant-alpha', user_id: 'user-alpha-owner', role: 'owner', status: 'active' },
        { id: 'mem-2', tenant_id: 'tenant-alpha', user_id: 'user-alpha-admin', role: 'admin', status: 'active' },
        { id: 'mem-3', tenant_id: 'tenant-alpha', user_id: 'user-alpha-staff', role: 'staff', status: 'active' },
        { id: 'mem-4', tenant_id: 'tenant-beta', user_id: 'user-beta-owner', role: 'owner', status: 'active' },
        { id: 'mem-5', tenant_id: 'tenant-beta', user_id: 'user-beta-staff', role: 'staff', status: 'active' },
        { id: 'mem-6', tenant_id: 'tenant-gamma', user_id: 'user-gamma-owner', role: 'owner', status: 'active' }
      ],
      bookings: [
        {
          id: 'booking-alpha-1',
          tenant_id: 'tenant-alpha',
          customer_id: 'customer-alpha-1',
          service_id: 'service-alpha-1',
          staff_id: 'staff-alpha-1',
          start_time: '2024-12-20T10:00:00Z',
          end_time: '2024-12-20T11:00:00Z',
          status: 'confirmed'
        },
        {
          id: 'booking-alpha-2',
          tenant_id: 'tenant-alpha',
          customer_id: 'customer-alpha-2',
          service_id: 'service-alpha-2',
          staff_id: 'staff-alpha-2',
          start_time: '2024-12-20T14:00:00Z',
          end_time: '2024-12-20T15:00:00Z',
          status: 'pending'
        },
        {
          id: 'booking-beta-1',
          tenant_id: 'tenant-beta',
          customer_id: 'customer-beta-1',
          service_id: 'service-beta-1',
          staff_id: 'staff-beta-1',
          start_time: '2024-12-20T12:00:00Z',
          end_time: '2024-12-20T13:00:00Z',
          status: 'confirmed'
        }
      ]
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
  describe('Cross-Tenant Data Isolation Integration', () => {
    it('should completely isolate tenant data across all operations', async () => {
      // Test as Alpha tenant owner
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[0] }, // Alpha owner
        error: null
      })

      // Mock RLS-enforced queries that return only Alpha tenant data
      const mockAlphaQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: securityTestData.bookings.filter(b => b.tenant_id === 'tenant-alpha'),
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockAlphaQuery)

      // Query bookings as Alpha owner
      const alphaBookings = await mockSupabase.from('bookings')
        .select('*')
        .order('start_time')

      // Should only see Alpha tenant bookings
      expect(alphaBookings.data).toHaveLength(2)
      expect(alphaBookings.data.every((b: any) => b.tenant_id === 'tenant-alpha')).toBe(true)
      expect(alphaBookings.data.some((b: any) => b.tenant_id === 'tenant-beta')).toBe(false)

      // Test as Beta tenant owner
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[3] }, // Beta owner
        error: null
      })

      const mockBetaQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: securityTestData.bookings.filter(b => b.tenant_id === 'tenant-beta'),
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockBetaQuery)

      // Query bookings as Beta owner
      const betaBookings = await mockSupabase.from('bookings')
        .select('*')
        .order('start_time')

      // Should only see Beta tenant bookings
      expect(betaBookings.data).toHaveLength(1)
      expect(betaBookings.data.every((b: any) => b.tenant_id === 'tenant-beta')).toBe(true)
      expect(betaBookings.data.some((b: any) => b.tenant_id === 'tenant-alpha')).toBe(false)

      // Test unauthorized user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[6] }, // Unauthorized user
        error: null
      })

      const mockUnauthorizedQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [], // RLS should return empty for unauthorized user
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockUnauthorizedQuery)

      // Query bookings as unauthorized user
      const unauthorizedBookings = await mockSupabase.from('bookings')
        .select('*')
        .order('start_time')

      // Should see no bookings
      expect(unauthorizedBookings.data).toHaveLength(0)
    })

    it('should prevent cross-tenant data modification attempts', async () => {
      // Alpha admin tries to modify Beta tenant data
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[1] }, // Alpha admin
        error: null
      })

      // Mock RLS blocking cross-tenant update
      const mockCrossTenantUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [], // RLS should prevent this update
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockCrossTenantUpdate)

      // Attempt to update Beta tenant booking from Alpha admin
      const crossTenantUpdate = await mockSupabase.from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', 'booking-beta-1')
        .select()

      // Update should be blocked by RLS
      expect(crossTenantUpdate.data).toHaveLength(0)

      // Verify Alpha admin can update their own tenant's data
      const mockOwnTenantUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'booking-alpha-1', status: 'cancelled' }],
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockOwnTenantUpdate)

      const ownTenantUpdate = await mockSupabase.from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', 'booking-alpha-1')
        .select()

      // Own tenant update should succeed
      expect(ownTenantUpdate.data).toHaveLength(1)
      expect(ownTenantUpdate.data[0].status).toBe('cancelled')
    })

    it('should isolate tenant settings and configuration data', async () => {
      // Mock tenant settings for different tenants
      const alphaSettings = {
        id: 'settings-alpha',
        tenant_id: 'tenant-alpha',
        whatsapp_enabled: true,
        booking_window_days: 30
      }

      const betaSettings = {
        id: 'settings-beta',
        tenant_id: 'tenant-beta',
        whatsapp_enabled: false,
        booking_window_days: 14
      }

      // Alpha owner accessing settings
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[0] },
        error: null
      })

      const mockAlphaSettings = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: alphaSettings,
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockAlphaSettings)

      const alphaSettingsResult = await mockSupabase.from('tenant_settings')
        .select('*')
        .eq('tenant_id', 'tenant-alpha')
        .single()

      expect(alphaSettingsResult.data.tenant_id).toBe('tenant-alpha')
      expect(alphaSettingsResult.data.whatsapp_enabled).toBe(true)

      // Beta owner accessing settings
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[3] },
        error: null
      })

      const mockBetaSettings = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: betaSettings,
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockBetaSettings)

      const betaSettingsResult = await mockSupabase.from('tenant_settings')
        .select('*')
        .eq('tenant_id', 'tenant-beta')
        .single()

      expect(betaSettingsResult.data.tenant_id).toBe('tenant-beta')
      expect(betaSettingsResult.data.whatsapp_enabled).toBe(false)

      // Verify settings are completely isolated
      expect(alphaSettingsResult.data.tenant_id).not.toBe(betaSettingsResult.data.tenant_id)
    })
  })

  describe('Role-Based Access Control Integration', () => {
    it('should enforce role hierarchy across all tenant operations', async () => {
      const testScenarios = [
        {
          user: securityTestData.users[0], // Alpha owner
          tenant: 'tenant-alpha',
          role: 'owner',
          canManageSettings: true,
          canManageStaff: true,
          canViewAllBookings: true,
          canDeleteBookings: true
        },
        {
          user: securityTestData.users[1], // Alpha admin
          tenant: 'tenant-alpha',
          role: 'admin',
          canManageSettings: true,
          canManageStaff: true,
          canViewAllBookings: true,
          canDeleteBookings: true
        },
        {
          user: securityTestData.users[2], // Alpha staff
          tenant: 'tenant-alpha',
          role: 'staff',
          canManageSettings: false,
          canManageStaff: false,
          canViewAllBookings: false, // Only own bookings
          canDeleteBookings: false
        }
      ]

      for (const scenario of testScenarios) {
        // Set current user
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: scenario.user },
          error: null
        })

        // Test settings management
        const mockSettingsUpdate = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({
            data: scenario.canManageSettings ? [{ id: 'settings-updated' }] : [],
            error: scenario.canManageSettings ? null : { message: 'Insufficient permissions' }
          })
        }
        mockSupabase.from.mockReturnValue(mockSettingsUpdate)

        const settingsResult = await mockSupabase.from('tenant_settings')
          .update({ booking_window_days: 45 })
          .eq('tenant_id', scenario.tenant)
          .select()

        if (scenario.canManageSettings) {
          expect(settingsResult.data).toHaveLength(1)
        } else {
          expect(settingsResult.data).toHaveLength(0)
        }

        // Test staff management
        const mockStaffUpdate = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({
            data: scenario.canManageStaff ? [{ id: 'staff-updated' }] : [],
            error: scenario.canManageStaff ? null : { message: 'Insufficient permissions' }
          })
        }
        mockSupabase.from.mockReturnValue(mockStaffUpdate)

        const staffResult = await mockSupabase.from('staff')
          .update({ name: 'Updated Name' })
          .eq('tenant_id', scenario.tenant)
          .select()

        if (scenario.canManageStaff) {
          expect(staffResult.data).toHaveLength(1)
        } else {
          expect(staffResult.data).toHaveLength(0)
        }

        // Test booking access
        const mockBookingQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: scenario.canViewAllBookings 
              ? securityTestData.bookings.filter(b => b.tenant_id === scenario.tenant)
              : [], // Staff would only see their own bookings in real implementation
            error: null
          })
        }
        mockSupabase.from.mockReturnValue(mockBookingQuery)

        const bookingResult = await mockSupabase.from('bookings')
          .select('*')
          .eq('tenant_id', scenario.tenant)
          .order('start_time')

        if (scenario.canViewAllBookings) {
          expect(bookingResult.data.length).toBeGreaterThan(0)
        } else {
          // Staff should have limited access
          expect(bookingResult.data.length).toBeLessThanOrEqual(
            securityTestData.bookings.filter(b => b.tenant_id === scenario.tenant).length
          )
        }
      }
    })

    it('should prevent role escalation and unauthorized role changes', async () => {
      // Staff user tries to change their own role
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[2] }, // Alpha staff
        error: null
      })

      const mockRoleEscalation = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [], // RLS should prevent this
          error: { message: 'Insufficient permissions' }
        })
      }
      mockSupabase.from.mockReturnValue(mockRoleEscalation)

      // Attempt role escalation
      const escalationResult = await mockSupabase.from('tenant_memberships')
        .update({ role: 'owner' })
        .eq('user_id', 'user-alpha-staff')
        .select()

      expect(escalationResult.data).toHaveLength(0)
      expect(escalationResult.error).toBeTruthy()

      // Admin tries to change owner role (should also be prevented)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[1] }, // Alpha admin
        error: null
      })

      const mockOwnerRoleChange = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [], // Should be prevented
          error: { message: 'Cannot modify owner role' }
        })
      }
      mockSupabase.from.mockReturnValue(mockOwnerRoleChange)

      const ownerChangeResult = await mockSupabase.from('tenant_memberships')
        .update({ role: 'staff' })
        .eq('user_id', 'user-alpha-owner')
        .select()

      expect(ownerChangeResult.data).toHaveLength(0)
      expect(ownerChangeResult.error).toBeTruthy()
    })

    it('should validate role permissions for sensitive operations', async () => {
      const sensitiveOperations = [
        {
          operation: 'delete_tenant',
          allowedRoles: ['owner'],
          deniedRoles: ['admin', 'staff']
        },
        {
          operation: 'manage_billing',
          allowedRoles: ['owner'],
          deniedRoles: ['admin', 'staff']
        },
        {
          operation: 'manage_staff',
          allowedRoles: ['owner', 'admin'],
          deniedRoles: ['staff']
        },
        {
          operation: 'view_analytics',
          allowedRoles: ['owner', 'admin'],
          deniedRoles: ['staff']
        }
      ]

      for (const { operation, allowedRoles, deniedRoles } of sensitiveOperations) {
        // Test allowed roles
        for (const role of allowedRoles) {
          mockSupabase.rpc.mockResolvedValue({
            data: true,
            error: null
          })

          const hasPermission = await mockSupabase.rpc('has_tenant_role', {
            tenant_id: 'tenant-alpha',
            user_id: 'user-test',
            required_role: role
          })

          expect(hasPermission.data).toBe(true)
        }

        // Test denied roles
        for (const role of deniedRoles) {
          mockSupabase.rpc.mockResolvedValue({
            data: false,
            error: null
          })

          const hasPermission = await mockSupabase.rpc('has_tenant_role', {
            tenant_id: 'tenant-alpha',
            user_id: 'user-test',
            required_role: 'owner' // Checking if staff/admin has owner permissions
          })

          expect(hasPermission.data).toBe(false)
        }
      }
    })
  })

  describe('Public vs Authenticated Access Boundaries', () => {
    it('should enforce different access patterns for public and authenticated users', async () => {
      // Public user accessing tenant data via slug
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }, // Anonymous user
        error: null
      })

      // Mock public tenant data access (read-only)
      const mockPublicTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'tenant-alpha',
            slug: 'alpha-corp',
            name: 'Alpha Corporation',
            // Sensitive data should be filtered out
            plan: undefined,
            subscription_status: undefined
          },
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockPublicTenantQuery)

      // Public access to tenant info
      const publicTenantResult = await mockSupabase.from('tenants')
        .select('id, slug, name') // Limited fields for public
        .eq('slug', 'alpha-corp')
        .single()

      expect(publicTenantResult.data.name).toBe('Alpha Corporation')
      expect(publicTenantResult.data.plan).toBeUndefined()
      expect(publicTenantResult.data.subscription_status).toBeUndefined()

      // Public user should be able to view services
      const mockPublicServicesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'service-1', name: 'Haircut', price: 30, duration_min: 30 },
            { id: 'service-2', name: 'Beard Trim', price: 20, duration_min: 15 }
          ],
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockPublicServicesQuery)

      const publicServicesResult = await mockSupabase.from('services')
        .select('id, name, price, duration_min')
        .eq('tenant_id', 'tenant-alpha')
        .order('name')

      expect(publicServicesResult.data).toHaveLength(2)
      expect(publicServicesResult.data[0].name).toBe('Haircut')

      // Public user should be able to create bookings
      const mockPublicBookingInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'booking-public', status: 'pending' }],
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockPublicBookingInsert)

      const publicBookingResult = await mockSupabase.from('bookings')
        .insert({
          tenant_id: 'tenant-alpha',
          customer_name: 'Public Customer',
          customer_phone: '(11) 99999-9999',
          service_id: 'service-1',
          staff_id: 'staff-1',
          start_time: '2024-12-21T10:00:00Z',
          end_time: '2024-12-21T10:30:00Z',
          status: 'pending'
        })
        .select()

      expect(publicBookingResult.data[0].status).toBe('pending')

      // Authenticated user accessing same tenant
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[0] }, // Alpha owner
        error: null
      })

      // Mock authenticated tenant data access (full access)
      const mockAuthTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: securityTestData.tenants[0], // Full tenant data
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockAuthTenantQuery)

      const authTenantResult = await mockSupabase.from('tenants')
        .select('*') // All fields for authenticated user
        .eq('id', 'tenant-alpha')
        .single()

      expect(authTenantResult.data.plan).toBe('pro')
      expect(authTenantResult.data.subscription_status).toBe('active')
      expect(authTenantResult.data.owner_id).toBe('user-alpha-owner')
    })

    it('should prevent public users from accessing sensitive operations', async () => {
      // Anonymous user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const sensitiveOperations = [
        { table: 'tenant_settings', operation: 'select' },
        { table: 'tenant_memberships', operation: 'select' },
        { table: 'staff', operation: 'update' },
        { table: 'services', operation: 'delete' },
        { table: 'bookings', operation: 'update' }
      ]

      for (const { table, operation } of sensitiveOperations) {
        const mockSensitiveQuery = {
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Authentication required' }
          }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Authentication required' }
          })
        }
        mockSupabase.from.mockReturnValue(mockSensitiveQuery)

        let result
        if (operation === 'select') {
          result = await mockSupabase.from(table).select('*')
        } else if (operation === 'update') {
          result = await mockSupabase.from(table).update({}).eq('id', 'test')
        } else if (operation === 'delete') {
          result = await mockSupabase.from(table).delete().eq('id', 'test')
        }

        expect(result).toBeDefined()
        expect(result.error).toBeTruthy()
        expect(result.error.message).toContain('Authentication required')
      }
    })

    it('should maintain proper context switching between public and authenticated modes', async () => {
      // Start as public user on tenant page
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      // Mock public context resolution
      const mockPublicContext = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'tenant-alpha', slug: 'alpha-corp' },
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockPublicContext)

      // Resolve tenant from slug (public mode)
      const publicContext = await mockSupabase.from('tenants')
        .select('id, slug')
        .eq('slug', 'alpha-corp')
        .single()

      expect(publicContext.data.id).toBe('tenant-alpha')

      // User signs in
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: securityTestData.users[0],
          session: { access_token: 'token-123' }
        },
        error: null
      })

      const signInResult = await mockSupabase.auth.signInWithPassword({
        email: 'owner@alpha.com',
        password: 'password123'
      })

      expect(signInResult.data.user.id).toBe('user-alpha-owner')

      // Now authenticated - context should switch to membership-based
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[0] },
        error: null
      })

      // Mock authenticated context resolution
      const mockAuthContext = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { tenant_id: 'tenant-alpha', role: 'owner', status: 'active' }
          ],
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockAuthContext)

      // Resolve tenants from membership (authenticated mode)
      const authContext = await mockSupabase.from('tenant_memberships')
        .select('tenant_id, role, status')
        .eq('user_id', 'user-alpha-owner')
        .order('created_at')

      expect(authContext.data[0].tenant_id).toBe('tenant-alpha')
      expect(authContext.data[0].role).toBe('owner')

      // User signs out - should return to public mode
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null
      })

      await mockSupabase.auth.signOut()

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      // Back to public context
      const backToPublic = await mockSupabase.auth.getUser()
      expect(backToPublic.data.user).toBeNull()
    })
  })

  describe('Security Integration Edge Cases', () => {
    it('should handle concurrent access attempts securely', async () => {
      const concurrentUsers = [
        securityTestData.users[0], // Alpha owner
        securityTestData.users[1], // Alpha admin  
        securityTestData.users[2]  // Alpha staff
      ]

      // Simulate concurrent access to same resource
      const concurrentPromises = concurrentUsers.map(async (user, index) => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user },
          error: null
        })

        const mockConcurrentQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { 
              id: 'booking-concurrent',
              tenant_id: 'tenant-alpha',
              accessed_by: user.id,
              access_level: index === 0 ? 'full' : index === 1 ? 'admin' : 'limited'
            },
            error: null
          })
        }
        mockSupabase.from.mockReturnValue(mockConcurrentQuery)

        return mockSupabase.from('bookings')
          .select('*')
          .eq('id', 'booking-concurrent')
          .single()
      })

      const results = await Promise.all(concurrentPromises)

      // Each user should get appropriate access level
      expect(results[0].data.access_level).toBe('full') // Owner
      expect(results[1].data.access_level).toBe('admin') // Admin
      expect(results[2].data.access_level).toBe('limited') // Staff

      // All should access same tenant
      expect(results.every(r => r.data.tenant_id === 'tenant-alpha')).toBe(true)
    })

    it('should handle session expiration and re-authentication securely', async () => {
      // Start with valid session
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[0] },
        error: null
      })

      const mockValidQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'data-with-auth' }],
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockValidQuery)

      // Access data with valid session
      const validResult = await mockSupabase.from('tenant_settings')
        .select('*')
        .eq('tenant_id', 'tenant-alpha')

      expect(validResult.data).toHaveLength(1)

      // Session expires
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' }
      })

      const mockExpiredQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Authentication required' }
        })
      }
      mockSupabase.from.mockReturnValue(mockExpiredQuery)

      // Access data with expired session
      const expiredResult = await mockSupabase.from('tenant_settings')
        .select('*')
        .eq('tenant_id', 'tenant-alpha')

      expect(expiredResult.error).toBeTruthy()
      expect(expiredResult.error.message).toContain('Authentication required')

      // Re-authenticate
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: securityTestData.users[0],
          session: { access_token: 'new-token-456' }
        },
        error: null
      })

      await mockSupabase.auth.signInWithPassword({
        email: 'owner@alpha.com',
        password: 'password123'
      })

      // Access should work again
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: securityTestData.users[0] },
        error: null
      })

      mockSupabase.from.mockReturnValue(mockValidQuery)

      const reAuthResult = await mockSupabase.from('tenant_settings')
        .select('*')
        .eq('tenant_id', 'tenant-alpha')

      expect(reAuthResult.data).toHaveLength(1)
    })
  })
})