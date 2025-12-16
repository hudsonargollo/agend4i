import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RESERVED_SLUGS, isReservedSlug, isValidSlugFormat } from '@/lib/slugValidation';

describe('Real-time Slug Validation Property Tests', () => {
  /**
   * **Feature: saas-multi-tenancy, Property 13: Real-time slug validation**
   * **Validates: Requirements 10.3, 11.3**
   */
  it('Property 13: For any slug candidate, client-side validation should correctly identify format and reserved word issues', () => {
    fc.assert(
      fc.property(
        // Generate various slug candidates
        fc.oneof(
          // Valid format slugs
          fc.string({ minLength: 2, maxLength: 20 }).map(s => 
            s.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
          ).filter(s => s.length >= 2),
          // Reserved slugs
          fc.constantFrom(...RESERVED_SLUGS),
          // Invalid format slugs
          fc.constantFrom('a', 'A', '123ABC', 'test@test', 'test space', '-test', 'test-', ''),
          // Too long slugs
          fc.string({ minLength: 51, maxLength: 100 })
        ),
        (slugCandidate: string) => {
          // Test client-side validation logic
          const isValidFormat = isValidSlugFormat(slugCandidate);
          const isReserved = isReservedSlug(slugCandidate);
          
          // Property 1: Reserved slugs should always be identified as reserved
          if (RESERVED_SLUGS.includes(slugCandidate as any)) {
            expect(isReserved).toBe(true);
          }
          
          // Property 2: Valid format check should be consistent
          if (slugCandidate.length >= 2 && 
              slugCandidate.length <= 50 && 
              /^[a-z0-9-]+$/.test(slugCandidate) &&
              !slugCandidate.startsWith('-') &&
              !slugCandidate.endsWith('-')) {
            expect(isValidFormat).toBe(true);
          } else {
            expect(isValidFormat).toBe(false);
          }
          
          // Property 3: Invalid formats should be rejected
          if (slugCandidate.length < 2 || 
              slugCandidate.length > 50 || 
              !/^[a-z0-9-]+$/.test(slugCandidate) ||
              slugCandidate.startsWith('-') ||
              slugCandidate.endsWith('-')) {
            expect(isValidFormat).toBe(false);
          }
          
          // Property 4: Reserved words should be rejected regardless of format
          if (isReserved) {
            // Even if format is valid, reserved words should be handled specially
            expect(RESERVED_SLUGS.includes(slugCandidate as any)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (Reserved Words): Reserved system paths should always be identified correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RESERVED_SLUGS),
        (reservedSlug: string) => {
          // Property: All reserved slugs should be identified as reserved
          expect(isReservedSlug(reservedSlug)).toBe(true);
          expect(RESERVED_SLUGS.includes(reservedSlug as any)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (Format Validation): Invalid format slugs should be identified correctly', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('a'), // Too short
          fc.constant('A'), // Uppercase
          fc.constant('test@test'), // Invalid characters
          fc.constant('test space'), // Spaces
          fc.constant('-test'), // Leading hyphen
          fc.constant('test-'), // Trailing hyphen
          fc.string({ minLength: 51, maxLength: 100 }) // Too long
        ),
        (invalidSlug: string) => {
          // Property: Invalid format should always be identified as invalid
          expect(isValidSlugFormat(invalidSlug)).toBe(false);
          
          // Property: Specific validation rules
          if (invalidSlug.length < 2 || invalidSlug.length > 50) {
            expect(isValidSlugFormat(invalidSlug)).toBe(false);
          }
          
          if (!/^[a-z0-9-]+$/.test(invalidSlug)) {
            expect(isValidSlugFormat(invalidSlug)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (Valid Slugs): Valid format, non-reserved slugs should pass client-side validation', () => {
    fc.assert(
      fc.property(
        // Generate valid format slugs that are not reserved
        fc.string({ minLength: 2, maxLength: 20 })
          .map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20))
          .filter(s => s.length >= 2 && !RESERVED_SLUGS.includes(s as any)),
        (validSlug: string) => {
          // Property: Valid, non-reserved slugs should pass format validation
          expect(isValidSlugFormat(validSlug)).toBe(true);
          expect(isReservedSlug(validSlug)).toBe(false);
          
          // Property: Should meet all format requirements
          expect(validSlug.length).toBeGreaterThanOrEqual(2);
          expect(validSlug.length).toBeLessThanOrEqual(50);
          expect(/^[a-z0-9-]+$/.test(validSlug)).toBe(true);
          expect(validSlug.startsWith('-')).toBe(false);
          expect(validSlug.endsWith('-')).toBe(false);
          expect(RESERVED_SLUGS.includes(validSlug as any)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (Consistency): Validation functions should be consistent with each other', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        (slugCandidate: string) => {
          const isValid = isValidSlugFormat(slugCandidate);
          const isReserved = isReservedSlug(slugCandidate);
          
          // Property: If a slug is reserved, it should still be checked for format validity
          // (reserved slugs happen to be valid format, but this tests the independence)
          if (isReserved) {
            // All reserved slugs in our list should be valid format
            expect(isValid).toBe(true);
          }
          
          // Property: Format validation should be independent of reserved status
          const formatValid = slugCandidate.length >= 2 && 
                             slugCandidate.length <= 50 && 
                             /^[a-z0-9-]+$/.test(slugCandidate) &&
                             !slugCandidate.startsWith('-') &&
                             !slugCandidate.endsWith('-');
          expect(isValid).toBe(formatValid);
          
          // Property: Reserved check should be independent of format
          const actuallyReserved = RESERVED_SLUGS.includes(slugCandidate as any);
          expect(isReserved).toBe(actuallyReserved);
        }
      ),
      { numRuns: 100 }
    );
  });
});