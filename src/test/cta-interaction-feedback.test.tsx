/**
 * **Feature: marketing-experience, Property 19: CTA Interaction Feedback**
 * **Validates: Requirements 8.4, 8.5**
 * 
 * Property: For any call-to-action interaction, the system should provide clear visual feedback, 
 * smooth transitions, and enable proper conversion metric tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import { TrackedCTAButton, PrimaryCTAButton, SecondaryCTAButton } from '../components/ui/tracked-cta-button';
import { useCTAFeedback } from '../hooks/useCTAFeedback';
import { conversionTracker } from '../lib/conversion-tracking';

// Mock the conversion tracker
vi.mock('../lib/conversion-tracking', () => ({
  conversionTracker: {
    trackCTAInteraction: vi.fn().mockResolvedValue(undefined),
    trackFunnelStep: vi.fn(),
    trackEngagement: vi.fn()
  },
  useCTATracking: () => ({
    trackCTA: vi.fn().mockResolvedValue(undefined),
    trackFunnel: vi.fn(),
    trackEngagement: vi.fn()
  })
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('CTA Interaction Feedback Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location for navigation tests
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000/' },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Property 19: CTA interactions provide visual feedback and tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random CTA configurations
        fc.record({
          ctaText: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 1).map(s => s.trim()),
          ctaLocation: fc.constantFrom('hero', 'features', 'pricing', 'footer', 'navigation'),
          variant: fc.constantFrom('primary', 'secondary'),
          size: fc.constantFrom('sm', 'md', 'lg'),
          targetUrl: fc.option(fc.webUrl(), { nil: undefined }),
          conversionFunnel: fc.constantFrom('main_signup', 'secondary_engagement', 'pricing_inquiry')
        }),
        async (ctaConfig) => {
          // Render CTA button with generated configuration
          const ctaData = {
            ctaType: ctaConfig.variant as 'primary' | 'secondary',
            ctaText: ctaConfig.ctaText,
            ctaLocation: ctaConfig.ctaLocation,
            targetUrl: ctaConfig.targetUrl,
            conversionFunnel: ctaConfig.conversionFunnel
          };

          const mockAction = vi.fn().mockResolvedValue(undefined);

          const { container } = render(
            <TestWrapper>
              <TrackedCTAButton
                ctaData={ctaData}
                variant={ctaConfig.variant}
                size={ctaConfig.size}
                onClick={mockAction}
                feedbackOptions={{
                  loadingDuration: 100, // Faster for testing
                  successDuration: 200
                }}
              >
                {ctaConfig.ctaText}
              </TrackedCTAButton>
            </TestWrapper>
          );

          const button = container.querySelector('button');
          expect(button).toBeInTheDocument();

          // Verify initial state
          expect(button).toHaveTextContent(ctaConfig.ctaText);
          expect(button).not.toBeDisabled();

          // Click the CTA
          fireEvent.click(button!);

          // Verify loading state appears
          await waitFor(() => {
            expect(button).toHaveClass('animate-pulse');
          }, { timeout: 150 });

          // Verify conversion tracking was called
          expect(conversionTracker.trackCTAInteraction).toHaveBeenCalledWith(
            expect.objectContaining({
              ctaType: ctaConfig.variant,
              ctaText: ctaConfig.ctaText,
              ctaLocation: ctaConfig.ctaLocation,
              conversionFunnel: ctaConfig.conversionFunnel
            })
          );

          // Wait for success state
          await waitFor(() => {
            expect(button).toHaveTextContent('Redirecionando...');
          }, { timeout: 400 });

          // Verify action was called
          expect(mockAction).toHaveBeenCalledTimes(1);

          // Verify visual feedback classes are applied correctly based on variant
          if (ctaConfig.variant === 'primary') {
            expect(button).toHaveClass('bg-neon-green', 'text-brand-dark');
          } else {
            expect(button).toHaveClass('border-2', 'border-glass-surface', 'text-white');
          }

          // Verify size classes are applied correctly
          if (ctaConfig.size === 'sm') {
            expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
          } else if (ctaConfig.size === 'md') {
            expect(button).toHaveClass('px-6', 'py-3', 'text-base');
          } else {
            expect(button).toHaveClass('px-8', 'py-4', 'text-lg');
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 19: CTA error states provide appropriate feedback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ctaText: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 1).map(s => s.trim()),
          ctaLocation: fc.constantFrom('hero', 'pricing', 'features'),
          errorMessage: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 1).map(s => s.trim())
        }),
        async (config) => {
          const mockFailingAction = vi.fn().mockRejectedValue(new Error(config.errorMessage));

          const ctaData = {
            ctaType: 'primary' as const,
            ctaText: config.ctaText,
            ctaLocation: config.ctaLocation,
            conversionFunnel: 'test_funnel'
          };

          const { container } = render(
            <TestWrapper>
              <TrackedCTAButton
                ctaData={ctaData}
                onClick={mockFailingAction}
                feedbackOptions={{
                  loadingDuration: 50,
                  successDuration: 100,
                  errorMessage: 'Erro personalizado'
                }}
              >
                {config.ctaText}
              </TrackedCTAButton>
            </TestWrapper>
          );

          const button = container.querySelector('button');
          expect(button).toBeInTheDocument();

          // Click the CTA
          fireEvent.click(button!);

          // Wait for error state
          await waitFor(() => {
            expect(button).toHaveTextContent('Erro personalizado');
          }, { timeout: 200 });

          // Verify error styling is applied
          expect(button).toHaveClass('bg-red-500', 'text-white');

          // Verify action was attempted
          expect(mockFailingAction).toHaveBeenCalledTimes(1);

          // Verify conversion tracking still occurred
          expect(conversionTracker.trackCTAInteraction).toHaveBeenCalled();
        }
      ),
      { numRuns: 8 }
    );
  });

  it('Property 19: Preset CTA buttons maintain consistent behavior', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ctaText: fc.string({ minLength: 2, maxLength: 40 }).filter(s => s.trim().length > 1).map(s => s.trim()),
          ctaLocation: fc.constantFrom('hero', 'navigation', 'footer'),
          targetPath: fc.constantFrom('/auth', '/dashboard', '/onboarding'),
          buttonType: fc.constantFrom('primary', 'secondary')
        }),
        async (config) => {
          const ButtonComponent = config.buttonType === 'primary' ? PrimaryCTAButton : SecondaryCTAButton;

          const { container } = render(
            <TestWrapper>
              <ButtonComponent
                ctaLocation={config.ctaLocation}
                to={config.targetPath}
              >
                {config.ctaText}
              </ButtonComponent>
            </TestWrapper>
          );

          const button = container.querySelector('a');
          expect(button).toBeInTheDocument();

          // Verify button renders with correct text
          expect(button).toHaveTextContent(config.ctaText);

          // Verify correct variant classes are applied
          if (config.buttonType === 'primary') {
            expect(button).toHaveClass('bg-neon-green', 'text-brand-dark');
          } else {
            expect(button).toHaveClass('border-2', 'text-white');
          }

          // Verify navigation attributes
          expect(button).toHaveAttribute('href', config.targetPath);

          // Click and verify tracking
          fireEvent.click(button!);

          // Verify conversion tracking with correct funnel
          await waitFor(() => {
            expect(conversionTracker.trackCTAInteraction).toHaveBeenCalledWith(
              expect.objectContaining({
                ctaType: config.buttonType,
                ctaText: config.ctaText,
                ctaLocation: config.ctaLocation,
                targetUrl: config.targetPath,
                conversionFunnel: config.buttonType === 'primary' ? 'main_signup' : 'secondary_engagement'
              })
            );
          });
        }
      ),
      { numRuns: 8 }
    );
  });

  it('Property 19: CTA feedback hook provides consistent state management', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          loadingDuration: fc.integer({ min: 50, max: 500 }),
          successDuration: fc.integer({ min: 100, max: 1000 }),
          successMessage: fc.string({ minLength: 1, maxLength: 50 }),
          errorMessage: fc.string({ minLength: 1, max: 50 })
        }),
        async (config) => {
          let hookResult: any;

          const TestComponent = () => {
            hookResult = useCTAFeedback({
              loadingDuration: config.loadingDuration,
              successDuration: config.successDuration,
              successMessage: config.successMessage,
              errorMessage: config.errorMessage
            });

            return (
              <div>
                <span data-testid={`loading-${Date.now()}`}>{hookResult.feedbackState.isLoading.toString()}</span>
                <span data-testid={`success-${Date.now()}`}>{hookResult.feedbackState.isSuccess.toString()}</span>
                <span data-testid={`error-${Date.now()}`}>{hookResult.feedbackState.isError.toString()}</span>
                <span data-testid={`message-${Date.now()}`}>{hookResult.feedbackState.message || ''}</span>
                <button 
                  data-testid={`test-button-${Date.now()}`}
                  onClick={() => hookResult.handleCTAClick({
                    ctaType: 'primary',
                    ctaText: 'Test CTA',
                    ctaLocation: 'test',
                    conversionFunnel: 'test'
                  })}
                >
                  Test
                </button>
              </div>
            );
          };

          const { container } = render(<TestComponent />);

          const loadingSpan = container.querySelector('[data-testid*="loading"]');
          const successSpan = container.querySelector('[data-testid*="success"]');
          const errorSpan = container.querySelector('[data-testid*="error"]');
          const messageSpan = container.querySelector('[data-testid*="message"]');
          const testButton = container.querySelector('[data-testid*="test-button"]');

          // Verify initial state
          expect(loadingSpan).toHaveTextContent('false');
          expect(successSpan).toHaveTextContent('false');
          expect(errorSpan).toHaveTextContent('false');

          // Trigger CTA interaction
          fireEvent.click(testButton!);

          // Verify loading state
          await waitFor(() => {
            expect(loadingSpan).toHaveTextContent('true');
          });

          // Verify success state appears after loading duration
          await waitFor(() => {
            expect(successSpan).toHaveTextContent('true');
            expect(messageSpan).toHaveTextContent(config.successMessage);
          }, { timeout: config.loadingDuration + 200 });

          // Verify state resets after success duration
          await waitFor(() => {
            expect(successSpan).toHaveTextContent('false');
            expect(messageSpan).toHaveTextContent('');
          }, { timeout: config.successDuration + 200 });
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 19: External link CTAs handle tracking and navigation correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ctaText: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 1).map(s => s.trim()),
          externalUrl: fc.webUrl(),
          ctaLocation: fc.constantFrom('hero', 'footer', 'navigation')
        }),
        async (config) => {
          // Mock window.open
          const mockWindowOpen = vi.fn();
          vi.stubGlobal('open', mockWindowOpen);

          const ctaData = {
            ctaType: 'primary' as const,
            ctaText: config.ctaText,
            ctaLocation: config.ctaLocation,
            targetUrl: config.externalUrl,
            conversionFunnel: 'external_link'
          };

          const { container } = render(
            <TestWrapper>
              <TrackedCTAButton
                ctaData={ctaData}
                href={config.externalUrl}
                feedbackOptions={{ loadingDuration: 50 }}
              >
                {config.ctaText}
              </TrackedCTAButton>
            </TestWrapper>
          );

          const link = container.querySelector('a');
          expect(link).toBeInTheDocument();

          // Verify external link attributes
          expect(link).toHaveAttribute('href', config.externalUrl);
          expect(link).toHaveAttribute('target', '_blank');
          expect(link).toHaveAttribute('rel', 'noopener noreferrer');

          // Click the external link
          fireEvent.click(link!);

          // Verify tracking occurred
          await waitFor(() => {
            expect(conversionTracker.trackCTAInteraction).toHaveBeenCalledWith(
              expect.objectContaining({
                ctaType: 'primary',
                ctaText: config.ctaText,
                ctaLocation: config.ctaLocation,
                targetUrl: config.externalUrl
              })
            );
          }, { timeout: 200 });

          // Verify window.open was called for external navigation
          await waitFor(() => {
            expect(mockWindowOpen).toHaveBeenCalledWith(
              config.externalUrl,
              '_blank',
              'noopener,noreferrer'
            );
          }, { timeout: 200 });
        }
      ),
      { numRuns: 5 }
    );
  });
});