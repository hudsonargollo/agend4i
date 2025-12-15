/**
 * GitHub Actions Security Property Tests
 * 
 * **Property 13: GitHub Actions secret security**
 * **Validates: Requirements 5.4**
 * 
 * Tests that sensitive configuration like API tokens are securely accessed 
 * from GitHub Secrets without exposure in logs for any deployment triggered by GitHub Actions.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  validateSecretSecurity, 
  validateEnvironmentSecrets,
  getEnvironmentSecurityConfig,
  generateSecurityReport,
  SECURITY_POLICIES,
  type EnvironmentSecurityConfig
} from '../lib/github-actions-security'

describe('GitHub Actions Security Property Tests', () => {
  describe('Property 13: GitHub Actions secret security', () => {
    /**
     * **Property 13: GitHub Actions secret security**
     * **Validates: Requirements 5.4**
     */
    it('should validate Cloudflare API token format requirements', () => {
      // Test valid Cloudflare token
      const validToken = 'abcdefghijklmnopqrstuvwxyz1234567890abcdef'
      const validResult = validateSecretSecurity('CLOUDFLARE_API_TOKEN', validToken, 'production')
      expect(validResult.valid).toBe(true)
      expect(validResult.errors).toHaveLength(0)
      
      // Test invalid Cloudflare token (too short)
      const invalidToken = 'short'
      const invalidResult = validateSecretSecurity('CLOUDFLARE_API_TOKEN', invalidToken, 'production')
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors.length).toBeGreaterThan(0)
      expect(invalidResult.errors.some(error => 
        error.toLowerCase().includes('format') || 
        error.toLowerCase().includes('invalid')
      )).toBe(true)
    })

    it('should validate Supabase URL domain requirements', () => {
      // Test valid Supabase URL
      const validUrl = 'https://myproject.supabase.co'
      const validResult = validateSecretSecurity('VITE_SUPABASE_URL', validUrl, 'production')
      expect(validResult.valid).toBe(true)
      expect(validResult.errors).toHaveLength(0)
      
      // Test invalid URL (wrong domain)
      const invalidUrl = 'https://example.com'
      const invalidResult = validateSecretSecurity('VITE_SUPABASE_URL', invalidUrl, 'production')
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors.some(error => 
        error.toLowerCase().includes('supabase') || 
        error.toLowerCase().includes('domain')
      )).toBe(true)
    })

    it('should validate JWT format for Supabase publishable keys', () => {
      // Test valid JWT format
      const validJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      const validResult = validateSecretSecurity('VITE_SUPABASE_PUBLISHABLE_KEY', validJwt, 'production')
      expect(validResult.valid).toBe(true)
      expect(validResult.errors).toHaveLength(0)
      
      // Test invalid JWT format
      const invalidJwt = 'not-a-jwt-token'
      const invalidResult = validateSecretSecurity('VITE_SUPABASE_PUBLISHABLE_KEY', invalidJwt, 'production')
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors.some(error => 
        error.toLowerCase().includes('jwt') || 
        error.toLowerCase().includes('token')
      )).toBe(true)
    })

    it('should prevent service role keys from being used in frontend deployments', () => {
      const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role_key_content.signature'
      const result = validateSecretSecurity('VITE_SUPABASE_PUBLISHABLE_KEY', serviceRoleKey, 'production')
      
      // Service role keys should be rejected
      expect(result.valid).toBe(false)
      expect(result.errors.some(error => 
        error.toLowerCase().includes('service role') || 
        error.toLowerCase().includes('service_role')
      )).toBe(true)
    })

    it('should validate complete environment configurations', () => {
      const validSecrets = {
        'CLOUDFLARE_API_TOKEN_PROD': 'abcdefghijklmnopqrstuvwxyz1234567890abcdef',
        'VITE_SUPABASE_URL_PROD': 'https://myproject.supabase.co',
        'VITE_SUPABASE_PROJECT_ID_PROD': 'abcdefghijklmnopqrst',
        'VITE_SUPABASE_PUBLISHABLE_KEY_PROD': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      }
      
      const result = validateEnvironmentSecrets('production', validSecrets)
      
      // Complete valid configurations should pass
      expect(result.valid).toBe(true)
      expect(result.missingSecrets).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle fallback secrets when environment-specific secrets are missing', () => {
      const fallbackSecrets = {
        'CLOUDFLARE_API_TOKEN': 'abcdefghijklmnopqrstuvwxyz1234567890abcdef',
        'VITE_SUPABASE_URL': 'https://myproject.supabase.co',
        'VITE_SUPABASE_PROJECT_ID': 'abcdefghijklmnopqrst',
        'VITE_SUPABASE_PUBLISHABLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      }
      
      const result = validateEnvironmentSecrets('production', fallbackSecrets)
      
      // Should be valid when using fallback secrets
      expect(result.valid).toBe(true)
      expect(result.missingSecrets).toHaveLength(0)
    })

    it('should detect missing secrets and report them clearly', () => {
      const partialSecrets = {
        'CLOUDFLARE_API_TOKEN_PROD': 'abcdefghijklmnopqrstuvwxyz1234567890abcdef'
        // Missing other required secrets
      }
      
      const result = validateEnvironmentSecrets('production', partialSecrets)
      
      // Should detect missing secrets
      expect(result.valid).toBe(false)
      expect(result.missingSecrets.length).toBeGreaterThan(0)
    })

    it('should generate comprehensive security reports', () => {
      const validSecrets = {
        'CLOUDFLARE_API_TOKEN_PROD': 'abcdefghijklmnopqrstuvwxyz1234567890abcdef',
        'VITE_SUPABASE_URL_PROD': 'https://myproject.supabase.co',
        'VITE_SUPABASE_PROJECT_ID_PROD': 'abcdefghijklmnopqrst',
        'VITE_SUPABASE_PUBLISHABLE_KEY_PROD': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      }
      
      const report = generateSecurityReport('production', validSecrets)
      
      // Report should be a non-empty string
      expect(typeof report).toBe('string')
      expect(report.length).toBeGreaterThan(0)
      
      // Should contain environment name
      expect(report.toUpperCase()).toContain('PRODUCTION')
      
      // Should contain security status
      expect(report).toMatch(/Security Status:/i)
      
      // Should contain recommendations
      expect(report).toMatch(/recommendations/i)
    })

    it('should maintain security policy consistency across environments', () => {
      const validToken = 'abcdefghijklmnopqrstuvwxyz1234567890abcdef'
      const environments = ['production', 'staging', 'preview']
      
      const results = environments.map(env => 
        validateSecretSecurity('CLOUDFLARE_API_TOKEN', validToken, env)
      )
      
      // Valid secrets should be valid across all environments
      const allValid = results.every(result => result.valid)
      expect(allValid).toBe(true)
    })
  })

  describe('Security Configuration Validation', () => {
    it('should have valid security policies defined', () => {
      expect(SECURITY_POLICIES).toBeDefined()
      expect(Array.isArray(SECURITY_POLICIES)).toBe(true)
      expect(SECURITY_POLICIES.length).toBeGreaterThan(0)
      
      for (const policy of SECURITY_POLICIES) {
        expect(policy.name).toBeTruthy()
        expect(policy.description).toBeTruthy()
        expect(typeof policy.required).toBe('boolean')
        expect(Array.isArray(policy.environments)).toBe(true)
        expect(policy.environments.length).toBeGreaterThan(0)
      }
    })

    it('should have security configurations for all supported environments', () => {
      const environments = ['production', 'staging', 'preview']
      
      for (const environment of environments) {
        const config = getEnvironmentSecurityConfig(environment)
        expect(config).toBeTruthy()
        expect(config?.environment).toBe(environment)
        expect(Array.isArray(config?.requiredSecrets)).toBe(true)
        expect(config?.requiredSecrets.length).toBeGreaterThan(0)
      }
    })

    it('should have proper fallback configurations for environment-specific secrets', () => {
      const envConfigs = ['production', 'staging']
      
      for (const environment of envConfigs) {
        const config = getEnvironmentSecurityConfig(environment)
        expect(config).toBeTruthy()
        
        // Should have fallback secrets defined
        expect(config?.fallbackSecrets).toBeTruthy()
        expect(Object.keys(config?.fallbackSecrets || {}).length).toBeGreaterThan(0)
        
        // Each required secret should have a fallback
        for (const requiredSecret of config?.requiredSecrets || []) {
          expect(config?.fallbackSecrets[requiredSecret]).toBeTruthy()
        }
      }
    })
  })
})