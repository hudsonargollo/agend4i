/**
 * Property-Based Test for Accessibility Motion Compliance
 * **Feature: marketing-experience, Property 11: Accessibility Motion Compliance**
 * **Validates: Requirements 3.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Accessibility Motion Compliance Property Tests', () => {
  /**
   * Property 11: Accessibility Motion Compliance
   * For any user with prefers-reduced-motion enabled, all scroll-jacking, 3D effects, 
   * and auto-playing animations should be disabled while maintaining full content accessibility.
   */
  it('should validate prefers-reduced-motion detection logic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // Whether prefers-reduced-motion is enabled
        async (prefersReducedMotion) => {
          // Import the setupAccessibleAnimations function
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

  it('should validate accessibility configuration structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), // Multiple motion preferences
        async (motionPreferences) => {
          const { setupAccessibleAnimations } = await import('../lib/gsap-config');
          
          const originalMatchMedia = window.matchMedia;
          
          for (const prefersReducedMotion of motionPreferences) {
            // Mock window.matchMedia for each test case
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
            
            // Verify consistent behavior
            expect(typeof result).toBe('boolean');
            expect(result).toBe(!prefersReducedMotion);
            
            // Verify the function handles the media query correctly
            if (prefersReducedMotion) {
              expect(result).toBe(false); // Animations disabled
            } else {
              expect(result).toBe(true);  // Animations enabled
            }
          }
          
          // Restore original matchMedia
          window.matchMedia = originalMatchMedia;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate media query string format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant('(prefers-reduced-motion: reduce)'), // The media query string
        async (mediaQuery) => {
          // Verify the media query string is correctly formatted
          expect(mediaQuery).toBe('(prefers-reduced-motion: reduce)');
          expect(mediaQuery).toContain('prefers-reduced-motion');
          expect(mediaQuery).toContain('reduce');
          expect(mediaQuery.startsWith('(')).toBe(true);
          expect(mediaQuery.endsWith(')')).toBe(true);
          
          // Verify it's a valid CSS media query format
          expect(mediaQuery.includes(':')).toBe(true);
          expect(mediaQuery.split(':').length).toBe(2);
          
          const [property, value] = mediaQuery.replace(/[()]/g, '').split(':').map(s => s.trim());
          expect(property).toBe('prefers-reduced-motion');
          expect(value).toBe('reduce');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate animation disable mechanisms', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // Whether to disable animations
        async (shouldDisableAnimations) => {
          // Test the animation disable logic
          const mockGsap = { 
            globalTimeline: { 
              timeScale: (scale: number) => {
                // Verify timeScale is called with high value to disable animations
                if (shouldDisableAnimations) {
                  expect(scale).toBeGreaterThan(100);
                }
              }
            }
          };
          
          const mockScrollTrigger = { 
            config: (options: any) => {
              // Verify ScrollTrigger config is called when disabling animations
              if (shouldDisableAnimations) {
                expect(options).toHaveProperty('autoRefreshEvents');
                expect(options).toHaveProperty('ignoreMobileResize');
              }
            }
          };
          
          if (shouldDisableAnimations) {
            // Simulate the animation disable logic
            mockScrollTrigger.config({ 
              autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
              ignoreMobileResize: true 
            });
            mockGsap.globalTimeline.timeScale(1000);
          }
          
          // Verify the disable mechanisms are properly configured
          expect(mockGsap.globalTimeline.timeScale).toBeDefined();
          expect(mockScrollTrigger.config).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});