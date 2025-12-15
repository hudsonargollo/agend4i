/**
 * Property-Based Tests for Admin Routing Pattern Preservation
 * **Feature: domain-migration, Property 7: Admin routing pattern preservation**
 * **Validates: Requirements 3.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { generateAdminURL, type EnvironmentDetector } from '@/lib/domain'

describe('Admin Routing Pattern Preservation', () => {
  it('Property 7: Admin routing pattern preservation - /app path structure should be preserved with correct domain', () => {
    fc.assert(
      fc.property(
        // Generate random admin paths
        fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
          // Valid path characters only
          /^[a-zA-Z0-9/_-]+$/.test(s) && 
          // Should not start with / (will be added by function)
          !s.startsWith('/')
        )),
        // Generate random environment configurations
        fc.record({
          isDev: fc.boolean(),
          hostname: fc.oneof(
            fc.constant('localhost'),
            fc.constant('staging.agendai.clubemkt.digital'),
            fc.constant('agendai.clubemkt.digital'),
            fc.constant('custom.domain.com')
          ),
          viteEnvironment: fc.option(fc.oneof(
            fc.constant('development'),
            fc.constant('staging'),
            fc.constant('production')
          )),
          viteAppDomain: fc.option(fc.oneof(
            fc.constant('localhost:8080'),
            fc.constant('staging.agendai.clubemkt.digital'),
            fc.constant('agendai.clubemkt.digital'),
            fc.constant('custom.domain.com')
          ))
        }),
        (adminPath, detector) => {
          // Generate admin URL using the domain service
          const adminURL = generateAdminURL(adminPath || undefined, detector)
          
          // Parse the generated URL
          const url = new URL(adminURL)
          
          // Property: URL should be valid and well-formed
          expect(() => new URL(adminURL)).not.toThrow()
          
          // Property: URL should use HTTPS in production environments (or HTTP for localhost)
          if (url.hostname === 'localhost') {
            expect(url.protocol).toBe('http:')
          } else {
            expect(url.protocol).toBe('https:')
          }
          
          // Property: URL should contain /app as the first path segment
          const pathSegments = url.pathname.split('/').filter(Boolean)
          expect(pathSegments.length).toBeGreaterThan(0)
          expect(pathSegments[0]).toBe('app')
          
          // Property: If additional path was provided, it should be preserved after /app
          if (adminPath) {
            const expectedPath = `/app/${adminPath}`
            expect(url.pathname).toBe(expectedPath)
          } else {
            expect(url.pathname).toBe('/app')
          }
          
          // Property: Domain should be appropriate for the environment
          const expectedDomains = [
            'localhost',
            'staging.agendai.clubemkt.digital', 
            'agendai.clubemkt.digital'
          ]
          
          // If viteAppDomain is set, it should override the default
          if (detector.viteAppDomain) {
            const expectedDomain = detector.viteAppDomain.split(':')[0]
            expect(url.hostname).toBe(expectedDomain)
          } else {
            expect(expectedDomains).toContain(url.hostname)
          }
          
          // Property: Port should be included only for localhost development
          if (url.hostname === 'localhost') {
            expect(url.port).toBeTruthy()
          } else {
            expect(url.port).toBe('')
          }
          
          // Property: URL should not contain any tenant slug patterns
          // Admin URLs should never look like tenant URLs (/{slug})
          const pathWithoutApp = url.pathname.replace('/app', '')
          if (pathWithoutApp.length > 0) {
            // If there's a path after /app, it should start with /
            expect(pathWithoutApp.startsWith('/')).toBe(true)
          }
          
          // Property: Generated URL should be consistent across multiple calls
          const secondURL = generateAdminURL(adminPath || undefined, detector)
          expect(adminURL).toBe(secondURL)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.1: Admin URLs should maintain /app pattern regardless of environment', () => {
    fc.assert(
      fc.property(
        // Generate different environment scenarios
        fc.oneof(
          // Development environment
          fc.record({
            isDev: fc.constant(true),
            hostname: fc.constant('localhost'),
            viteEnvironment: fc.constant('development'),
            viteAppDomain: fc.option(fc.constant('localhost:8080'))
          }),
          // Staging environment  
          fc.record({
            isDev: fc.constant(false),
            hostname: fc.constant('staging.agendai.clubemkt.digital'),
            viteEnvironment: fc.constant('staging'),
            viteAppDomain: fc.option(fc.constant('staging.agendai.clubemkt.digital'))
          }),
          // Production environment
          fc.record({
            isDev: fc.constant(false),
            hostname: fc.constant('agendai.clubemkt.digital'),
            viteEnvironment: fc.constant('production'),
            viteAppDomain: fc.option(fc.constant('agendai.clubemkt.digital'))
          })
        ),
        // Generate various admin paths
        fc.option(fc.oneof(
          fc.constant('dashboard'),
          fc.constant('services'),
          fc.constant('billing'),
          fc.constant('settings'),
          fc.constant('dashboard/services'),
          fc.constant('billing?status=success'),
          fc.constant('settings/profile')
        )),
        (detector, adminPath) => {
          const adminURL = generateAdminURL(adminPath || undefined, detector)
          const url = new URL(adminURL)
          
          // Property: All admin URLs must start with /app regardless of environment
          expect(url.pathname.startsWith('/app')).toBe(true)
          
          // Property: The /app segment should be the first path segment
          const pathSegments = url.pathname.split('/').filter(Boolean)
          expect(pathSegments[0]).toBe('app')
          
          // Property: URL should be valid in all environments
          expect(() => new URL(adminURL)).not.toThrow()
          
          // Property: Domain should match the environment configuration
          if (detector.viteAppDomain) {
            const expectedDomain = detector.viteAppDomain.split(':')[0]
            expect(url.hostname).toBe(expectedDomain)
          } else if (detector.isDev) {
            expect(url.hostname).toBe('localhost')
          } else if (detector.viteEnvironment === 'staging') {
            expect(url.hostname).toBe('staging.agendai.clubemkt.digital')
          } else {
            expect(url.hostname).toBe('agendai.clubemkt.digital')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.2: Admin URL generation should not interfere with tenant routing patterns', () => {
    fc.assert(
      fc.property(
        // Generate tenant-like slugs to ensure they don't appear in admin URLs
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => 
          /^[a-zA-Z0-9_-]+$/.test(s) && 
          !['app', 'dashboard', 'auth', 'onboarding'].includes(s)
        ),
        // Generate admin paths
        fc.option(fc.string({ minLength: 1, maxLength: 30 }).filter(s => 
          /^[a-zA-Z0-9/_?=-]+$/.test(s) && !s.startsWith('/')
        )),
        (tenantSlug, adminPath) => {
          const adminURL = generateAdminURL(adminPath || undefined)
          const url = new URL(adminURL)
          
          // Property: Admin URLs should never contain tenant slugs as the first path segment
          const pathSegments = url.pathname.split('/').filter(Boolean)
          expect(pathSegments[0]).toBe('app')
          expect(pathSegments[0]).not.toBe(tenantSlug)
          
          // Property: Admin URLs should be clearly distinguishable from tenant URLs
          // Tenant URLs follow pattern: /{slug}, Admin URLs follow pattern: /app/*
          expect(url.pathname.startsWith('/app')).toBe(true)
          expect(url.pathname.startsWith(`/${tenantSlug}`)).toBe(false)
          
          // Property: Admin URLs should not accidentally match tenant URL patterns
          const isAdminPattern = /^\/app(\/.*)?$/.test(url.pathname)
          const isTenantPattern = /^\/[a-zA-Z0-9_-]+(\/.*)?$/.test(url.pathname) && !url.pathname.startsWith('/app')
          
          expect(isAdminPattern).toBe(true)
          expect(isTenantPattern).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})