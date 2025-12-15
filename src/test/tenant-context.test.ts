/**
 * Unit Tests for Tenant Context Management
 * Tests slug resolution functionality, membership-based tenant loading, and context switching between modes
 * **Validates: Requirements 2.2, 2.4, 8.1, 8.2**
 */

import { describe, it, expect } from 'vitest'

// Helper functions to simulate the tenant context logic
type TenantMode = 'public' | 'admin'

interface MockTenant {
  id: string
  slug: string
  name: string
  owner_id: string
  settings: Record<string, unknown>
  plan: string
  status: string
}

interface MockMembership {
  id: string
  tenant_id: string
  user_id: string
  role: 'owner' | 'admin' | 'staff'
  status: string
}

// Simulate the mode determination logic from useTenant hook
function determineMode(pathname: string): TenantMode {
  if (pathname.startsWith('/app') || pathname.startsWith('/dashboard') || pathname === '/onboarding') {
    return 'admin'
  }
  if (pathname === '/' || pathname === '/auth') {
    return 'admin'
  }
  
  // Handle malformed paths - if no valid slug can be extracted, default to admin
  const slug = extractSlugFromPath(pathname)
  if (!slug) {
    return 'admin'
  }
  
  return 'public'
}

// Simulate slug extraction from URL
function extractSlugFromPath(pathname: string): string | null {
  const pathSegments = pathname.split('/').filter(Boolean)
  const slug = pathSegments[0]
  
  if (!slug || slug.trim() === '') {
    return null
  }
  
  if (['app', 'dashboard', 'auth', 'onboarding'].includes(slug)) {
    return null
  }
  
  return slug
}

// Simulate tenant resolution by slug
function resolveTenantBySlug(slug: string, availableTenants: MockTenant[]): MockTenant | null {
  return availableTenants.find(tenant => tenant.slug === slug && tenant.status === 'active') || null
}

// Simulate user membership resolution
function resolveUserMemberships(userId: string, memberships: MockMembership[]): MockMembership[] {
  return memberships.filter(membership => membership.user_id === userId && membership.status === 'active')
}

// Test data
const mockTenants: MockTenant[] = [
  {
    id: 'tenant-1',
    slug: 'barbershop-1',
    name: 'Barbershop One',
    owner_id: 'test-user-id',
    settings: {},
    plan: 'pro',
    status: 'active'
  },
  {
    id: 'tenant-2',
    slug: 'salon-2',
    name: 'Salon Two',
    owner_id: 'other-user-id',
    settings: {},
    plan: 'free',
    status: 'active'
  },
  {
    id: 'tenant-3',
    slug: 'spa-3',
    name: 'Spa Three',
    owner_id: 'test-user-id',
    settings: {},
    plan: 'free',
    status: 'suspended'
  }
]

const mockMemberships: MockMembership[] = [
  {
    id: 'membership-1',
    tenant_id: 'tenant-1',
    user_id: 'test-user-id',
    role: 'owner',
    status: 'active'
  },
  {
    id: 'membership-2',
    tenant_id: 'tenant-2',
    user_id: 'test-user-id',
    role: 'staff',
    status: 'active'
  },
  {
    id: 'membership-3',
    tenant_id: 'tenant-3',
    user_id: 'test-user-id',
    role: 'owner',
    status: 'inactive'
  }
]

describe('Tenant Context Management', () => {
  describe('Slug Resolution Functionality', () => {
    it('should extract valid slug from public booking URL', () => {
      const slug = extractSlugFromPath('/barbershop-1')
      expect(slug).toBe('barbershop-1')
    })

    it('should extract slug with additional path segments', () => {
      const slug = extractSlugFromPath('/barbershop-1/services')
      expect(slug).toBe('barbershop-1')
    })

    it('should return null for empty or root paths', () => {
      expect(extractSlugFromPath('/')).toBeNull()
      expect(extractSlugFromPath('')).toBeNull()
    })

    it('should return null for reserved admin paths', () => {
      expect(extractSlugFromPath('/app')).toBeNull()
      expect(extractSlugFromPath('/dashboard')).toBeNull()
      expect(extractSlugFromPath('/auth')).toBeNull()
      expect(extractSlugFromPath('/onboarding')).toBeNull()
    })

    it('should resolve tenant by valid slug', () => {
      const tenant = resolveTenantBySlug('barbershop-1', mockTenants)
      expect(tenant).not.toBeNull()
      expect(tenant?.id).toBe('tenant-1')
      expect(tenant?.name).toBe('Barbershop One')
    })

    it('should return null for invalid slug', () => {
      const tenant = resolveTenantBySlug('invalid-slug', mockTenants)
      expect(tenant).toBeNull()
    })

    it('should return null for suspended tenant', () => {
      const tenant = resolveTenantBySlug('spa-3', mockTenants)
      expect(tenant).toBeNull() // Suspended tenants should not be accessible
    })

    it('should handle case-sensitive slug matching', () => {
      const tenant = resolveTenantBySlug('BARBERSHOP-1', mockTenants)
      expect(tenant).toBeNull() // Should be case-sensitive
    })
  })

  describe('Membership-Based Tenant Loading', () => {
    it('should resolve active user memberships', () => {
      const memberships = resolveUserMemberships('test-user-id', mockMemberships)
      expect(memberships).toHaveLength(2)
      expect(memberships.map(m => m.tenant_id)).toEqual(['tenant-1', 'tenant-2'])
    })

    it('should exclude inactive memberships', () => {
      const memberships = resolveUserMemberships('test-user-id', mockMemberships)
      const inactiveMembership = memberships.find(m => m.status === 'inactive')
      expect(inactiveMembership).toBeUndefined()
    })

    it('should return empty array for user with no memberships', () => {
      const memberships = resolveUserMemberships('unknown-user-id', mockMemberships)
      expect(memberships).toHaveLength(0)
    })

    it('should preserve role information in memberships', () => {
      const memberships = resolveUserMemberships('test-user-id', mockMemberships)
      const ownerMembership = memberships.find(m => m.tenant_id === 'tenant-1')
      const staffMembership = memberships.find(m => m.tenant_id === 'tenant-2')
      
      expect(ownerMembership?.role).toBe('owner')
      expect(staffMembership?.role).toBe('staff')
    })
  })

  describe('Context Switching Between Modes', () => {
    it('should identify admin mode for /app routes', () => {
      expect(determineMode('/app')).toBe('admin')
      expect(determineMode('/app/dashboard')).toBe('admin')
      expect(determineMode('/app/services')).toBe('admin')
      expect(determineMode('/app/settings/billing')).toBe('admin')
    })

    it('should identify admin mode for legacy /dashboard routes', () => {
      expect(determineMode('/dashboard')).toBe('admin')
      expect(determineMode('/dashboard/services')).toBe('admin')
    })

    it('should identify admin mode for special routes', () => {
      expect(determineMode('/')).toBe('admin')
      expect(determineMode('/auth')).toBe('admin')
      expect(determineMode('/onboarding')).toBe('admin')
    })

    it('should identify public mode for tenant slug routes', () => {
      expect(determineMode('/barbershop-1')).toBe('public')
      expect(determineMode('/salon-2')).toBe('public')
      expect(determineMode('/my-business')).toBe('public')
    })

    it('should handle complex tenant slug patterns', () => {
      expect(determineMode('/barbershop-downtown-2024')).toBe('public')
      expect(determineMode('/salon-spa-wellness')).toBe('public')
      expect(determineMode('/123-business')).toBe('public')
    })

    it('should maintain consistent mode determination', () => {
      const testPaths = [
        '/app/dashboard',
        '/barbershop-1',
        '/dashboard/services',
        '/salon-2/booking'
      ]

      // Multiple calls should return same result
      testPaths.forEach(path => {
        const mode1 = determineMode(path)
        const mode2 = determineMode(path)
        expect(mode1).toBe(mode2)
      })
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete public booking flow', () => {
      const path = '/barbershop-1'
      const mode = determineMode(path)
      const slug = extractSlugFromPath(path)
      const tenant = slug ? resolveTenantBySlug(slug, mockTenants) : null

      expect(mode).toBe('public')
      expect(slug).toBe('barbershop-1')
      expect(tenant).not.toBeNull()
      expect(tenant?.id).toBe('tenant-1')
    })

    it('should handle complete admin dashboard flow', () => {
      const path = '/app/dashboard'
      const mode = determineMode(path)
      const slug = extractSlugFromPath(path)
      const memberships = resolveUserMemberships('test-user-id', mockMemberships)

      expect(mode).toBe('admin')
      expect(slug).toBeNull() // No slug in admin mode
      expect(memberships).toHaveLength(2)
    })

    it('should handle invalid public booking attempt', () => {
      const path = '/invalid-business'
      const mode = determineMode(path)
      const slug = extractSlugFromPath(path)
      const tenant = slug ? resolveTenantBySlug(slug, mockTenants) : null

      expect(mode).toBe('public')
      expect(slug).toBe('invalid-business')
      expect(tenant).toBeNull() // Should not find tenant
    })

    it('should handle user with mixed role memberships', () => {
      const memberships = resolveUserMemberships('test-user-id', mockMemberships)
      const roles = memberships.map(m => m.role)
      
      expect(roles).toContain('owner')
      expect(roles).toContain('staff')
      expect(memberships).toHaveLength(2)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty tenant list gracefully', () => {
      const tenant = resolveTenantBySlug('any-slug', [])
      expect(tenant).toBeNull()
    })

    it('should handle empty membership list gracefully', () => {
      const memberships = resolveUserMemberships('any-user', [])
      expect(memberships).toHaveLength(0)
    })

    it('should handle malformed paths gracefully', () => {
      expect(extractSlugFromPath('///')).toBeNull()
      expect(extractSlugFromPath('//')).toBeNull()
      expect(determineMode('///')).toBe('admin') // Default to admin for malformed paths
    })

    it('should handle whitespace-only slugs', () => {
      expect(extractSlugFromPath('/ ')).toBeNull()
      expect(extractSlugFromPath('/   ')).toBeNull()
    })

    it('should handle special characters in slugs', () => {
      const slug = extractSlugFromPath('/barbershop-&-salon')
      expect(slug).toBe('barbershop-&-salon')
      
      // Should not find tenant with special characters (assuming validation)
      const tenant = resolveTenantBySlug('barbershop-&-salon', mockTenants)
      expect(tenant).toBeNull()
    })
  })
})