import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SocialProofSection from '@/components/SocialProofSection';

describe('SocialProofSection', () => {
  it('renders with default statement', () => {
    render(<SocialProofSection />);
    
    expect(screen.getByText('Simplificando a vida de +500 profissionais')).toBeInTheDocument();
  });

  it('renders with custom statement', () => {
    const customStatement = "Trusted by 1000+ professionals";
    render(<SocialProofSection statement={customStatement} />);
    
    expect(screen.getByText(customStatement)).toBeInTheDocument();
  });

  it('renders logo images with proper attributes', () => {
    render(<SocialProofSection />);
    
    const logoImages = screen.getAllByRole('img');
    expect(logoImages.length).toBeGreaterThan(0);
    
    // Check that images have proper alt text and loading attributes
    logoImages.forEach(img => {
      expect(img).toHaveAttribute('alt');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  it('duplicates logos for seamless scroll', () => {
    const customLogos = [
      { name: 'Test Logo 1', logo: '/test1.svg', alt: 'Test 1' },
      { name: 'Test Logo 2', logo: '/test2.svg', alt: 'Test 2' },
    ];
    
    render(<SocialProofSection logos={customLogos} />);
    
    // Should render each logo twice (original + duplicate)
    expect(screen.getAllByAltText('Test 1')).toHaveLength(2);
    expect(screen.getAllByAltText('Test 2')).toHaveLength(2);
  });
});