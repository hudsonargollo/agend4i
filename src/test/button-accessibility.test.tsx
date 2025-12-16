/**
 * **Feature: marketing-experience, Property 12: Touch Target Accessibility**
 * **Validates: Requirements 1.5, 6.3**
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import { NeonButton } from '@/components/ui/neon-button'

describe('Property 12: Touch Target Accessibility', () => {
  it('should ensure minimum 44px height with active state feedback and focus-visible rings for any interactive element', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('primary', 'secondary'),
        fc.constantFrom('sm', 'md', 'lg'),
        fc.string({ minLength: 1, maxLength: 30 }),
        (variant, size, buttonText) => {
          const { container } = render(
            <NeonButton 
              variant={variant as 'primary' | 'secondary'} 
              size={size as 'sm' | 'md' | 'lg'}
            >
              {buttonText}
            </NeonButton>
          )

          const button = container.firstChild as HTMLElement
          expect(button).toBeTruthy()

          const classList = button.classList.toString()
          
          // Verify minimum touch target size (44px)
          expect(classList.includes('min-h-[44px]')).toBe(true)
          expect(classList.includes('min-w-[44px]')).toBe(true)
          
          // Verify focus-visible ring styling with neon green
          expect(classList.includes('focus-visible:ring-neon-green')).toBe(true)
          expect(classList.includes('focus-visible:ring-2')).toBe(true)
          expect(classList.includes('focus-visible:outline-none')).toBe(true)
          
          // Verify active state feedback (scale animation)
          expect(classList.includes('active:scale-95')).toBe(true)
          
          // Verify transition for smooth feedback
          expect(classList.includes('transition-all')).toBe(true)
          
          // Verify proper button semantics
          expect(button.tagName.toLowerCase()).toBe('button')
          
          // Verify content is accessible
          expect(button.textContent).toBe(buttonText)
          
          // Verify variant-specific accessibility features
          switch (variant) {
            case 'primary':
              // Primary buttons should have high contrast
              expect(classList.includes('bg-neon-green')).toBe(true)
              expect(classList.includes('text-brand-dark')).toBe(true)
              break
            case 'secondary':
              // Secondary buttons should have visible borders
              expect(classList.includes('border')).toBe(true)
              expect(classList.includes('text-neon-green')).toBe(true)
              break
          }
          
          // Verify hover effects for visual feedback
          expect(classList.includes('hover:')).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})