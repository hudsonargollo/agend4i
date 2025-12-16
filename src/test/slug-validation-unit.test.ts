import { describe, it, expect, vi } from 'vitest';
import { 
  RESERVED_SLUGS, 
  isReservedSlug, 
  isValidSlugFormat, 
  generateSlugFromName,
  generateSlugAlternatives 
} from '@/lib/slugValidation';
import { validateSlugAvailability } from '@/lib/slugValidationService';

// Mock the slug validation service
vi.mock('@/lib/slugValidationService', () => ({
  validateSlugAvailability: vi.fn()
}));

describe('Slug Validation Unit Tests', () => {
  describe('Reserved Word Rejection', () => {
    it('should reject all reserved system paths', () => {
      const systemPaths = ['app', 'auth', 'api', 'dashboard', 'onboarding', 'settings', 'login', 'register', 'admin', 'public'];
      
      systemPaths.forEach(path => {
        expect(isReservedSlug(path)).toBe(true);
        expect(RESERVED_SLUGS.includes(path as any)).toBe(true);
      });
    });

    it('should reject reserved words case-insensitively', () => {
      expect(isReservedSlug('APP')).toBe(true);
      expect(isReservedSlug('App')).toBe(true);
      expect(isReservedSlug('app')).toBe(true);
      expect(isReservedSlug('AUTH')).toBe(true);
      expect(isReservedSlug('Dashboard')).toBe(true);
    });

    it('should not reject non-reserved words', () => {
      const nonReservedSlugs = ['barbershop', 'salon', 'restaurant', 'clinic', 'studio', 'workshop'];
      
      nonReservedSlugs.forEach(slug => {
        expect(isReservedSlug(slug)).toBe(false);
      });
    });
  });

  describe('Database Uniqueness Checking', () => {
    it('should handle database validation errors gracefully', async () => {
      const mockValidateSlugAvailability = vi.mocked(validateSlugAvailability);
      mockValidateSlugAvailability.mockImplementation(async () => {
        return {
          available: false,
          error: 'Erro ao verificar disponibilidade do link'
        };
      });

      const result = await validateSlugAvailability('test-slug');
      
      expect(result.available).toBe(false);
      expect(result.error).toContain('Erro ao verificar disponibilidade');
    });

    it('should return availability status for valid slugs', async () => {
      const mockValidateSlugAvailability = vi.mocked(validateSlugAvailability);
      mockValidateSlugAvailability.mockResolvedValue({
        available: true
      });

      const result = await validateSlugAvailability('available-slug');
      
      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error and suggestions for unavailable slugs', async () => {
      const mockValidateSlugAvailability = vi.mocked(validateSlugAvailability);
      mockValidateSlugAvailability.mockResolvedValue({
        available: false,
        error: 'Este link já está em uso',
        suggestions: ['taken-slug1', 'taken-slug2', 'taken-slug-new']
      });

      const result = await validateSlugAvailability('taken-slug');
      
      expect(result.available).toBe(false);
      expect(result.error).toBe('Este link já está em uso');
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions).toContain('taken-slug1');
    });
  });

  describe('Error Message Display and Suggestions', () => {
    it('should provide appropriate error messages for different validation failures', () => {
      // Test format validation
      expect(isValidSlugFormat('a')).toBe(false); // Too short
      expect(isValidSlugFormat('A')).toBe(false); // Uppercase
      expect(isValidSlugFormat('test@test')).toBe(false); // Invalid characters
      expect(isValidSlugFormat('-test')).toBe(false); // Leading hyphen
      expect(isValidSlugFormat('test-')).toBe(false); // Trailing hyphen
      expect(isValidSlugFormat('a'.repeat(51))).toBe(false); // Too long
    });

    it('should generate appropriate slug alternatives', () => {
      const alternatives = generateSlugAlternatives('barbershop');
      
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives.length).toBeLessThanOrEqual(5);
      
      // All alternatives should be valid format
      alternatives.forEach(alt => {
        expect(isValidSlugFormat(alt)).toBe(true);
        expect(isReservedSlug(alt)).toBe(false);
      });
      
      // Should include numbered alternatives
      expect(alternatives.some(alt => alt.includes('1'))).toBe(true);
      
      // Should include some kind of suffix or variation
      expect(alternatives.some(alt => alt !== 'barbershop')).toBe(true);
    });

    it('should not suggest reserved words as alternatives', () => {
      const alternatives = generateSlugAlternatives('test');
      
      alternatives.forEach(alt => {
        expect(isReservedSlug(alt)).toBe(false);
        expect(RESERVED_SLUGS.includes(alt as any)).toBe(false);
      });
    });
  });

  describe('Slug Generation Safety', () => {
    it('should generate safe slugs from shop names', () => {
      const testCases = [
        { input: 'Barbearia do João', expected: 'barbearia-do-joao' },
        { input: 'Salão Beleza & Cia', expected: 'salao-beleza-cia' },
        { input: 'Café da Manhã', expected: 'cafe-da-manha' },
        { input: 'José\'s Barber Shop', expected: 'jose-s-barber-shop' }
      ];

      testCases.forEach(({ input, expected }) => {
        const generated = generateSlugFromName(input);
        expect(generated).toBe(expected);
        expect(isValidSlugFormat(generated)).toBe(true);
        expect(isReservedSlug(generated)).toBe(false);
      });
    });

    it('should handle reserved word inputs safely', () => {
      const reservedInputs = ['App', 'Auth Service', 'API Gateway', 'Dashboard Pro', 'Admin Panel'];
      
      reservedInputs.forEach(input => {
        const generated = generateSlugFromName(input);
        expect(isReservedSlug(generated)).toBe(false);
        expect(isValidSlugFormat(generated)).toBe(true);
      });
    });

    it('should handle edge case inputs', () => {
      const edgeCases = ['', '   ', '!!!', '---', 'a', 'A'];
      
      edgeCases.forEach(input => {
        const generated = generateSlugFromName(input);
        if (generated.length > 0) {
          expect(isValidSlugFormat(generated)).toBe(true);
          expect(isReservedSlug(generated)).toBe(false);
        }
      });
    });

    it('should generate consistent results for same input', () => {
      const input = 'Barbearia Exemplo';
      const slug1 = generateSlugFromName(input);
      const slug2 = generateSlugFromName(input);
      
      expect(slug1).toBe(slug2);
      expect(isValidSlugFormat(slug1)).toBe(true);
      expect(isReservedSlug(slug1)).toBe(false);
    });
  });

  describe('Format Validation', () => {
    it('should validate correct slug formats', () => {
      const validSlugs = ['barbershop', 'salon-beauty', 'restaurant123', 'clinic-pro', 'studio2024'];
      
      validSlugs.forEach(slug => {
        expect(isValidSlugFormat(slug)).toBe(true);
      });
    });

    it('should reject invalid slug formats', () => {
      const invalidSlugs = [
        'a', // Too short
        'A', // Uppercase
        'test@test', // Invalid characters
        'test space', // Spaces
        '-test', // Leading hyphen
        'test-', // Trailing hyphen
        'a'.repeat(51), // Too long
        '', // Empty
        'test.com', // Dots
        'test_underscore' // Underscores
      ];
      
      invalidSlugs.forEach(slug => {
        expect(isValidSlugFormat(slug)).toBe(false);
      });
    });

    it('should validate length constraints', () => {
      expect(isValidSlugFormat('ab')).toBe(true); // Minimum length
      expect(isValidSlugFormat('a'.repeat(50))).toBe(true); // Maximum length
      expect(isValidSlugFormat('a')).toBe(false); // Below minimum
      expect(isValidSlugFormat('a'.repeat(51))).toBe(false); // Above maximum
    });

    it('should validate character constraints', () => {
      expect(isValidSlugFormat('abc123')).toBe(true); // Letters and numbers
      expect(isValidSlugFormat('abc-123')).toBe(true); // With hyphens
      expect(isValidSlugFormat('abc_123')).toBe(false); // Underscores not allowed
      expect(isValidSlugFormat('abc.123')).toBe(false); // Dots not allowed
      expect(isValidSlugFormat('abc 123')).toBe(false); // Spaces not allowed
      expect(isValidSlugFormat('abc@123')).toBe(false); // Special characters not allowed
    });
  });
});