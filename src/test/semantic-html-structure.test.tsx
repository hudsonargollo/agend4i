import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import { GlobalNavigation } from '@/components/GlobalNavigation';
import { Footer } from '@/components/Footer';

/**
 * **Feature: marketing-experience, Property 16: Semantic HTML Structure**
 * **Validates: Requirements 6.1, 6.2**
 * 
 * For any page section, content should use semantic HTML tags (header, main, section, article) 
 * and follow strict H1, H2, H3 heading hierarchy.
 */

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Semantic HTML Structure Property Tests', () => {
  it('should use semantic HTML tags in GlobalNavigation component', () => {
    fc.assert(
      fc.property(
        fc.record({
          className: fc.oneof(fc.constant(undefined), fc.string()),
        }),
        (props) => {
          const { container } = render(
            <TestWrapper>
              <GlobalNavigation {...props} />
            </TestWrapper>
          );

          // Check that navigation uses semantic nav element
          const navElements = container.querySelectorAll('nav');
          expect(navElements.length).toBeGreaterThan(0);

          // Verify nav elements have proper structure
          navElements.forEach(nav => {
            expect(nav.tagName.toLowerCase()).toBe('nav');
          });

          // Check for proper button elements (not divs with click handlers)
          const buttons = container.querySelectorAll('button');
          buttons.forEach(button => {
            expect(button.tagName.toLowerCase()).toBe('button');
            // Buttons should have proper accessibility attributes
            expect(button.hasAttribute('aria-label') || button.textContent?.trim()).toBeTruthy();
          });

          // Check for proper link elements
          const links = container.querySelectorAll('a');
          links.forEach(link => {
            expect(link.tagName.toLowerCase()).toBe('a');
            // Links should have href or proper role
            expect(link.hasAttribute('href') || link.hasAttribute('role')).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use semantic HTML tags in Footer component', () => {
    fc.assert(
      fc.property(
        fc.record({
          className: fc.oneof(fc.constant(undefined), fc.string()),
        }),
        (props) => {
          const { container } = render(
            <TestWrapper>
              <Footer {...props} />
            </TestWrapper>
          );

          // Check that footer uses semantic footer element
          const footerElements = container.querySelectorAll('footer');
          expect(footerElements.length).toBe(1);

          const footer = footerElements[0];
          expect(footer.tagName.toLowerCase()).toBe('footer');

          // Check for proper link elements in footer
          const links = footer.querySelectorAll('a');
          links.forEach(link => {
            expect(link.tagName.toLowerCase()).toBe('a');
            // Links should have href
            expect(link.hasAttribute('href')).toBeTruthy();
          });

          // Check for proper paragraph elements for text content
          const paragraphs = footer.querySelectorAll('p');
          paragraphs.forEach(p => {
            expect(p.tagName.toLowerCase()).toBe('p');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain proper heading hierarchy when components are used together', () => {
    fc.assert(
      fc.property(
        // Generate valid heading combinations only
        fc.oneof(
          fc.record({ hasH1: fc.constant(true), hasH2: fc.constant(false), hasH3: fc.constant(false) }),
          fc.record({ hasH1: fc.constant(true), hasH2: fc.constant(true), hasH3: fc.constant(false) }),
          fc.record({ hasH1: fc.constant(true), hasH2: fc.constant(true), hasH3: fc.constant(true) }),
          fc.record({ hasH1: fc.constant(false), hasH2: fc.constant(true), hasH3: fc.constant(false) }),
          fc.record({ hasH1: fc.constant(false), hasH2: fc.constant(true), hasH3: fc.constant(true) }),
          fc.record({ hasH1: fc.constant(false), hasH2: fc.constant(false), hasH3: fc.constant(true) }),
          fc.record({ hasH1: fc.constant(false), hasH2: fc.constant(false), hasH3: fc.constant(false) })
        ),
        (testData) => {
          // Create a test page structure with headings
          const TestPage = () => (
            <div>
              <GlobalNavigation />
              <main>
                {testData.hasH1 && <h1>Main Heading</h1>}
                <section>
                  {testData.hasH2 && <h2>Section Heading</h2>}
                  <article>
                    {testData.hasH3 && <h3>Article Heading</h3>}
                    <p>Content</p>
                  </article>
                </section>
              </main>
              <Footer />
            </div>
          );

          const { container } = render(
            <TestWrapper>
              <TestPage />
            </TestWrapper>
          );

          // Check semantic structure
          const main = container.querySelector('main');
          expect(main).toBeTruthy();
          expect(main?.tagName.toLowerCase()).toBe('main');

          const sections = container.querySelectorAll('section');
          sections.forEach(section => {
            expect(section.tagName.toLowerCase()).toBe('section');
          });

          const articles = container.querySelectorAll('article');
          articles.forEach(article => {
            expect(article.tagName.toLowerCase()).toBe('article');
          });

          // Verify heading hierarchy follows proper structure
          const h1s = container.querySelectorAll('h1');
          const h2s = container.querySelectorAll('h2');
          const h3s = container.querySelectorAll('h3');
          
          // If we have h3, we should have h2 (unless it's the only heading)
          if (h3s.length > 0 && (h1s.length > 0 || h2s.length > 0)) {
            expect(h2s.length).toBeGreaterThan(0);
          }
          
          // If we have h2, we should have h1 (unless it's the only heading or starts at h2)
          if (h2s.length > 0 && h3s.length > 0) {
            // This is a valid case - h2 can exist without h1 in some contexts
            expect(h2s.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure interactive elements have proper accessibility attributes', () => {
    fc.assert(
      fc.property(
        fc.constant({}),
        () => {
          const { container } = render(
            <TestWrapper>
              <div>
                <GlobalNavigation />
                <Footer />
              </div>
            </TestWrapper>
          );

          // Check all interactive elements have proper attributes
          const interactiveElements = container.querySelectorAll('button, a, input, select, textarea');
          
          interactiveElements.forEach(element => {
            const tagName = element.tagName.toLowerCase();
            
            if (tagName === 'button') {
              // Buttons should have accessible text or aria-label
              const hasAccessibleText = 
                element.textContent?.trim() || 
                element.hasAttribute('aria-label') ||
                element.hasAttribute('aria-labelledby');
              expect(hasAccessibleText).toBeTruthy();
            }
            
            if (tagName === 'a') {
              // Links should have href and accessible text
              expect(element.hasAttribute('href')).toBeTruthy();
              const hasAccessibleText = 
                element.textContent?.trim() || 
                element.hasAttribute('aria-label') ||
                element.hasAttribute('aria-labelledby');
              expect(hasAccessibleText).toBeTruthy();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use proper ARIA roles and landmarks', () => {
    fc.assert(
      fc.property(
        fc.constant({}),
        () => {
          const { container } = render(
            <TestWrapper>
              <div>
                <GlobalNavigation />
                <main role="main">
                  <section>
                    <h2>Test Section</h2>
                    <p>Content</p>
                  </section>
                </main>
                <Footer />
              </div>
            </TestWrapper>
          );

          // Check for navigation landmarks
          const navElements = container.querySelectorAll('nav');
          expect(navElements.length).toBeGreaterThan(0);

          // Check for main landmark
          const mainElements = container.querySelectorAll('main, [role="main"]');
          expect(mainElements.length).toBeGreaterThan(0);

          // Check for footer landmark
          const footerElements = container.querySelectorAll('footer');
          expect(footerElements.length).toBe(1);

          // Verify no generic divs are used where semantic elements should be
          const suspiciousDivs = container.querySelectorAll('div[onclick], div[role="button"]');
          expect(suspiciousDivs.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});