import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BentoGrid, defaultBentoTiles } from '@/components/BentoGrid'

describe('BentoGrid Component', () => {
  it('should render with default tiles', () => {
    render(<BentoGrid tiles={defaultBentoTiles} />)
    
    // Check that the main heading is rendered
    expect(screen.getByText('Tudo que você precisa em um só lugar')).toBeInTheDocument()
    
    // Check that some of the default tiles are rendered
    expect(screen.getByText('Múltiplos Profissionais')).toBeInTheDocument()
    expect(screen.getByText('Relatórios Financeiros')).toBeInTheDocument()
    expect(screen.getByText('App Mobile')).toBeInTheDocument()
  })

  it('should render custom tiles', () => {
    const customTiles = [
      {
        id: 'test-tile',
        title: 'Test Tile',
        size: 'small' as const,
        content: <div>Test Content</div>
      }
    ]

    render(<BentoGrid tiles={customTiles} />)
    
    expect(screen.getByText('Test Tile')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should apply correct size classes', () => {
    const tiles = [
      {
        id: 'small-tile',
        title: 'Small',
        size: 'small' as const,
        content: <div>Small content</div>
      },
      {
        id: 'medium-tile',
        title: 'Medium',
        size: 'medium' as const,
        content: <div>Medium content</div>
      },
      {
        id: 'large-tile',
        title: 'Large',
        size: 'large' as const,
        content: <div>Large content</div>
      }
    ]

    const { container } = render(<BentoGrid tiles={tiles} />)
    
    // Check that tiles are rendered with appropriate grid classes
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-2', 'md:grid-cols-4')
  })
})