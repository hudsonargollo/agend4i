import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';
import { BookingConflictHandler } from '@/components/booking/BookingConflictHandler';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

describe('Booking Confirmation Flow', () => {
  const mockService = {
    id: '1',
    name: 'Corte de Cabelo',
    description: 'Corte masculino tradicional',
    duration_min: 30,
    price: 25.00,
    category: 'Cabelo'
  };

  const mockStaff = {
    id: '1',
    display_name: 'João Silva',
    avatar_url: null,
    role: 'Barbeiro'
  };

  const mockTimeSlot = {
    id: '1',
    professionalId: '1',
    startTime: new Date('2024-01-15T10:00:00'),
    endTime: new Date('2024-01-15T10:30:00'),
    time: '10:00',
    isAvailable: true
  };

  const mockCustomerInfo = {
    name: 'Cliente Teste',
    phone: '(11) 99999-9999',
    email: 'cliente@teste.com',
    notes: 'Observação teste'
  };

  describe('BookingConfirmation', () => {
    it('should display booking confirmation with all details', () => {
      const mockOnNewBooking = vi.fn();

      render(
        <BookingConfirmation
          bookingId="BOOK123"
          service={mockService}
          staff={mockStaff}
          timeSlot={mockTimeSlot}
          date={new Date('2024-01-15')}
          customerInfo={mockCustomerInfo}
          tenantName="Barbearia Teste"
          onNewBooking={mockOnNewBooking}
        />
      );

      // Check success message
      expect(screen.getByText('Agendamento confirmado!')).toBeInTheDocument();
      
      // Check key information is present
      expect(screen.getByText('Corte de Cabelo')).toBeInTheDocument();
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Cliente Teste')).toBeInTheDocument();
      expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument();
      expect(screen.getByText('cliente@teste.com')).toBeInTheDocument();
      expect(screen.getByText('Observação teste')).toBeInTheDocument();
      expect(screen.getByText('Barbearia Teste')).toBeInTheDocument();
      
      // Check that important action buttons are present
      expect(screen.getByText('Novo agendamento')).toBeInTheDocument();
      expect(screen.getByText('Compartilhar')).toBeInTheDocument();
    });

    it('should call onNewBooking when new booking button is clicked', () => {
      const mockOnNewBooking = vi.fn();

      render(
        <BookingConfirmation
          bookingId="BOOK123"
          service={mockService}
          staff={mockStaff}
          timeSlot={mockTimeSlot}
          date={new Date('2024-01-15')}
          customerInfo={mockCustomerInfo}
          tenantName="Barbearia Teste"
          onNewBooking={mockOnNewBooking}
        />
      );

      const newBookingButton = screen.getByText('Novo agendamento');
      fireEvent.click(newBookingButton);

      expect(mockOnNewBooking).toHaveBeenCalledTimes(1);
    });

    it('should handle missing optional customer information', () => {
      const mockOnNewBooking = vi.fn();
      const minimalCustomerInfo = {
        name: 'Cliente Teste',
        phone: '(11) 99999-9999',
        email: '',
        notes: ''
      };

      render(
        <BookingConfirmation
          bookingId="BOOK123"
          service={mockService}
          staff={mockStaff}
          timeSlot={mockTimeSlot}
          date={new Date('2024-01-15')}
          customerInfo={minimalCustomerInfo}
          tenantName="Barbearia Teste"
          onNewBooking={mockOnNewBooking}
        />
      );

      // Should show required fields
      expect(screen.getByText('Cliente Teste')).toBeInTheDocument();
      expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument();

      // Should not show empty optional fields
      expect(screen.queryByText('cliente@teste.com')).not.toBeInTheDocument();
      expect(screen.queryByText('Observação teste')).not.toBeInTheDocument();
    });
  });

  describe('BookingConflictHandler', () => {
    const mockSuggestedSlots = [
      { time: '10:30', available: true },
      { time: '11:00', available: true },
      { time: '14:00', available: true }
    ];

    it('should display conflict message and alternative slots', () => {
      const mockOnSelectAlternative = vi.fn();
      const mockOnRetry = vi.fn();

      render(
        <BookingConflictHandler
          suggestedSlots={mockSuggestedSlots}
          onSelectAlternative={mockOnSelectAlternative}
          onRetry={mockOnRetry}
          professionalName="João Silva"
          selectedDate={new Date('2024-01-15')}
          serviceDuration={30}
        />
      );

      // Check conflict message
      expect(screen.getByText(/Este horário acabou de ser reservado/)).toBeInTheDocument();
      expect(screen.getByText(/João Silva/)).toBeInTheDocument();

      // Check alternative slots
      expect(screen.getByText('10:30')).toBeInTheDocument();
      expect(screen.getByText('11:00')).toBeInTheDocument();
      expect(screen.getByText('14:00')).toBeInTheDocument();

      // Check retry button
      expect(screen.getByText('Verificar novamente')).toBeInTheDocument();
    });

    it('should call onSelectAlternative when alternative slot is clicked', () => {
      const mockOnSelectAlternative = vi.fn();
      const mockOnRetry = vi.fn();

      render(
        <BookingConflictHandler
          suggestedSlots={mockSuggestedSlots}
          onSelectAlternative={mockOnSelectAlternative}
          onRetry={mockOnRetry}
          professionalName="João Silva"
          selectedDate={new Date('2024-01-15')}
          serviceDuration={30}
        />
      );

      const alternativeSlot = screen.getByText('10:30');
      fireEvent.click(alternativeSlot);

      expect(mockOnSelectAlternative).toHaveBeenCalledTimes(1);
      expect(mockOnSelectAlternative).toHaveBeenCalledWith(
        expect.objectContaining({
          time: '10:30',
          isAvailable: true
        })
      );
    });

    it('should call onRetry when retry button is clicked', () => {
      const mockOnSelectAlternative = vi.fn();
      const mockOnRetry = vi.fn();

      render(
        <BookingConflictHandler
          suggestedSlots={mockSuggestedSlots}
          onSelectAlternative={mockOnSelectAlternative}
          onRetry={mockOnRetry}
          professionalName="João Silva"
          selectedDate={new Date('2024-01-15')}
          serviceDuration={30}
        />
      );

      const retryButton = screen.getByText('Verificar novamente');
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should display no alternatives message when no slots are available', () => {
      const mockOnSelectAlternative = vi.fn();
      const mockOnRetry = vi.fn();

      render(
        <BookingConflictHandler
          suggestedSlots={[]}
          onSelectAlternative={mockOnSelectAlternative}
          onRetry={mockOnRetry}
          professionalName="João Silva"
          selectedDate={new Date('2024-01-15')}
          serviceDuration={30}
        />
      );

      expect(screen.getByText('Nenhum horário alternativo encontrado')).toBeInTheDocument();
      expect(screen.getByText(/Não há outros horários disponíveis/)).toBeInTheDocument();
    });

    it('should show loading state when retrying', () => {
      const mockOnSelectAlternative = vi.fn();
      const mockOnRetry = vi.fn();

      render(
        <BookingConflictHandler
          suggestedSlots={[]}
          onSelectAlternative={mockOnSelectAlternative}
          onRetry={mockOnRetry}
          isRetrying={true}
          professionalName="João Silva"
          selectedDate={new Date('2024-01-15')}
          serviceDuration={30}
        />
      );

      expect(screen.getByText('Verificando disponibilidade...')).toBeInTheDocument();
    });
  });
});