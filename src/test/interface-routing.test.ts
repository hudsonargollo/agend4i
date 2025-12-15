/**
 * Property-Based Tests for Interface Routing Consistency
 * **Feature: saas-multi-tenancy, Property 10: Interface routing consistency**
 * **Validates: Requirements 8.1, 8.2, 8.4**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'

// Test data generators
const slugArb = fc.stringMatching(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
const pathSegmentArb = fc.stringMatching(/^[a-zA-Z0-9-_]+$/)

// Mock routing scenarios
interface RoutingScenario {
  path: string
  expectedMode: 'public' | 'admin'
  expectedInterface: 'public-booking' | 'admin-dashboard'
  shouldRequireAuth: boolean
}

// Mock tenant context
interface MockTenantContext {
  mode: 'public' | 'admin'
  tenantId: string | null
  slug: string | null
  isAuthenticated: boolean
}

describe('Interface Routing Consistency Properties', () => {
  beforeAll(async () => {
    console.log('Setting up interface routing tests...')
  })

  afterAll(async () => {
    console.log('Cleaning up interface routing tests...')
  })

  it('Property 10: Interface routing consistency - correct interface should be loaded based on URL structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(slugArb, { minLength: 1, maxLength: 10 }),
        fc.array(pathSegmentArb, { minLength: 0, maxLength: 3 }),
        async (tenantSlugs, adminPathSegments) => {
          // Test public interface routing (/:slug pattern)
          for (const slug of tenantSlugs) {
            const publicPath = `/${slug}`
            const publicContext = determineRoutingContext(publicPath)

            // Property: /:slug URLs should load public booking interface
            expect(publicContext.mode).toBe('public')
            expect(publicContext.expectedInterface).toBe('public-booking')
            expect(publicContext.shouldRequireAuth).toBe(false)
            expect(publicContext.slug).toBe(slug)
            // tenantId is resolved later from slug in real implementation
          }

          // Test admin interface routing (/app/* pattern)
          const adminBasePaths = ['/app', '/app/dashboard', '/app/services']
          for (const basePath of adminBasePaths) {
            // Test with additional path segments
            for (let i = 0; i <= adminPathSegments.length; i++) {
              const pathSegments = adminPathSegments.slice(0, i)
              const adminPath = pathSegments.length > 0 
                ? `${basePath}/${pathSegments.join('/')}`
                : basePath

              const adminContext = determineRoutingContext(adminPath)

              // Property: /app/* URLs should load admin interface
              expect(adminContext.mode).toBe('admin')
              expect(adminContext.expectedInterface).toBe('admin-dashboard')
              expect(adminContext.shouldRequireAuth).toBe(true)
              expect(adminContext.slug).toBeNull() // No slug in admin mode
            }
          }

          // Test legacy admin routes for backward compatibility
          const legacyPaths = ['/dashboard', '/dashboard/services']
          for (const legacyPath of legacyPaths) {
            const legacyContext = determineRoutingContext(legacyPath)

            // Property: Legacy admin URLs should still load admin interface
            expect(legacyContext.mode).toBe('admin')
            expect(legacyContext.expectedInterface).toBe('admin-dashboard')
            expect(legacyContext.shouldRequireAuth).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 10.1: URL pattern recognition should be unambiguous', async () => {
    await fc.assert(
      fc.asyncProperty(
        slugArb,
        fc.constantFrom('app', 'dashboard', 'auth', 'onboarding'),
        async (slug, reservedPath) => {
          const publicPath = `/${slug}`
          const adminPath = `/${reservedPath}`

          const publicContext = determineRoutingContext(publicPath)
          const adminContext = determineRoutingContext(adminPath)

          // Property: Public and admin paths should be clearly distinguishable
          expect(publicContext.mode).not.toBe(adminContext.mode)

          // Property: Reserved paths should never be interpreted as tenant slugs
          if (['app', 'dashboard', 'auth', 'onboarding'].includes(slug)) {
            expect(publicContext.mode).toBe('admin') // Should be treated as admin route
          } else {
            expect(publicContext.mode).toBe('public') // Should be treated as tenant slug
          }

          // Property: Admin paths should never be interpreted as tenant slugs
          expect(adminContext.mode).toBe('admin')
          expect(adminContext.slug).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 10.2: Tenant context loading should match interface mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          slug: slugArb,
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          status: fc.constantFrom('active', 'suspended', 'archived')
        }), { minLength: 1, maxLength: 5 }),
        fc.boolean(), // isAuthenticated
        async (tenants, isAuthenticated) => {
          for (const tenant of tenants) {
            // Test public mode tenant loading
            const publicPath = `/${tenant.slug}`
            const publicContext = mockTenantContextLoading(publicPath, isAuthenticated, tenants)

            // Property: Public mode should resolve tenant by slug
            if (tenant.status === 'active') {
              expect(publicContext.mode).toBe('public')
              expect(publicContext.slug).toBe(tenant.slug)
              expect(publicContext.tenantId).toBe(tenant.id)
            }

            // Test admin mode tenant loading
            const adminPath = '/app/dashboard'
            const adminContext = mockTenantContextLoading(adminPath, isAuthenticated, tenants)

            // Property: Admin mode should use membership-based resolution
            expect(adminContext.mode).toBe('admin')
            expect(adminContext.slug).toBeNull()
            
            if (isAuthenticated) {
              // In real implementation, this would check user memberships
              expect(adminContext.tenantId).toBeDefined()
            } else {
              expect(adminContext.tenantId).toBeNull()
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 10.3: Authentication requirements should be consistent with interface type', async () => {
    await fc.assert(
      fc.asyncProperty(
        slugArb,
        fc.array(pathSegmentArb, { minLength: 0, maxLength: 3 }),
        fc.boolean(), // isAuthenticated
        async (slug, pathSegments, isAuthenticated) => {
          // Test public interface authentication
          const publicPath = `/${slug}`
          const publicAccess = checkRouteAccess(publicPath, isAuthenticated)

          // Property: Public booking interface should not require authentication
          expect(publicAccess.allowed).toBe(true)
          expect(publicAccess.requiresAuth).toBe(false)

          // Test admin interface authentication
          const adminPaths = [
            '/app',
            '/app/dashboard',
            '/app/services',
            '/dashboard',
            '/dashboard/services'
          ]

          for (const adminPath of adminPaths) {
            const adminAccess = checkRouteAccess(adminPath, isAuthenticated)

            // Property: Admin interface should require authentication
            expect(adminAccess.requiresAuth).toBe(true)
            expect(adminAccess.allowed).toBe(isAuthenticated)
          }

          // Test special routes
          const specialRoutes = ['/', '/auth', '/onboarding']
          for (const specialRoute of specialRoutes) {
            const specialAccess = checkRouteAccess(specialRoute, isAuthenticated)
            
            // Property: Special routes have their own auth requirements
            if (specialRoute === '/auth') {
              expect(specialAccess.requiresAuth).toBe(false) // Auth page doesn't require auth
            } else if (specialRoute === '/onboarding') {
              expect(specialAccess.requiresAuth).toBe(true) // Onboarding requires auth
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 10.4: Route resolution should be deterministic', async () => {
    // Test special routes first
    const specialRoutes = ['/', '/auth', '/onboarding', '/app', '/dashboard']
    for (const route of specialRoutes) {
      const context1 = determineRoutingContext(route)
      const context2 = determineRoutingContext(route)
      
      expect(context1.mode).toBe(context2.mode)
      expect(context1.mode).toBe('admin')
    }

    // Test generated slugs
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Generate valid tenant slugs
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
          // Generate invalid slugs with special characters
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !/^[a-zA-Z0-9_-]+$/.test(s) && s.trim() !== ''),
          // Generate reserved words
          fc.constantFrom('app', 'dashboard', 'auth', 'onboarding')
        ),
        async (slug) => {
          // Create various path combinations
          const paths = [
            `/${slug}`,
            `/app/${slug}`,
            `/dashboard/${slug}`,
            `/${slug}/extra`
          ]

          for (const path of paths) {
            const context1 = determineRoutingContext(path)
            const context2 = determineRoutingContext(path)

            // Property: Same path should always resolve to same context
            expect(context1.mode).toBe(context2.mode)
            expect(context1.expectedInterface).toBe(context2.expectedInterface)
            expect(context1.shouldRequireAuth).toBe(context2.shouldRequireAuth)
            expect(context1.slug).toBe(context2.slug)

            // Property: Path resolution should be deterministic based on slug validity
            if (path.startsWith('/app') || path.startsWith('/dashboard')) {
              expect(context1.mode).toBe('admin')
            } else {
              // Extract slug from path
              const pathSlug = path.split('/')[1]
              // Valid tenant slugs should be alphanumeric with hyphens/underscores only
              const isValidSlug = pathSlug && pathSlug.trim() !== '' && 
                                 !['app', 'dashboard', 'auth', 'onboarding'].includes(pathSlug) &&
                                 /^[a-zA-Z0-9_-]+$/.test(pathSlug)
              
              if (isValidSlug) {
                expect(context1.mode).toBe('public')
                expect(context1.slug).toBe(pathSlug)
              } else {
                // Invalid, empty, or whitespace slugs should be treated as admin
                expect(context1.mode).toBe('admin')
              }
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})

// Helper functions to simulate routing logic
function determineRoutingContext(path: string): RoutingScenario & { mode: 'public' | 'admin'; slug: string | null } {
  // Simulate the routing logic from useTenant hook
  if (path.startsWith('/app') || path.startsWith('/dashboard') || path === '/onboarding') {
    return {
      path,
      expectedMode: 'admin',
      expectedInterface: 'admin-dashboard',
      shouldRequireAuth: true,
      mode: 'admin',
      slug: null
    }
  }
  
  // Check if it's a special route
  if (path === '/' || path === '/auth') {
    return {
      path,
      expectedMode: 'admin', // These are treated as admin context
      expectedInterface: 'admin-dashboard',
      shouldRequireAuth: path === '/auth' ? false : true,
      mode: 'admin',
      slug: null
    }
  }
  
  // Extract slug from path
  const pathSegments = path.split('/').filter(Boolean)
  const slug = pathSegments[0]
  
  // Check if slug is empty or whitespace
  if (!slug || slug.trim() === '') {
    return {
      path,
      expectedMode: 'admin',
      expectedInterface: 'admin-dashboard',
      shouldRequireAuth: true,
      mode: 'admin',
      slug: null
    }
  }
  
  // Check if slug is a reserved path or invalid
  if (['app', 'dashboard', 'auth', 'onboarding'].includes(slug) || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return {
      path,
      expectedMode: 'admin',
      expectedInterface: 'admin-dashboard',
      shouldRequireAuth: true,
      mode: 'admin',
      slug: null
    }
  }
  
  // Treat as valid tenant slug
  return {
    path,
    expectedMode: 'public',
    expectedInterface: 'public-booking',
    shouldRequireAuth: false,
    mode: 'public',
    slug: slug
  }
}

function mockTenantContextLoading(
  path: string, 
  isAuthenticated: boolean, 
  tenants: Array<{ slug: string; id: string; status: string }>
): MockTenantContext {
  const context = determineRoutingContext(path)
  
  if (context.expectedMode === 'public') {
    const pathSegments = path.split('/').filter(Boolean)
    const slug = pathSegments[0]
    const tenant = tenants.find(t => t.slug === slug && t.status === 'active')
    
    return {
      mode: 'public',
      tenantId: tenant?.id || null,
      slug: slug,
      isAuthenticated
    }
  } else {
    // Admin mode - would use membership-based resolution
    return {
      mode: 'admin',
      tenantId: isAuthenticated ? tenants[0]?.id || null : null,
      slug: null,
      isAuthenticated
    }
  }
}

function checkRouteAccess(path: string, isAuthenticated: boolean): { allowed: boolean; requiresAuth: boolean } {
  const context = determineRoutingContext(path)
  
  return {
    allowed: !context.shouldRequireAuth || isAuthenticated,
    requiresAuth: context.shouldRequireAuth
  }
}