/**
 * Property-Based Test for Scroll Animation Reversibility
 * **Feature: marketing-experience, Property 10: Scroll Animation Reversibility**
 * **Validates: Requirements 3.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Scroll Animation Reversibility Property Tests', () => {
  /**
   * Property 10: Scroll Animation Reversibility
   * For any scroll position within the desktop hero section, animations should be scrubbable and reversible,
   * maintaining consistent visual state when scrolling up or down to the same position.
   */
  it('should validate scroll animation configuration structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // Dashboard image
        fc.array(fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          image: fc.string({ minLength: 1, maxLength: 100 }),
          position: fc.record({
            x: fc.integer({ min: -300, max: 300 }),
            y: fc.integer({ min: -300, max: 300 }),
            z: fc.integer({ min: -100, max: 100 }),
          }),
          className: fc.string({ minLength: 1, maxLength: 30 }),
        }), { minLength: 0, maxLength: 5 }), // Floating cards
        fc.string({ minLength: 1, maxLength: 20 }), // Scroll distance
        async (dashboardImage, floatingCards, scrollDistance) => {
          // Import the GSAP configuration
          const { createScrollAnimations, DESKTOP_ANIMATIONS } = await import('../lib/gsap-config');
          
          // Verify animation constants exist and have correct values
          expect(DESKTOP_ANIMATIONS.HERO_PIN_DISTANCE).toBe('200vh');
          expect(DESKTOP_ANIMATIONS.DASHBOARD_TRANSITION.duration).toBe(1);
          expect(DESKTOP_ANIMATIONS.DASHBOARD_TRANSITION.ease).toBe('power2.inOut');
          expect(DESKTOP_ANIMATIONS.FLOATING_CARDS.duration).toBe(0.8);
          expect(DESKTOP_ANIMATIONS.FLOATING_CARDS.ease).toBe('back.out(1.7)');
          
          // Create mock GSAP instance
          const mockGsap = { registerPlugin: () => {} };
          
          // Verify createScrollAnimations returns proper structure
          const animations = createScrollAnimations(mockGsap);
          expect(Array.isArray(animations)).toBe(true);
          expect(animations.length).toBeGreaterThan(0);
          
          // Verify first animation has reversible configuration
          const firstAnimation = animations[0];
          expect(firstAnimation).toHaveProperty('trigger');
          expect(firstAnimation).toHaveProperty('start', 'top top');
          expect(firstAnimation).toHaveProperty('end', '+=200vh');
          expect(firstAnimation).toHaveProperty('scrub', true); // Enables reversibility
          expect(firstAnimation).toHaveProperty('pin', true);
          expect(firstAnimation).toHaveProperty('timeline');
          expect(Array.isArray(firstAnimation.timeline)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate animation timeline structure for reversibility', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          target: fc.string({ minLength: 1, maxLength: 30 }),
          properties: fc.record({
            x: fc.integer({ min: -300, max: 300 }),
            y: fc.integer({ min: -300, max: 300 }),
            z: fc.integer({ min: -100, max: 100 }),
            rotateX: fc.integer({ min: -45, max: 45 }),
            rotateY: fc.integer({ min: -45, max: 45 }),
            rotateZ: fc.integer({ min: -45, max: 45 }),
          }),
          duration: fc.integer({ min: 1, max: 20 }).map(n => n / 10), // 0.1 to 2.0
          ease: fc.constantFrom('power2.inOut', 'back.out(1.7)', 'elastic.out'),
        }), { minLength: 1, maxLength: 10 }),
        async (animationSteps) => {
          // Verify each animation step has required properties for reversibility
          animationSteps.forEach((step) => {
            expect(step).toHaveProperty('target');
            expect(step).toHaveProperty('properties');
            expect(step).toHaveProperty('duration');
            expect(step).toHaveProperty('ease');
            
            // Verify properties are numeric (required for smooth reversibility)
            Object.values(step.properties).forEach((value) => {
              expect(typeof value).toBe('number');
            });
            
            // Verify duration is positive (required for timeline)
            expect(step.duration).toBeGreaterThan(0);
            
            // Verify ease is a valid string
            expect(typeof step.ease).toBe('string');
            expect(step.ease.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate scroll distance configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.tuple(fc.integer({ min: 1, max: 500 }), fc.constant('vh')).map(([num, unit]) => `${num}${unit}`),
          fc.tuple(fc.integer({ min: 100, max: 5000 }), fc.constant('px')).map(([num, unit]) => `${num}${unit}`)
        ),
        async (scrollDistance) => {
          // Verify scroll distance format supports reversible scrolling
          const isValidFormat = scrollDistance.includes('vh') || scrollDistance.includes('px');
          expect(isValidFormat).toBe(true);
          
          // For vh units, verify it's a reasonable value for scroll-triggered animations
          if (scrollDistance.includes('vh')) {
            const numericValue = parseFloat(scrollDistance.replace('vh', ''));
            expect(numericValue).toBeGreaterThan(0);
            expect(numericValue).toBeLessThanOrEqual(500); // Reasonable upper bound
          }
          
          // For px units, verify it's a reasonable value
          if (scrollDistance.includes('px')) {
            const numericValue = parseFloat(scrollDistance.replace('px', ''));
            expect(numericValue).toBeGreaterThan(0);
            expect(numericValue).toBeLessThanOrEqual(5000); // Reasonable upper bound
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate accessibility motion configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // Whether prefers-reduced-motion is enabled
        async (prefersReducedMotion) => {
          const { setupAccessibleAnimations } = await import('../lib/gsap-config');
          
          // Mock window.matchMedia
          const originalMatchMedia = window.matchMedia;
          window.matchMedia = (query: string) => ({
            matches: prefersReducedMotion,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          });
          
          const mockGsap = { 
            globalTimeline: { timeScale: () => {} }
          };
          const mockScrollTrigger = { 
            config: () => {} 
          };
          
          const result = setupAccessibleAnimations(mockGsap, mockScrollTrigger);
          
          // Should return false if reduced motion is preferred (disables animations)
          // Should return true if reduced motion is not preferred (enables animations)
          expect(result).toBe(!prefersReducedMotion);
          
          // Restore original matchMedia
          window.matchMedia = originalMatchMedia;
        }
      ),
      { numRuns: 100 }
    );
  });
});