import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PricingSection } from '@/components/PricingSection'

describe('PricingSection Integration', () => {
  it('can be imported and rendered without errors', () => {
    const { container } = render(<PricingSection />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('follows AgendAi design system classes', () => {
    const { container } = render(<PricingSection />)
    
    // Check for design system classes
    const section = container.querySelector('section')
    expect(section).toHaveClass('section-padding-mobile')
    expect(section).toHaveClass('container-padding')
    
    // Check for neon green elements
    const neonElements = container.querySelectorAll('.bg-neon-green, .text-neon-green, .border-neon-green')
    expect(neonElements.length).toBeGreaterThan(0)
  })

  it('uses glassmorphism effects', () => {
    const { container } = render(<PricingSection />)
    
    // Check for glass effects
    const glassElements = container.querySelectorAll('.glass-effect, .glass-highlighted, .glass-pricing')
    expect(glassElements.length).toBeGreaterThan(0)
  })
})