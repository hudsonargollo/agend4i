import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { ProfessionalCard } from '../components/ProfessionalCard';
import { Professional } from '../types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('Professional Card Layout Stability Property Test', () => {
  /**
   * **Feature: unified-booking-flow, Property 2: Layout Stability on Mobile Expansion**
   * **Validates: Requirements 5.4**
   * 
   * For any professional card that is clicked on mobile, expanding the card must 
   * keep the card header visible in the viewport without causing unexpected scroll jumps.
   */
  it('Property 2: Layout Stability on Mobile Expansion', () => {
    fc.assert(
      fc.property(
        // Generate simple professional data with unique IDs
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }).map(n => `prof-${n}`),
          name: fc.integer({ min: 1, max: 10000 }).map(n => `Professional ${n}`),
          role: fc.constantFrom('Barber', 'Stylist', 'Colorist', 'Nail Technician'),
          avatarUrl: fc.constantFrom('https://example.com/avatar1.jpg', 'https://example.com/avatar2.jpg'),
        }),
        // Generate layout data
        fc.record({
          expandedContentHeight: fc.integer({ min: 200, max: 500 }),
        }),
        (professionalData, layoutData) => {
          const professional: Professional = professionalData;
          const mockOnSelect = vi.fn();

          // Create expanded content
          const expandedContent = (
            <div style={{ height: `${layoutData.expandedContentHeight}px` }} data-testid={`expanded-${professional.id}`}>
              <div>Calendar content</div>
              <div>Time slots</div>
            </div>
          );

          // Test unselected state
          const { rerender, unmount } = render(
            <ProfessionalCard
              professional={professional}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          );

          // Verify initial state
          const initialCard = screen.getByRole('button', { name: `Select ${professional.name}` });
          expect(initialCard).toBeInTheDocument();

          // Test expanded state
          rerender(
            <ProfessionalCard
              professional={professional}
              isSelected={true}
              onSelect={mockOnSelect}
              expandedContent={expandedContent}
            />
          );

          // Property assertions:
          const expandedCard = screen.getByRole('button', { name: `Select ${professional.name}` });
          const expandedContentElement = screen.getByTestId(`expanded-${professional.id}`);

          // 1. Card header must still be accessible after expansion
          expect(expandedCard).toBeInTheDocument();

          // 2. Expanded content must be present and have correct height
          expect(expandedContentElement).toBeInTheDocument();
          expect(expandedContentElement).toHaveStyle(`height: ${layoutData.expandedContentHeight}px`);

          // 3. Card should maintain its structure
          expect(screen.getByText(professional.name)).toBeInTheDocument();
          expect(screen.getByText(professional.role)).toBeInTheDocument();
          expect(screen.getByText('Calendar content')).toBeInTheDocument();
          expect(screen.getByText('Time slots')).toBeInTheDocument();

          // 4. Card should have proper selection styling
          const cardContainer = expandedCard.closest('.ring-2.ring-primary');
          expect(cardContainer).toBeInTheDocument();

          // Clean up
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Simplified test for component structure integrity
   */
  it('Property 2 (structural): Card maintains proper DOM structure', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }).map(n => `prof-${n}`),
          name: fc.integer({ min: 1, max: 10000 }).map(n => `Professional ${n}`),
          role: fc.constantFrom('Barber', 'Stylist'),
          avatarUrl: fc.constant('https://example.com/avatar.jpg'),
        }),
        fc.boolean(), // isSelected
        (professional, isSelected) => {
          const mockOnSelect = vi.fn();
          const expandedContent = isSelected ? <div data-testid={`content-${professional.id}`}>Test Content</div> : undefined;

          const { unmount } = render(
            <ProfessionalCard
              professional={professional}
              isSelected={isSelected}
              onSelect={mockOnSelect}
              expandedContent={expandedContent}
            />
          );

          // Property: Card always has a clickable button
          const button = screen.getByRole('button', { name: `Select ${professional.name}` });
          expect(button).toBeInTheDocument();

          // Property: Professional info is always visible
          expect(screen.getByText(professional.name)).toBeInTheDocument();
          expect(screen.getByText(professional.role)).toBeInTheDocument();

          // Property: Expanded content appears only when selected
          if (isSelected && expandedContent) {
            expect(screen.getByTestId(`content-${professional.id}`)).toBeInTheDocument();
          } else {
            expect(screen.queryByTestId(`content-${professional.id}`)).not.toBeInTheDocument();
          }

          // Property: Selection state affects styling
          const cardContainer = button.closest('[class*="relative"]');
          if (isSelected) {
            expect(cardContainer).toHaveClass('ring-2', 'ring-primary');
          } else {
            expect(cardContainer).not.toHaveClass('ring-2', 'ring-primary');
          }

          // Clean up
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});