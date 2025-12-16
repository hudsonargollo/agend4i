import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateSlugFromName, isReservedSlug, RESERVED_SLUGS } from '@/lib/slugValidation';

describe('Generated Slug Safety Property Tests', () => {
  /**
   * **Feature: saas-multi-tenancy, Property 16: Generated slug safety**
   * **Validates: Requirements 11.4**
   */
  it('Property 16: For any auto-generated slug suggestion, the result should not conflict with reserved system paths', () => {
    fc.assert(
      fc.property(
        // Generate various shop names that could potentially create reserved slugs
        fc.oneof(
          // Names that might generate reserved words
          fc.constantFrom(
            'App Store', 'Auth Service', 'API Gateway', 'Dashboard Pro',
            'Admin Panel', 'Public Access', 'Settings Manager', 'Login Portal',
            'Register Now', 'Onboarding Flow'
          ),
          // Random shop names
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          // Names with special characters that need normalization
          fc.constantFrom(
            'Café & Restaurante', 'José\'s Barber', 'María Beauty',
            'São Paulo Salon', 'Ângela & Co', 'Coração de Mãe'
          )
        ),
        (shopName: string) => {
          const generatedSlug = generateSlugFromName(shopName);
          
          // Property 1: Generated slug should never be a reserved system path
          expect(isReservedSlug(generatedSlug)).toBe(false);
          
          // Property 2: Generated slug should not be in the reserved list
          expect(RESERVED_SLUGS.includes(generatedSlug as any)).toBe(false);
          
          // Property 3: Generated slug should be safe for routing
          const systemPaths = ['app', 'auth', 'api', 'dashboard', 'onboarding', 'settings', 'login', 'register', 'admin', 'public'];
          expect(systemPaths.includes(generatedSlug)).toBe(false);
          
          // Property 4: Generated slug should be a valid format if not empty
          if (generatedSlug.length > 0) {
            expect(generatedSlug).toMatch(/^[a-z0-9-]+$/);
            expect(generatedSlug.length).toBeGreaterThanOrEqual(2);
            expect(generatedSlug.length).toBeLessThanOrEqual(50);
            expect(generatedSlug.startsWith('-')).toBe(false);
            expect(generatedSlug.endsWith('-')).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16 (Specific Reserved Names): Shop names that could generate reserved words should be handled safely', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'App', 'Auth', 'API', 'Dashboard', 'Admin', 'Public',
          'Settings', 'Login', 'Register', 'Onboarding',
          'App Store', 'Auth Service', 'API Company', 'Dashboard Inc',
          'Admin Solutions', 'Public Services'
        ),
        (potentiallyReservedName: string) => {
          const generatedSlug = generateSlugFromName(potentiallyReservedName);
          
          // Property: Even names that could generate reserved words should result in safe slugs
          expect(isReservedSlug(generatedSlug)).toBe(false);
          
          // Property: Should not match any reserved system path
          expect(RESERVED_SLUGS.includes(generatedSlug as any)).toBe(false);
          
          // Property: If the input would naturally generate a reserved word, 
          // the function should modify it to be safe
          if (RESERVED_SLUGS.includes(potentiallyReservedName.toLowerCase() as any)) {
            expect(generatedSlug).not.toBe(potentiallyReservedName.toLowerCase());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16 (Fallback Safety): Empty or invalid inputs should generate safe fallback slugs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '', '   ', '\t\n', '!!!', '---', '@@@', '###',
          'a', 'A', '1', '!', ' app ', '\tauth\n'
        ),
        (problematicInput: string) => {
          const generatedSlug = generateSlugFromName(problematicInput);
          
          // Property: Even problematic inputs should generate safe slugs
          if (generatedSlug.length > 0) {
            expect(isReservedSlug(generatedSlug)).toBe(false);
            expect(RESERVED_SLUGS.includes(generatedSlug as any)).toBe(false);
          }
          
          // Property: Fallback should be safe and valid
          if (generatedSlug === 'loja') { // Our fallback slug
            expect(isReservedSlug('loja')).toBe(false);
            expect(RESERVED_SLUGS.includes('loja' as any)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16 (Consistency): Same input should always generate the same safe slug', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (shopName: string) => {
          const slug1 = generateSlugFromName(shopName);
          const slug2 = generateSlugFromName(shopName);
          
          // Property: Consistency - same input should produce same output
          expect(slug1).toBe(slug2);
          
          // Property: Both results should be safe
          expect(isReservedSlug(slug1)).toBe(false);
          expect(isReservedSlug(slug2)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16 (Reserved Word Avoidance): Function should actively avoid generating reserved words', () => {
    // Test specific cases where the input could naturally generate reserved words
    const testCases = [
      { input: 'App', expected: 'app' }, // This might be problematic
      { input: 'Auth Service', expected: 'auth-service' },
      { input: 'API Gateway', expected: 'api-gateway' },
      { input: 'Dashboard', expected: 'dashboard' }, // This might be problematic
      { input: 'Admin Panel', expected: 'admin-panel' },
    ];

    testCases.forEach(({ input, expected }) => {
      const generated = generateSlugFromName(input);
      
      // Property: Generated slug should not be reserved
      expect(isReservedSlug(generated)).toBe(false);
      
      // Property: If the expected result would be reserved, the function should modify it
      if (isReservedSlug(expected)) {
        expect(generated).not.toBe(expected);
      }
    });
  });
});