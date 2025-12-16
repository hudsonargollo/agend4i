/**
 * **Feature: marketing-experience, Property 2: Mobile Layout Consistency**
 * **Validates: Requirements 1.2, 6.4, 6.5**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import MobileHero from '@/components/MobileHero'

// Mock window.innerWidth for mobile testing
const mockWindowWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

describe('Property 2: Mobile Layout Consistency', () => {
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

  it('should render content in vertical flex stack layout without horizontal scrolling and use minimum 16px base font size for any device with screen width < 768px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }), // Mobile screen widths
        fc.string({ minLength: 5, maxLength: 100 }), // headline
        fc.string({ minLength: 10, maxLength: 200 }), // subheadline
        fc.string({ minLength: 3, maxLength: 50 }), // ctaText
        fc.string({ minLength: 3, maxLength: 50 }), // ctaHoverText
        (screenWidth, headline, subheadline, ctaText, ctaHoverText) => {
          // Set mobile screen width
          mockWindowWidth(screenWidth)

          const { container } = render(
            <MobileHero
              headline={headline}
              subheadline={subheadline}
              ctaText={ctaText}
              ctaHoverText={ctaHoverText}
            />
          )

          const heroSection = container.firstChild as HTMLElement
          expect(heroSection).toBeTruthy()

          // Verify vertical flex layout via CSS classes
          const sectionClassList = heroSection.classList.toString()
          expect(sectionClassList.includes('flex')).toBe(true)
          expect(sectionClassList.includes('flex-col')).toBe(true)

          // Verify no horizontal scrolling by checking container width
          expect(heroSection.scrollWidth).toBeLessThanOrEqual(heroSection.clientWidth)

          // Verify minimum font size compliance via CSS classes
          const headlineElement = heroSection.querySelector('h1')
          const subheadlineElement = heroSection.querySelector('p')
          
          if (headlineElement) {
            const headlineClasses = headlineElement.classList.toString()
            // text-4xl (2.25rem = 36px) and md:text-5xl (3rem = 48px) are both > 16px
            expect(headlineClasses.includes('text-4xl') || headlineClasses.includes('text-5xl')).toBe(true)
          }

          if (subheadlineElement) {
            const subheadlineClasses = subheadlineElement.classList.toString()
            // text-lg (1.125rem = 18px) is > 16px minimum
            expect(subheadlineClasses.includes('text-lg')).toBe(true)
          }

          // Verify content is properly contained within mobile viewport
          const rect = heroSection.getBoundingClientRect()
          expect(rect.width).toBeLessThanOrEqual(screenWidth)

          // Verify responsive padding is applied
          const heroClassList = heroSection.classList.toString()
          expect(heroClassList.includes('px-4')).toBe(true) // Mobile padding
        }
      ),
      { numRuns: 100 }
    )
  })
})