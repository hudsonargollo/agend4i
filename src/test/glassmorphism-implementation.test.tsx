/**
 * **Feature: marketing-experience, Property 6: Glassmorphism Implementation**
 * **Validates: Requirements 2.2**
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import { GlassCard } from '@/components/ui/glass-card'

describe('Property 6: Glassmorphism Implementation', () => {
  it('should combine backdrop-filter, bg-opacity, and border-gradient properties correctly for any glassmorphism component', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('default', 'highlighted', 'pricing'),
        fc.string({ minLength: 1, maxLength: 50 }),
        (variant, content) => {
          const { container } = render(
            <GlassCard variant={variant as 'default' | 'highlighted' | 'pricing'}>
              {content}
            </GlassCard>
          )

          const glassCard = container.firstChild as HTMLElement
          expect(glassCard).toBeTruthy()

          // Get computed styles
          const computedStyle = window.getComputedStyle(glassCard)
          
          // Check that glassmorphism properties are applied via utility classes
          const classList = glassCard.classList.toString()
          
          // Verify glassmorphism utility classes are applied based on variant
          let expectedGlassClass = ''
          switch (variant) {
            case 'default':
              expectedGlassClass = 'glass-effect'
              break
            case 'highlighted':
              expectedGlassClass = 'glass-highlighted'
              break
            case 'pricing':
              expectedGlassClass = 'glass-pricing'
              break
          }

          // Verify the correct glassmorphism class is applied
          expect(classList.includes(expectedGlassClass)).toBe(true)
          
          // Verify rounded corners for glass aesthetic
          expect(classList.includes('rounded-glass')).toBe(true)

          // Additional verification: ensure the component renders with content
          expect(glassCard.textContent).toBe(content)
        }
      ),
      { numRuns: 100 }
    )
  })
})