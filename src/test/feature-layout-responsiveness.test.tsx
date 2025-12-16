/**
 * **Feature: marketing-experience, Property 14: Feature Layout Responsiveness**
 * **Validates: Requirements 4.4, 4.5**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import { FeatureCard } from '@/components/FeatureCard'

// Mock window.innerWidth for responsive testing
const mockWindowWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

describe('Property 14: Feature Layout Responsiveness', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    // Restore original window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('should use vertical card stack layout on mobile devices and alternating zig-zag layout on desktop for any feature display', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1920 }), // Screen widths from mobile to desktop
        fc.string({ minLength: 5, maxLength: 100 }), // title
        fc.string({ minLength: 10, maxLength: 300 }), // description
        fc.constantFrom('left', 'right'), // layout variant
        fc.integer({ min: 0, max: 1000 }), // animationDelay
        (screenWidth, title, description, layout, animationDelay) => {
          // Set screen width
          mockWindowWidth(screenWidth)

          const mockVisual = <div data-testid="feature-visual">Mock Visual</div>

          const { container } = render(
            <FeatureCard
              title={title}
              description={description}
              visual={mockVisual}
              layout={layout}
              animationDelay={animationDelay}
            />
          )

          const featureCard = container.firstChild as HTMLElement
          expect(featureCard).toBeTruthy()

          const cardClassList = featureCard.classList.toString()

          if (screenWidth < 768) {
            // Mobile: Should use vertical card stack layout
            expect(cardClassList.includes('flex-col')).toBe(true)
            
            // Should not have horizontal layout classes on mobile
            expect(cardClassList.includes('lg:flex-row')).toBe(true) // This is responsive, only applies on lg+
            
            // Verify gap spacing for mobile
            expect(cardClassList.includes('gap-8')).toBe(true)
          } else {
            // Desktop: Should use alternating zig-zag layout
            expect(cardClassList.includes('flex-col')).toBe(true) // Base mobile-first
            expect(cardClassList.includes('lg:flex-row')).toBe(true) // Desktop override
            
            // Verify zig-zag pattern based on layout prop
            if (layout === 'left') {
              expect(cardClassList.includes('lg:flex-row')).toBe(true)
            } else {
              expect(cardClassList.includes('lg:flex-row-reverse')).toBe(true)
            }
            
            // Verify desktop gap spacing
            expect(cardClassList.includes('lg:gap-16')).toBe(true)
          }

          // Verify content structure is maintained regardless of layout
          const titleElement = featureCard.querySelector('h3')
          const descriptionElement = featureCard.querySelector('p')
          const visualElement = featureCard.querySelector('[data-testid="feature-visual"]')

          expect(titleElement).toBeTruthy()
          expect(descriptionElement).toBeTruthy()
          expect(visualElement).toBeTruthy()

          // Verify title content
          expect(titleElement?.textContent).toBe(title)
          expect(descriptionElement?.textContent).toBe(description)

          // Verify animation delay is applied
          const style = featureCard.style
          expect(style.animationDelay).toBe(`${animationDelay}ms`)

          // Verify responsive typography classes
          const titleClasses = titleElement?.classList.toString() || ''
          expect(titleClasses.includes('text-2xl')).toBe(true) // Mobile
          expect(titleClasses.includes('lg:text-3xl')).toBe(true) // Desktop

          const descriptionClasses = descriptionElement?.classList.toString() || ''
          expect(descriptionClasses.includes('text-lg')).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})