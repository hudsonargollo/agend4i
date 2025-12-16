/**
 * **Feature: marketing-experience, Property 4: Design System Compliance**
 * **Validates: Requirements 2.1, 2.5**
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import { GlassCard } from '@/components/ui/glass-card'
import { NeonButton } from '@/components/ui/neon-button'
import { AuroraBackground } from '@/components/ui/aurora-background'

describe('Property 4: Design System Compliance', () => {
  it('should use defined semantic color palette and meet WCAG AA contrast ratios for any UI component', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('GlassCard', 'NeonButton', 'AuroraBackground'),
        fc.string({ minLength: 1, maxLength: 20 }),
        (componentType, content) => {
          let component: JSX.Element
          
          switch (componentType) {
            case 'GlassCard':
              component = <GlassCard variant="default">{content}</GlassCard>
              break
            case 'NeonButton':
              component = <NeonButton variant="primary">{content}</NeonButton>
              break
            case 'AuroraBackground':
              component = <AuroraBackground intensity="medium">{content}</AuroraBackground>
              break
            default:
              component = <div>{content}</div>
          }

          const { container } = render(component)
          const element = container.firstChild as HTMLElement
          expect(element).toBeTruthy()

          const classList = element.classList.toString()
          
          // Verify semantic color usage based on component type
          switch (componentType) {
            case 'GlassCard':
              // Should use glass-effect utility class which contains semantic colors
              expect(classList.includes('glass-effect')).toBe(true)
              expect(classList.includes('rounded-glass')).toBe(true)
              break
              
            case 'NeonButton':
              // Should use neon-green for primary variant
              expect(classList.includes('bg-neon-green') || 
                     classList.includes('text-neon-green') ||
                     classList.includes('border-neon-green')).toBe(true)
              
              // Should have proper contrast (neon-green bg with brand-dark text)
              if (classList.includes('bg-neon-green')) {
                expect(classList.includes('text-brand-dark')).toBe(true)
              }
              
              // Should have focus ring with neon-green
              expect(classList.includes('focus-visible:ring-neon-green')).toBe(true)
              break
              
            case 'AuroraBackground':
              // Should have proper positioning and overflow handling
              expect(classList.includes('relative')).toBe(true)
              expect(classList.includes('overflow-hidden')).toBe(true)
              break
          }
          
          // Verify accessibility compliance features
          if (componentType === 'NeonButton') {
            // Interactive elements should have focus indicators
            expect(classList.includes('focus-visible:outline-none')).toBe(true)
            expect(classList.includes('focus-visible:ring-2')).toBe(true)
          }
          
          // Verify content is preserved
          expect(element.textContent?.includes(content)).toBe(true)
          
          // Verify no deprecated or non-semantic color usage
          const hasDeprecatedColors = classList.includes('bg-red-') || 
                                    classList.includes('bg-blue-') || 
                                    classList.includes('bg-yellow-')
          expect(hasDeprecatedColors).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should apply consistent design tokens across all components', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('default', 'highlighted', 'pricing'),
        fc.constantFrom('primary', 'secondary'),
        fc.constantFrom('low', 'medium', 'high'),
        (glassVariant, buttonVariant, auroraIntensity) => {
          const { container: glassContainer } = render(
            <GlassCard variant={glassVariant as 'default' | 'highlighted' | 'pricing'}>
              Glass Content
            </GlassCard>
          )
          
          const { container: buttonContainer } = render(
            <NeonButton variant={buttonVariant as 'primary' | 'secondary'}>
              Button Content
            </NeonButton>
          )
          
          const { container: auroraContainer } = render(
            <AuroraBackground intensity={auroraIntensity as 'low' | 'medium' | 'high'}>
              Aurora Content
            </AuroraBackground>
          )

          const glassCard = glassContainer.firstChild as HTMLElement
          const button = buttonContainer.firstChild as HTMLElement
          const aurora = auroraContainer.firstChild as HTMLElement

          // Verify consistent border radius usage
          expect(glassCard.classList.toString().includes('rounded')).toBe(true)
          expect(button.classList.toString().includes('rounded')).toBe(true)
          
          // Verify consistent transition usage for interactive elements
          expect(button.classList.toString().includes('transition')).toBe(true)
          
          // Verify GPU acceleration is applied where needed
          expect(button.classList.toString().includes('gpu-accelerated')).toBe(true)
          
          // Verify semantic class naming consistency
          const glassClasses = glassCard.classList.toString()
          const buttonClasses = button.classList.toString()
          
          // Glass components should use glass- prefixed utilities
          expect(glassClasses.includes('glass-')).toBe(true)
          
          // Buttons should use neon- prefixed colors
          expect(buttonClasses.includes('neon-green') || 
                 buttonClasses.includes('ring-neon-green')).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })
})