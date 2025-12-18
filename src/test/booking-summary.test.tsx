import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { BookingSlot } from '@/components/booking/TimeSlotGrid';

describe('BookingSummary', () => {
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

  const mockTimeSlot: BookingSlot = {
    id: '1',
    professionalId: '1',
    startTime: new Date('2024-01-15T10:00:00'),
    endTime: new Date('2024-01-15T10:30:00'),
    isAvailable: true,
    time: '10:00'
  };

  const mockDate = new Date('2024-01-15');
  const mockTenantName = 'Barbearia do João';

  it('renders all booking information correctly', () => {
    render(
      <BookingSummary
        service={mockService}
        staff={mockStaff}
        timeSlot={mockTimeSlot}
        date={mockDate}
        tenantName={mockTenantName}
      />
    );

    expect(screen.getByText('Resumo do agendamento')).toBeInTheDocument();
    expect(screen.getByText(mockTenantName)).toBeInTheDocument();
    expect(screen.getByText(mockService.name)).toBeInTheDocument();
    expect(screen.getByText(mockService.description!)).toBeInTheDocument();
    expect(screen.getByText('30min')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'R$ 25.00';
    })).toBeInTheDocument();
    expect(screen.getByText(mockStaff.display_name)).toBeInTheDocument();
    expect(screen.getByText(`• ${mockStaff.role}`)).toBeInTheDocument();
  });

  it('formats date and time correctly', () => {
    render(
      <BookingSummary
        service={mockService}
        staff={mockStaff}
        timeSlot={mockTimeSlot}
        date={mockDate}
        tenantName={mockTenantName}
      />
    );

    // Check that date is formatted in Portuguese
    expect(screen.getByText(/domingo/i)).toBeInTheDocument();
    
    // Check that time range is displayed
    expect(screen.getByText('10:00 - 10:30')).toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', () => {
    const serviceWithoutDescription = { ...mockService, description: null };
    const staffWithoutRole = { ...mockStaff, role: null };

    render(
      <BookingSummary
        service={serviceWithoutDescription}
        staff={staffWithoutRole}
        timeSlot={mockTimeSlot}
        date={mockDate}
        tenantName={mockTenantName}
      />
    );

    expect(screen.getByText(mockService.name)).toBeInTheDocument();
    expect(screen.getByText(mockStaff.display_name)).toBeInTheDocument();
    expect(screen.queryByText(`• ${mockStaff.role}`)).not.toBeInTheDocument();
  });
});