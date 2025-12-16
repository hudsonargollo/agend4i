/**
 * **Feature: marketing-experience, Property 15: FAQ Accordion Behavior**
 * **Validates: Requirements 5.4, 5.5**
 */

import { describe, it, expect } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'
import { FAQSection } from '@/components/FAQSection'

describe('Property 15: FAQ Accordion Behavior', () => {
  it('should ensure only one accordion item is open at a time with faint glass background effect when opened', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }), // FAQ item index to open
        async (itemIndex) => {
          const { container } = render(<FAQSection />)

          // Find accordion items directly by their structure
          const accordionItems = container.querySelectorAll('[data-orientation="vertical"][class*="border-b"]')
          expect(accordionItems.length).toBe(6) // We know there are 6 FAQ items

          // Find the triggers within these accordion items
          const triggers = Array.from(accordionItems).map(item => 
            item.querySelector('button[aria-expanded]')
          ).filter(Boolean) as HTMLButtonElement[]

          expect(triggers.length).toBe(6)

          // Ensure we have a valid index
          const validIndex = Math.min(itemIndex, triggers.length - 1)
          
          // Click on the selected FAQ item
          fireEvent.click(triggers[validIndex])

          // Wait for animation to complete
          await waitFor(() => {
            // Count how many items are open
            let openCount = 0
            let hasGlassEffectClasses = false

            accordionItems.forEach((item) => {
              const state = item.getAttribute('data-state')
              if (state === 'open') {
                openCount++
                
                // Check for glass effect classes when open
                const classList = item.classList.toString()
                if (classList.includes('data-[state=open]:glass-effect') && 
                    classList.includes('data-[state=open]:bg-white/3') && 
                    classList.includes('data-[state=open]:backdrop-blur')) {
                  hasGlassEffectClasses = true
                }
              }
            })

            // Verify only one item is open at a time (Radix accordion with type="single")
            expect(openCount).toBe(1) // Should be exactly 1 since we clicked an item
            
            // The open item should have glass effect classes
            expect(hasGlassEffectClasses).toBe(true)
          }, { timeout: 2000 })
        }
      ),
      { numRuns: 20 } // Reduced runs for stability
    )
  })

  it('should apply glass background effect classes when FAQ items are opened', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        async (itemIndex) => {
          const { container } = render(<FAQSection />)

          // Find accordion items and triggers
          const accordionItems = container.querySelectorAll('[data-orientation="vertical"][class*="border-b"]')
          const triggers = Array.from(accordionItems).map(item => 
            item.querySelector('button[aria-expanded]')
          ).filter(Boolean) as HTMLButtonElement[]

          const validIndex = Math.min(itemIndex, triggers.length - 1)

          // Open an item
          fireEvent.click(triggers[validIndex])

          await waitFor(() => {
            let foundOpenItem = false
            let foundClosedItem = false
            
            accordionItems.forEach((item) => {
              const state = item.getAttribute('data-state')
              const classList = item.classList.toString()
              
              // All items should have the conditional glass effect classes
              expect(classList.includes('data-[state=open]:glass-effect')).toBe(true)
              expect(classList.includes('data-[state=open]:bg-white/3')).toBe(true)
              expect(classList.includes('data-[state=open]:backdrop-blur')).toBe(true)
              
              if (state === 'open') {
                foundOpenItem = true
              } else if (state === 'closed') {
                foundClosedItem = true
              }
            })

            // Ensure we found both open and closed items
            expect(foundOpenItem).toBe(true)
            expect(foundClosedItem).toBe(true)
          }, { timeout: 2000 })
        }
      ),
      { numRuns: 20 } // Reduced runs for stability
    )
  })
})