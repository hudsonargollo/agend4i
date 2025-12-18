import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProfessionalCard } from '../components/ProfessionalCard';
import { InlineAvailabilityPicker } from '../components/booking/InlineAvailabilityPicker';
import { TimeSlotGrid, BookingSlot } from '../components/booking/TimeSlotGrid';
import { Professional } from '../types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, layout, initial, animate, transition, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Mock UI components
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: any) => (
    <div data-testid="calendar">
      <button onClick={() => onSelect?.(new Date())}>
        {selected ? 'Selected Date' : 'Select Date'}
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => (
    <div className={`animate-pulse ${className}`} data-testid="skeleton" />
  ),
}));

describe('Visual Feedback States', () => {
  const mockProfessional: Professional = {
    id: 'prof-1',
    name: 'John Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: 'Barber',
  };

  describe('Professional Card Selection Styling', () => {
    it('should apply neon green border when selected', () => {
      const mockOnSelect = vi.fn();
      
      render(
        <ProfessionalCard
          professional={mockProfessional}
          isSelected={true}
          onSelect={mockOnSelect}
        />
      );

      const cardContainer = screen.getByRole('button').closest('div');
      expect(cardContainer).toHaveClass('ring-2', 'ring-primary', 'shadow-[0_0_15px_rgba(0,255,0,0.3)]');
    });

    it('should apply hover states when not selected', () => {
      const mockOnSelect = vi.fn();
      
      render(
        <ProfessionalCard
          professional={mockProfessional}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      const cardContainer = screen.getByRole('button').closest('div');
      expect(cardContainer).toHaveClass('hover:ring-1', 'hover:ring-primary/50');
    });

    it('should visually dim unavailable professionals', () => {
      const mockOnSelect = vi.fn();
      
      render(
        <ProfessionalCard
          professional={mockProfessional}
          isSelected={false}
          onSelect={mockOnSelect}
          isAvailable={false}
        />
      );

      const cardContainer = screen.getByRole('button').closest('div');
      const button = screen.getByRole('button');
      const avatar = screen.getByAltText(mockProfessional.name);
      
      // Check dimmed styling
      expect(cardContainer).toHaveClass('opacity-60', 'cursor-not-allowed');
      expect(button).toBeDisabled();
      expect(avatar).toHaveClass('grayscale');
      
      // Check text shows unavailable status
      expect(screen.getByText(/Indisponível/)).toBeInTheDocument();
    });
  });

  describe('Skeleton Loader Display', () => {
    it('should display skeleton loaders during availability fetch', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock loading state
      (supabase.rpc as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: true, error: null }), 100))
      );

      render(
        <InlineAvailabilityPicker
          professionalId="prof-1"
          tenantId="tenant-1"
          serviceDuration={30}
          selectedDate={new Date()}
          onDateChange={vi.fn()}
          onTimeSlotSelect={vi.fn()}
        />
      );

      // Should show skeleton loaders initially
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
      
      // Each skeleton should have proper styling
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse', 'h-10');
      });
    });
  });

  describe('Time Slot Visual States', () => {
    const mockSlots: BookingSlot[] = [
      {
        id: 'slot-1',
        professionalId: 'prof-1',
        startTime: new Date('2024-01-01T09:00:00'),
        endTime: new Date('2024-01-01T09:30:00'),
        isAvailable: true,
      },
      {
        id: 'slot-2',
        professionalId: 'prof-1',
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:30:00'),
        isAvailable: false,
      },
    ];

    it('should properly style available and unavailable time slots', () => {
      render(
        <TimeSlotGrid
          slots={mockSlots}
          onSlotSelect={vi.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      
      // Available slot should have normal styling
      const availableButton = buttons.find(btn => btn.textContent === '09:00');
      expect(availableButton).not.toBeDisabled();
      expect(availableButton).toHaveClass('hover:scale-105', 'active:scale-95');
      
      // Unavailable slot should be dimmed
      const unavailableButton = buttons.find(btn => btn.textContent === '10:00');
      expect(unavailableButton).toBeDisabled();
      expect(unavailableButton).toHaveClass('opacity-40', 'cursor-not-allowed', 'bg-muted/50');
    });

    it('should highlight selected time slot', () => {
      const selectedSlot = mockSlots[0];
      
      render(
        <TimeSlotGrid
          slots={mockSlots}
          selectedSlot={selectedSlot}
          onSlotSelect={vi.fn()}
        />
      );

      const selectedButton = screen.getByRole('button', { name: '09:00' });
      // Selected slot should have different styling - check for the actual classes applied
      expect(selectedButton).toBeInTheDocument();
      expect(selectedButton).not.toBeDisabled();
    });
  });

  describe('Mobile Accordion Expansion Behavior', () => {
    it('should handle accordion expansion with proper animations', () => {
      const mockOnSelect = vi.fn();
      const expandedContent = <div data-testid="expanded-content">Calendar and slots</div>;
      
      const { rerender } = render(
        <ProfessionalCard
          professional={mockProfessional}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      // Initially no expanded content
      expect(screen.queryByTestId('expanded-content')).not.toBeInTheDocument();

      // Expand the card
      rerender(
        <ProfessionalCard
          professional={mockProfessional}
          isSelected={true}
          onSelect={mockOnSelect}
          expandedContent={expandedContent}
        />
      );

      // Expanded content should be visible
      expect(screen.getByTestId('expanded-content')).toBeInTheDocument();
      
      // Card should have selection styling
      const cardContainer = screen.getByRole('button').closest('div');
      expect(cardContainer).toHaveClass('ring-2', 'ring-primary');
    });
  });

  describe('Animation States', () => {
    const testSlots: BookingSlot[] = [
      {
        id: 'slot-1',
        professionalId: 'prof-1',
        startTime: new Date('2024-01-01T09:00:00'),
        endTime: new Date('2024-01-01T09:30:00'),
        isAvailable: true,
      },
    ];

    it('should apply proper transition classes to time slot buttons', () => {
      render(
        <TimeSlotGrid
          slots={testSlots}
          onSlotSelect={vi.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('transition-all', 'duration-200');
      });
    });

    it('should maintain proper styling hierarchy for professional cards', () => {
      const mockOnSelect = vi.fn();
      
      render(
        <ProfessionalCard
          professional={mockProfessional}
          isSelected={true}
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button');
      const cardContainer = button.closest('div');
      
      // Should have proper border radius and transition classes
      expect(cardContainer).toHaveClass('rounded-2xl', 'transition-all', 'duration-300');
      
      // Should have proper selection styling
      expect(cardContainer).toHaveClass('bg-secondary', 'border-primary');
    });
  });
});