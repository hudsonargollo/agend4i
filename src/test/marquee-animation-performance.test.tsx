import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import SocialProofSection from '@/components/SocialProofSection';

/**
 * **Feature: marketing-experience, Property 13: Marquee Animation Performance**
 * **Validates: Requirements 4.2**
 * 
 * Property: For any logo marquee display, the system should implement infinite horizontal scroll 
 * with GPU acceleration and proper performance optimization.
 */

interface CompanyLogo {
  name: string;
  logo: string;
  alt: string;
}

describe('Marquee Animation Performance Property Tests', () => {
  fc.test.prop([
    fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        logo: fc.webUrl(),
        alt: fc.string({ minLength: 1, maxLength: 100 })
      }),
      { minLength: 1, maxLength: 20 }
    )
  ])('should implement GPU-accelerated infinite scroll for any logo array', (logos: CompanyLogo[]) => {
    const { container } = render(<SocialProofSection logos={logos} />);
    
    // Check that marquee container exists
    const marqueeContainer = container.querySelector('.marquee-container');
    expect(marqueeContainer).toBeInTheDocument();
    
    // Check that marquee content has GPU acceleration class
    const marqueeContent = container.querySelector('.marquee-content');
    expect(marqueeContent).toBeInTheDocument();
    expect(marqueeContent).toHaveClass('gpu-accelerated');
    
    // Verify infinite scroll animation is applied
    const computedStyle = window.getComputedStyle(marqueeContent!);
    expect(computedStyle.animation).toContain('marquee');
    
    // Check that logos are duplicated for seamless infinite scroll
    const logoImages = screen.getAllByRole('img');
    expect(logoImages.length).toBe(logos.length * 2); // Should be duplicated
    
    // Verify each logo appears exactly twice (original + duplicate)
    logos.forEach(logo => {
      const logoElements = screen.getAllByAltText(logo.alt);
      expect(logoElements).toHaveLength(2);
    });
  }, { numRuns: 100 });

  fc.test.prop([
    fc.string({ minLength: 1, maxLength: 200 })
  ])('should maintain performance optimization regardless of statement length', (statement: string) => {
    const { container } = render(<SocialProofSection statement={statement} />);
    
    // Check that the component renders without performance issues
    const marqueeContent = container.querySelector('.marquee-content');
    expect(marqueeContent).toBeInTheDocument();
    
    // Verify GPU acceleration is maintained
    expect(marqueeContent).toHaveClass('gpu-accelerated');
    
    // Check that animation properties are correctly applied
    const computedStyle = window.getComputedStyle(marqueeContent!);
    expect(computedStyle.animationDuration).toBe('30s');
    expect(computedStyle.animationTimingFunction).toBe('linear');
    expect(computedStyle.animationIterationCount).toBe('infinite');
  }, { numRuns: 100 });

  fc.test.prop([
    fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        logo: fc.webUrl(),
        alt: fc.string({ minLength: 1, maxLength: 100 })
      }),
      { minLength: 1, maxLength: 50 }
    )
  ])('should apply hover effects with neon green highlights for any logo set', (logos: CompanyLogo[]) => {
    const { container } = render(<SocialProofSection logos={logos} />);
    
    // Check that logo wrappers have proper hover classes
    const logoWrappers = container.querySelectorAll('.logo-wrapper');
    expect(logoWrappers.length).toBe(logos.length * 2); // Duplicated logos
    
    logoWrappers.forEach(wrapper => {
      // Verify hover classes are present for neon green highlights
      expect(wrapper).toHaveClass('hover:border-neon-green/30');
      expect(wrapper).toHaveClass('hover:bg-white/10');
    });
    
    // Check that logo images have proper hover effects
    const logoImages = container.querySelectorAll('.logo-image');
    logoImages.forEach(image => {
      expect(image).toHaveClass('group-hover:grayscale-0');
      expect(image).toHaveClass('group-hover:opacity-100');
      expect(image).toHaveClass('group-hover:drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]');
    });
  }, { numRuns: 100 });
});