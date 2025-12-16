import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PricingCard } from '@/components/PricingCard'
import { PricingSection } from '@/components/PricingSection'

describe('PricingCard', () => {
  it('renders free tier correctly', () => {
    render(
      <PricingCard
        tier="free"
        title="Gratuito"
        price={0}
        period="monthly"
        features={['Feature 1', 'Feature 2']}
        ctaText="Começar Grátis"
      />
    )
    
    expect(screen.getByText('Gratuito')).toBeInTheDocument()
    expect(screen.getByText('R$ 0')).toBeInTheDocument()
    expect(screen.getByText('Começar Grátis')).toBeInTheDocument()
    expect(screen.getByText('Feature 1')).toBeInTheDocument()
  })

  it('renders pro tier with popular badge', () => {
    render(
      <PricingCard
        tier="pro"
        title="Profissional"
        price={29}
        period="monthly"
        features={['Pro Feature 1', 'Pro Feature 2']}
        ctaText="Começar Teste"
        popular={true}
      />
    )
    
    expect(screen.getByText('Profissional')).toBeInTheDocument()
    expect(screen.getByText('R$ 29')).toBeInTheDocument()
    expect(screen.getByText('Popular')).toBeInTheDocument()
    expect(screen.getByText('Começar Teste')).toBeInTheDocument()
  })

  it('shows discount when original price is provided', () => {
    render(
      <PricingCard
        tier="pro"
        title="Profissional"
        price={290}
        originalPrice={348}
        period="yearly"
        features={['Feature 1']}
        ctaText="Começar"
      />
    )
    
    expect(screen.getByText('R$ 348')).toBeInTheDocument()
    expect(screen.getByText('R$ 290')).toBeInTheDocument()
    expect(screen.getByText('Economize 17%')).toBeInTheDocument()
  })
})

describe('PricingSection', () => {
  it('renders pricing section with toggle', () => {
    render(<PricingSection />)
    
    expect(screen.getByText('Planos que Crescem com Você')).toBeInTheDocument()
    expect(screen.getByText('Mensal')).toBeInTheDocument()
    expect(screen.getByText('Anual')).toBeInTheDocument()
    expect(screen.getByText('Gratuito')).toBeInTheDocument()
    expect(screen.getByText('Profissional')).toBeInTheDocument()
  })

  it('toggles between monthly and yearly pricing', () => {
    render(<PricingSection />)
    
    // Initially should show monthly pricing
    expect(screen.getByText('R$ 29')).toBeInTheDocument()
    
    // Click yearly toggle
    fireEvent.click(screen.getByText('Anual'))
    
    // Should show yearly pricing
    expect(screen.getByText('R$ 290')).toBeInTheDocument()
    expect(screen.getByText('R$ 348')).toBeInTheDocument() // Original price
  })

  it('shows discount badge on yearly toggle', () => {
    render(<PricingSection />)
    
    expect(screen.getByText('-17%')).toBeInTheDocument()
  })
})