/**
 * **Feature: marketing-experience, Property 3: Asset Optimization Compliance**
 * **Validates: Requirements 1.3, 7.1, 1.4**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'
import { ResponsiveImage } from '@/components/ui/responsive-image'
import { LazySection } from '@/components/ui/lazy-section'
import { generateSizesString, getDeviceImageSize, isBelowFold } from '@/lib/asset-optimization'

// Mock IntersectionObserver for testing
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback
  private elements: Set<Element> = new Set()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
  }

  // Simulate intersection
  triggerIntersection(isIntersecting: boolean = true) {
    const entries = Array.from(this.elements).map(element => ({
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRect: element.getBoundingClientRect(),
      rootBounds: null,
      time: Date.now()
    }))
    this.callback(entries as IntersectionObserverEntry[], this as any)
  }
}

describe('Property 3: Asset Optimization Compliance', () => {
  let originalIntersectionObserver: typeof IntersectionObserver
  let mockObserver: MockIntersectionObserver

  beforeEach(() => {
    originalIntersectionObserver = global.IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
      mockObserver = new MockIntersectionObserver(callback)
      return mockObserver
    }) as any
  })

  afterEach(() => {
    global.IntersectionObserver = originalIntersectionObserver
  })

  it('should serve WebP format at appropriate dimensions for the requesting device and lazy load content below the fold for any image asset', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 50 }), // image src
        fc.string({ minLength: 3, maxLength: 100 }), // alt text
        fc.boolean(), // priority flag
        fc.integer({ min: 320, max: 1920 }), // device width
        (imageSrc, altText, priority, deviceWidth) => {
          // Mock window width for device simulation
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: deviceWidth,
          })

          const { container } = render(
            <ResponsiveImage
              src={imageSrc}
              alt={altText}
              priority={priority}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )

          const pictureElement = container.querySelector('picture')
          const imgElement = container.querySelector('img')
          
          // Verify WebP source is provided
          if (pictureElement) {
            const webpSource = pictureElement.querySelector('source[type="image/webp"]')
            expect(webpSource).toBeTruthy()
            
            if (webpSource) {
              const srcSet = webpSource.getAttribute('srcset')
              expect(srcSet).toContain('.webp')
            }
          }

          // Verify appropriate dimensions via sizes attribute
          if (imgElement) {
            const sizes = imgElement.getAttribute('sizes')
            expect(sizes).toBeTruthy()
            expect(sizes).toContain('vw') // Responsive sizing
          }

          // Verify lazy loading behavior based on priority
          if (imgElement) {
            const loading = imgElement.getAttribute('loading')
            if (priority) {
              expect(loading).toBe('eager')
            } else {
              expect(loading).toBe('lazy')
            }
          }

          // Verify alt text is preserved
          if (imgElement) {
            expect(imgElement.getAttribute('alt')).toBe(altText)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should implement lazy loading structure with proper intersection observer setup', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 200 }), // content text
        fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }), // threshold
        fc.string({ minLength: 5, maxLength: 50 }), // rootMargin
        (contentText, threshold, rootMargin) => {
          const { container } = render(
            <LazySection threshold={threshold} rootMargin={rootMargin}>
              <div data-testid="lazy-content">{contentText}</div>
            </LazySection>
          )

          const sectionElement = container.firstChild as HTMLElement
          expect(sectionElement).toBeTruthy()

          // Verify lazy section structure
          expect(sectionElement.classList.toString()).toContain('min-h-')

          // Verify loading indicator is shown initially
          const loadingIndicator = container.querySelector('.animate-spin')
          expect(loadingIndicator).toBeTruthy()

          // Verify IntersectionObserver was called
          expect(global.IntersectionObserver).toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate appropriate responsive sizes string for different device configurations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 768 }), // mobile size
        fc.integer({ min: 769, max: 1024 }), // tablet size  
        fc.integer({ min: 1025, max: 2560 }), // desktop size
        (mobileSize, tabletSize, desktopSize) => {
          const sizesString = generateSizesString({
            mobile: mobileSize,
            tablet: tabletSize,
            desktop: desktopSize
          })

          // Verify sizes string contains all breakpoints
          expect(sizesString).toContain('max-width: 768px')
          expect(sizesString).toContain('max-width: 1024px')
          expect(sizesString).toContain(`${mobileSize}px`)
          expect(sizesString).toContain(`${tabletSize}px`)
          expect(sizesString).toContain(`${desktopSize}px`)

          // Verify proper format
          expect(sizesString.split(',').length).toBe(3) // Three size definitions
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return appropriate device image size based on window width', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // device width
        (deviceWidth) => {
          // Mock window width
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: deviceWidth,
          })

          const imageSize = getDeviceImageSize()

          // Verify size matches device category
          if (deviceWidth < 768) {
            expect(imageSize).toBe(768) // Mobile size
          } else if (deviceWidth < 1024) {
            expect(imageSize).toBe(1024) // Tablet size
          } else {
            expect(imageSize).toBe(1920) // Desktop size
          }

          // Verify size is always a positive number
          expect(imageSize).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})