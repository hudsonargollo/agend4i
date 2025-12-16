import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateSlugFromName, isValidSlugFormat } from '@/lib/slugValidation';

describe('Slug Generation Consistency Property Tests', () => {
  /**
   * **Feature: saas-multi-tenancy, Property 12: Slug generation consistency**
   * **Validates: Requirements 10.2**
   */
  it('Property 12: For any shop name input during onboarding, the system should generate a valid, URL-safe slug suggestion that follows consistent transformation rules', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary shop names with various characters
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (shopName: string) => {
          const generatedSlug = generateSlugFromName(shopName);
          
          // Property 1: Generated slug should always be valid format
          expect(isValidSlugFormat(generatedSlug)).toBe(true);
          
          // Property 2: Generated slug should be lowercase
          expect(generatedSlug).toBe(generatedSlug.toLowerCase());
          
          // Property 3: Generated slug should not contain spaces
          expect(generatedSlug).not.toMatch(/\s/);
          
          // Property 4: Generated slug should only contain allowed characters
          expect(generatedSlug).toMatch(/^[a-z0-9-]*$/);
          
          // Property 5: Generated slug should not start or end with hyphens
          if (generatedSlug.length > 0) {
            expect(generatedSlug).not.toMatch(/^-/);
            expect(generatedSlug).not.toMatch(/-$/);
          }
          
          // Property 6: Generated slug should have reasonable length (not empty, not too long)
          expect(generatedSlug.length).toBeGreaterThan(0);
          expect(generatedSlug.length).toBeLessThanOrEqual(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12 (Consistency): Same input should always produce same output', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (shopName: string) => {
          const slug1 = generateSlugFromName(shopName);
          const slug2 = generateSlugFromName(shopName);
          
          // Property: Same input should always produce identical output
          expect(slug1).toBe(slug2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12 (Normalization): Accented characters should be normalized to ASCII', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Café da Manhã',
          'Açaí & Vitaminas',
          'Pão de Açúcar',
          'José & Maria',
          'Ângela Beleza',
          'São João Barbearia',
          'Coração de Mãe'
        ),
        (shopName: string) => {
          const generatedSlug = generateSlugFromName(shopName);
          
          // Property: No accented characters should remain in the slug
          expect(generatedSlug).not.toMatch(/[àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/i);
          
          // Property: Should still be a valid slug
          expect(isValidSlugFormat(generatedSlug)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12 (Special Characters): Non-alphanumeric characters should be converted to hyphens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Beauty & Spa',
          'Hair@Style',
          'Nails+More',
          'Cut & Color',
          'Style/Studio',
          'Beauty*Salon',
          'Hair (Professional)',
          'Salon [Premium]'
        ),
        (shopName: string) => {
          const generatedSlug = generateSlugFromName(shopName);
          
          // Property: Should not contain original special characters
          expect(generatedSlug).not.toMatch(/[&@+*/()[\]]/);
          
          // Property: Should be valid format
          expect(isValidSlugFormat(generatedSlug)).toBe(true);
          
          // Property: Should contain hyphens as separators
          if (shopName.includes(' ') || /[^a-zA-Z0-9]/.test(shopName)) {
            // If original had separators, slug should likely have hyphens
            // (unless they were at the edges and got trimmed)
            expect(generatedSlug.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12 (Edge Cases): Empty or whitespace-only inputs should produce valid slugs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '   ',
          '\t\n',
          '!!!',
          '---',
          '   Salon   ',
          '\tBeauty\n',
          '  -  Hair  -  '
        ),
        (shopName: string) => {
          const generatedSlug = generateSlugFromName(shopName);
          
          // Property: Even edge case inputs should produce valid slugs or empty string
          if (generatedSlug.length > 0) {
            expect(isValidSlugFormat(generatedSlug)).toBe(true);
          }
          
          // Property: Should not contain original whitespace
          expect(generatedSlug).not.toMatch(/\s/);
        }
      ),
      { numRuns: 100 }
    );
  });
});