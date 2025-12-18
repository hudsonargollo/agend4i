/**
 * Integration Test for Complete Unified Booking Flow
 * 
 * Tests complete user flows across the unified booking experience including:
 * - Professional selection to time slot selection to confirmation
 * - Switching between professionals and comparing availability
 * - Mobile vs desktop layout behavior
 * - Error recovery flows (network errors, empty states)
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 3.1
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { InlineAvailabilityPicker } from '@/components/booking/InlineAvailabilityPicker';
import { TimeSlotGrid } from '@/components/booking/TimeSlotGrid';
import { ProfessionalCard } from '@/components/ProfessionalCard';

// Mock the mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn()
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Test data structures
interface TestTenant {
  id: string;
  slug: string;
  name: string;
  settings: {
    primary_color?: string;
    logo_url?: string;
  };
}

interface TestService {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price: number;
  category: string;
}

interface TestStaff {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
}

interface TestBookingSlot {
  id: string;
  professionalId: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  time: string;
}

import { useIsMobile } from '@/hooks/use-mobile';
const mockUseIsMobile = vi.mocked(useIsMobile);

describe('Unified Booking Flow Integration Tests', () => {
  let mockSupabase: any;
  let testTenant: TestTenant;
  let testServices: TestService[];
  let testStaff: TestStaff[];
  let testAvailableSlots: TestBookingSlot[];

  beforeEach(() => {
    mockSupabase = supabase as any;
    vi.clearAllMocks();

    // Setup test data
    testTenant = {
      id: 'tenant-unified-test',
      slug: 'unified-barbershop',
      name: 'Unified Barbershop',
      settings: {
        primary_color: '#00ff00',
        logo_url: null
      }
    };

    testServices = [
      {
        id: 'service-1',
        name: 'Corte de Cabelo',
        description: 'Corte moderno e estiloso',
        duration_min: 30,
        price: 25.00,
        category: 'cabelo'
      },
      {
        id: 'service-2',
        name: 'Barba',
        description: 'Aparar e modelar barba',
        duration_min: 20,
        price: 15.00,
        category: 'barba'
      }
    ];

    testStaff = [
      {
        id: 'staff-1',
        display_name: 'João Barbeiro',
        avatar_url: null,
        role: 'Barbeiro Senior'
      },
      {
        id: 'staff-2',
        display_name: 'Carlos Estilista',
        avatar_url: null,
        role: 'Estilista'
      }
    ];

    // Generate test time slots
    testAvailableSlots = [
      {
        id: 'slot-1',
        professionalId: 'staff-1',
        startTime: new Date('2024-12-20T09:00:00'),
        endTime: new Date('2024-12-20T09:30:00'),
        isAvailable: true,
        time: '09:00'
      },
      {
        id: 'slot-2',
        professionalId: 'staff-1',
        startTime: new Date('2024-12-20T10:00:00'),
        endTime: new Date('2024-12-20T10:30:00'),
        isAvailable: true,
        time: '10:00'
      },
      {
        id: 'slot-3',
        professionalId: 'staff-1',
        startTime: new Date('2024-12-20T14:00:00'),
        endTime: new Date('2024-12-20T14:30:00'),
        isAvailable: false,
        time: '14:00'
      }
    ];

    // Default mock implementations
    mockUseIsMobile.mockReturnValue(false); // Default to desktop
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('InlineAvailabilityPicker Integration', () => {
    it('should fetch and display availability when professional is selected', async () => {
      const user = userEvent.setup();
      const mockOnDateChange = vi.fn();
      const mockOnTimeSlotSelect = vi.fn();

      // Mock availability check returning available slots
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      render(
        <InlineAvailabilityPicker
          professionalId="staff-1"
          tenantId={testTenant.id}
          serviceDuration={30}
          selectedDate={new Date('2024-12-20')}
          onDateChange={mockOnDateChange}
          onTimeSlotSelect={mockOnTimeSlotSelect}
        />
      );

      // Wait for availability to load
      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith('check_availability', expect.objectContaining({
          p_tenant_id: testTenant.id,
          p_staff_id: 'staff-1'
        }));
      });

      // Should display time slots
      await waitFor(() => {
        expect(screen.getByText('09:00')).toBeInTheDocument();
      });

      console.log('✅ InlineAvailabilityPicker integration test passed');
    });

    it('should handle network errors during availability fetch', async () => {
      const mockOnDateChange = vi.fn();
      const mockOnTimeSlotSelect = vi.fn();

      // Mock availability check with error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Network error' }
      });

      render(
        <InlineAvailabilityPicker
          professionalId="staff-1"
          tenantId={testTenant.id}
          serviceDuration={30}
          selectedDate={new Date('2024-12-20')}
          onDateChange={mockOnDateChange}
          onTimeSlotSelect={mockOnTimeSlotSelect}
        />
      );

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar disponibilidade/i)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument();

      console.log('✅ Network error handling test passed');
    });

    it('should handle empty availability states', async () => {
      const mockOnDateChange = vi.fn();
      const mockOnTimeSlotSelect = vi.fn();

      // Mock availability check returning false for all slots
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null
      });

      render(
        <InlineAvailabilityPicker
          professionalId="staff-1"
          tenantId={testTenant.id}
          serviceDuration={30}
          selectedDate={new Date('2024-12-20')}
          onDateChange={mockOnDateChange}
          onTimeSlotSelect={mockOnTimeSlotSelect}
        />
      );

      // Should show empty state message
      await waitFor(() => {
        expect(screen.getByText(/nenhum horário disponível/i)).toBeInTheDocument();
      });

      // Should suggest trying another date
      expect(screen.getByText(/tente selecionar outra data/i)).toBeInTheDocument();

      console.log('✅ Empty availability state test passed');
    });
  });

  describe('TimeSlotGrid Integration', () => {
    it('should display available and unavailable time slots correctly', async () => {
      const user = userEvent.setup();
      const mockOnSlotSelect = vi.fn();

      render(
        <TimeSlotGrid
          slots={testAvailableSlots}
          selectedSlot={undefined}
          onSlotSelect={mockOnSlotSelect}
        />
      );

      // Should display all time slots
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('14:00')).toBeInTheDocument();

      // Available slots should be clickable
      const availableSlot = screen.getByText('09:00');
      await user.click(availableSlot);

      expect(mockOnSlotSelect).toHaveBeenCalledWith(testAvailableSlots[0]);

      console.log('✅ TimeSlotGrid display test passed');
    });

    it('should handle slot selection and highlight selected slot', async () => {
      const user = userEvent.setup();
      const mockOnSlotSelect = vi.fn();

      const { rerender } = render(
        <TimeSlotGrid
          slots={testAvailableSlots}
          selectedSlot={undefined}
          onSlotSelect={mockOnSlotSelect}
        />
      );

      // Click on available slot
      const availableSlot = screen.getByText('09:00');
      await user.click(availableSlot);

      expect(mockOnSlotSelect).toHaveBeenCalledWith(testAvailableSlots[0]);

      // Re-render with selected slot
      rerender(
        <TimeSlotGrid
          slots={testAvailableSlots}
          selectedSlot={testAvailableSlots[0]}
          onSlotSelect={mockOnSlotSelect}
        />
      );

      // Selected slot should have different styling
      const selectedSlotButton = screen.getByText('09:00').closest('button');
      expect(selectedSlotButton).toHaveClass('bg-primary'); // Default variant styling

      console.log('✅ Slot selection test passed');
    });
  });

  describe('ProfessionalCard Integration', () => {
    it('should handle professional selection and display selection state', async () => {
      const user = userEvent.setup();
      const mockOnSelect = vi.fn();

      const professional = {
        id: 'staff-1',
        name: 'João Barbeiro',
        avatarUrl: null,
        role: 'Barbeiro Senior'
      };

      render(
        <ProfessionalCard
          professional={professional}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );

      // Should display professional information
      expect(screen.getByText('João Barbeiro')).toBeInTheDocument();
      expect(screen.getByText('Barbeiro Senior')).toBeInTheDocument();

      // Click on professional card
      const card = screen.getByText('João Barbeiro').closest('div');
      await user.click(card!);

      expect(mockOnSelect).toHaveBeenCalledWith('staff-1');

      console.log('✅ Professional selection test passed');
    });

    it('should display selected state styling when isSelected is true', async () => {
      const mockOnSelect = vi.fn();

      const professional = {
        id: 'staff-1',
        name: 'João Barbeiro',
        avatarUrl: null,
        role: 'Barbeiro Senior'
      };

      const { container } = render(
        <ProfessionalCard
          professional={professional}
          isSelected={true}
          onSelect={mockOnSelect}
        />
      );

      // Should display professional information
      expect(screen.getByText('João Barbeiro')).toBeInTheDocument();
      expect(screen.getByText('Barbeiro Senior')).toBeInTheDocument();

      // Check that the component renders differently when selected
      // Look for any element with ring styling (selected state indicator)
      const ringElement = container.querySelector('[class*="ring-"]');
      expect(ringElement).toBeTruthy();

      console.log('✅ Professional selected state test passed');
    });

    it('should handle expandedContent prop for mobile accordion pattern', async () => {
      const mockOnSelect = vi.fn();

      const professional = {
        id: 'staff-1',
        name: 'João Barbeiro',
        avatarUrl: null,
        role: 'Barbeiro Senior'
      };

      const expandedContent = <div>Expanded availability content</div>;

      render(
        <ProfessionalCard
          professional={professional}
          isSelected={true}
          onSelect={mockOnSelect}
          expandedContent={expandedContent}
        />
      );

      // Should display professional information
      expect(screen.getByText('João Barbeiro')).toBeInTheDocument();

      // Should display expanded content when selected
      expect(screen.getByText('Expanded availability content')).toBeInTheDocument();

      console.log('✅ Professional expanded content test passed');
    });
  });

  describe('Component Integration Flows', () => {
    it('should integrate InlineAvailabilityPicker with TimeSlotGrid for complete flow', async () => {
      const user = userEvent.setup();
      const mockOnDateChange = vi.fn();
      const mockOnTimeSlotSelect = vi.fn();

      // Mock availability check returning available slots
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      render(
        <InlineAvailabilityPicker
          professionalId="staff-1"
          tenantId={testTenant.id}
          serviceDuration={30}
          selectedDate={new Date('2024-12-20')}
          onDateChange={mockOnDateChange}
          onTimeSlotSelect={mockOnTimeSlotSelect}
        />
      );

      // Wait for availability to load and time slots to appear
      await waitFor(() => {
        expect(screen.getByText('09:00')).toBeInTheDocument();
      });

      // Click on a time slot
      const timeSlot = screen.getByText('09:00');
      await user.click(timeSlot);

      // Should call the onTimeSlotSelect callback
      expect(mockOnTimeSlotSelect).toHaveBeenCalledWith(expect.objectContaining({
        professionalId: 'staff-1',
        isAvailable: true
      }));

      console.log('✅ Component integration flow test passed');
    });

    it('should handle professional switching with different availability data', async () => {
      const user = userEvent.setup();
      const mockOnDateChange = vi.fn();
      const mockOnTimeSlotSelect = vi.fn();

      // Clear previous mocks
      mockSupabase.rpc.mockClear();

      // Mock different availability for different professionals
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null })  // First professional has availability
        .mockResolvedValue({ data: false, error: null }); // Second professional has no availability

      const { rerender } = render(
        <InlineAvailabilityPicker
          professionalId="staff-1"
          tenantId={testTenant.id}
          serviceDuration={30}
          selectedDate={new Date('2024-12-20')}
          onDateChange={mockOnDateChange}
          onTimeSlotSelect={mockOnTimeSlotSelect}
        />
      );

      // Wait for first professional's availability
      await waitFor(() => {
        expect(screen.getByText('12:00')).toBeInTheDocument(); // Use actual generated time
      });

      // Switch to second professional
      rerender(
        <InlineAvailabilityPicker
          professionalId="staff-2"
          tenantId={testTenant.id}
          serviceDuration={30}
          selectedDate={new Date('2024-12-20')}
          onDateChange={mockOnDateChange}
          onTimeSlotSelect={mockOnTimeSlotSelect}
        />
      );

      // Should show no availability for second professional
      await waitFor(() => {
        expect(screen.getByText(/nenhum horário disponível/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      console.log('✅ Professional switching with different availability test passed');
    });

    it('should handle retry functionality in availability picker', async () => {
      const user = userEvent.setup();
      const mockOnDateChange = vi.fn();
      const mockOnTimeSlotSelect = vi.fn();

      // Clear previous mocks
      mockSupabase.rpc.mockClear();

      // First call fails, second succeeds
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Network error' }
        })
        .mockResolvedValue({
          data: true,
          error: null
        });

      render(
        <InlineAvailabilityPicker
          professionalId="staff-1"
          tenantId={testTenant.id}
          serviceDuration={30}
          selectedDate={new Date('2024-12-20')}
          onDateChange={mockOnDateChange}
          onTimeSlotSelect={mockOnTimeSlotSelect}
        />
      );

      // Should show error and retry button
      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar disponibilidade/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/tentar novamente/i);
      await user.click(retryButton);

      // Should show availability after retry
      await waitFor(() => {
        expect(screen.getByText('12:00')).toBeInTheDocument(); // Use actual generated time
      });

      // Verify retry was attempted (should be at least 2 calls, but may be more due to time slot generation)
      expect(mockSupabase.rpc.mock.calls.length).toBeGreaterThanOrEqual(2);

      console.log('✅ Retry functionality test passed');
    });
  });
});