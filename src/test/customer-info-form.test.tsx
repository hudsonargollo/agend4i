import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerInfoForm, CustomerInfo } from '@/components/booking/CustomerInfoForm';

describe('CustomerInfoForm', () => {
  const mockCustomerInfo: CustomerInfo = {
    name: '',
    phone: '',
    email: '',
    notes: ''
  };

  const mockProps = {
    customerInfo: mockCustomerInfo,
    onCustomerInfoChange: vi.fn(),
    onSubmit: vi.fn(),
    onBack: vi.fn(),
    isSubmitting: false,
    error: null
  };

  it('renders all form fields correctly', () => {
    render(<CustomerInfoForm {...mockProps} />);
    
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefone\/whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
  });

  it('calls onCustomerInfoChange when fields are updated', async () => {
    render(<CustomerInfoForm {...mockProps} />);
    
    const nameInput = screen.getByLabelText(/nome completo/i);
    fireEvent.change(nameInput, { target: { value: 'João Silva' } });
    
    await waitFor(() => {
      expect(mockProps.onCustomerInfoChange).toHaveBeenCalledWith({
        ...mockCustomerInfo,
        name: 'João Silva'
      });
    });
  });

  it('prevents submission when required fields are empty', async () => {
    render(<CustomerInfoForm {...mockProps} />);
    
    const submitButton = screen.getByRole('button', { name: /confirmar agendamento/i });
    fireEvent.click(submitButton);
    
    // Check that onSubmit was not called due to validation errors
    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit when form is valid', async () => {
    const validCustomerInfo: CustomerInfo = {
      name: 'João Silva',
      phone: '(11) 99999-9999',
      email: 'joao@email.com',
      notes: 'Teste'
    };

    render(<CustomerInfoForm {...mockProps} customerInfo={validCustomerInfo} />);
    
    const submitButton = screen.getByRole('button', { name: /confirmar agendamento/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalled();
    });
  });

  it('calls onBack when back button is clicked', () => {
    render(<CustomerInfoForm {...mockProps} />);
    
    const backButton = screen.getByRole('button', { name: /voltar/i });
    fireEvent.click(backButton);
    
    expect(mockProps.onBack).toHaveBeenCalled();
  });

  it('disables form when submitting', () => {
    render(<CustomerInfoForm {...mockProps} isSubmitting={true} />);
    
    const nameInput = screen.getByLabelText(/nome completo/i);
    const submitButton = screen.getByRole('button', { name: /confirmando/i });
    const backButton = screen.getByRole('button', { name: /voltar/i });
    
    expect(nameInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(backButton).toBeDisabled();
  });

  it('displays error messages', () => {
    const errorMessage = 'Erro de teste';
    render(<CustomerInfoForm {...mockProps} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});