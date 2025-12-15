/**
 * Error handling utilities for the multi-tenant SaaS platform
 * Provides user-friendly error messages and recovery options
 */

export interface BookingConflictError {
  type: 'booking_conflict';
  message: string;
  conflictingBooking?: {
    id: string;
    start_time: string;
    end_time: string;
    customer_name?: string;
  };
  suggestedSlots?: Array<{
    time: string;
    available: boolean;
  }>;
}

export interface ExternalServiceError {
  type: 'external_service_error';
  service: 'whatsapp' | 'mercado_pago' | 'database';
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds
}

export interface ValidationError {
  type: 'validation_error';
  field: string;
  message: string;
}

export type AppError = BookingConflictError | ExternalServiceError | ValidationError;

/**
 * Creates a user-friendly booking conflict error with suggested alternatives
 */
export function createBookingConflictError(
  conflictingBooking?: any,
  suggestedSlots?: Array<{ time: string; available: boolean }>
): BookingConflictError {
  return {
    type: 'booking_conflict',
    message: 'Este horário não está mais disponível. Por favor, escolha outro horário.',
    conflictingBooking: conflictingBooking ? {
      id: conflictingBooking.id,
      start_time: conflictingBooking.start_time,
      end_time: conflictingBooking.end_time,
      customer_name: conflictingBooking.customer_name
    } : undefined,
    suggestedSlots
  };
}

/**
 * Creates an external service error with retry information
 */
export function createExternalServiceError(
  service: 'whatsapp' | 'mercado_pago' | 'database',
  originalError: Error,
  retryable: boolean = true,
  retryAfter?: number
): ExternalServiceError {
  const serviceMessages = {
    whatsapp: 'Erro no serviço de WhatsApp. Seu agendamento foi criado, mas a notificação pode não ter sido enviada.',
    mercado_pago: 'Erro no processamento do pagamento. Tente novamente em alguns minutos.',
    database: 'Erro interno do sistema. Tente novamente em alguns instantes.'
  };

  return {
    type: 'external_service_error',
    service,
    message: serviceMessages[service],
    retryable,
    retryAfter
  };
}

/**
 * Creates a validation error for form fields
 */
export function createValidationError(field: string, message: string): ValidationError {
  return {
    type: 'validation_error',
    field,
    message
  };
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryManager {
  private attempts: Map<string, number> = new Map();
  private lastAttempt: Map<string, number> = new Map();

  /**
   * Determines if a retry should be attempted
   */
  canRetry(key: string, maxAttempts: number = 3, minInterval: number = 1000): boolean {
    const attempts = this.attempts.get(key) || 0;
    const lastAttempt = this.lastAttempt.get(key) || 0;
    const now = Date.now();

    if (attempts >= maxAttempts) {
      return false;
    }

    const backoffDelay = Math.min(minInterval * Math.pow(2, attempts), 30000); // Max 30 seconds
    return now - lastAttempt >= backoffDelay;
  }

  /**
   * Records a retry attempt
   */
  recordAttempt(key: string): void {
    const attempts = this.attempts.get(key) || 0;
    this.attempts.set(key, attempts + 1);
    this.lastAttempt.set(key, Date.now());
  }

  /**
   * Resets retry counter for successful operations
   */
  reset(key: string): void {
    this.attempts.delete(key);
    this.lastAttempt.delete(key);
  }

  /**
   * Gets the next retry delay in milliseconds
   */
  getNextRetryDelay(key: string, minInterval: number = 1000): number {
    const attempts = this.attempts.get(key) || 0;
    return Math.min(minInterval * Math.pow(2, attempts), 30000);
  }
}

/**
 * Global retry manager instance
 */
export const retryManager = new RetryManager();

/**
 * Wraps async operations with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  key: string,
  maxAttempts: number = 3,
  minInterval: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        // Wait for backoff delay
        const delay = retryManager.getNextRetryDelay(key, minInterval);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      retryManager.recordAttempt(key);
      const result = await operation();
      retryManager.reset(key); // Success, reset counter
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain types of errors
      if (isNonRetryableError(error)) {
        throw error;
      }

      if (attempt === maxAttempts - 1) {
        throw lastError;
      }
    }
  }

  throw lastError!;
}

/**
 * Determines if an error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  // Don't retry validation errors, authentication errors, etc.
  if (error?.status === 400 || error?.status === 401 || error?.status === 403 || error?.status === 404) {
    return true;
  }

  // Don't retry booking conflicts
  if (error?.code === 'BOOKING_CONFLICT') {
    return true;
  }

  return false;
}

/**
 * Formats error messages for display to users
 */
export function formatErrorMessage(error: AppError | Error): string {
  if ('type' in error) {
    switch (error.type) {
      case 'booking_conflict':
        return error.message;
      case 'external_service_error':
        return error.message;
      case 'validation_error':
        return error.message;
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Don't expose internal error details to users
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}

/**
 * Generates alternative time slot suggestions when a booking conflict occurs
 */
export function generateAlternativeSlots(
  originalTime: string,
  availableSlots: Array<{ time: string; available: boolean }>,
  maxSuggestions: number = 3
): Array<{ time: string; available: boolean }> {
  const originalHour = parseInt(originalTime.split(':')[0]);
  const originalMinute = parseInt(originalTime.split(':')[1]);
  const originalTotalMinutes = originalHour * 60 + originalMinute;

  // Filter available slots and sort by proximity to original time
  const alternatives = availableSlots
    .filter(slot => slot.available)
    .map(slot => {
      const [hour, minute] = slot.time.split(':').map(Number);
      const totalMinutes = hour * 60 + minute;
      const distance = Math.abs(totalMinutes - originalTotalMinutes);
      return { ...slot, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(({ distance, ...slot }) => slot);

  return alternatives;
}

/**
 * Checks if a time slot is within business hours
 */
export function isWithinBusinessHours(time: string, businessHours = { start: '08:00', end: '18:00' }): boolean {
  const [hour, minute] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + minute;
  
  const [startHour, startMinute] = businessHours.start.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  
  const [endHour, endMinute] = businessHours.end.split(':').map(Number);
  const endTotalMinutes = endHour * 60 + endMinute;
  
  return totalMinutes >= startTotalMinutes && totalMinutes < endTotalMinutes;
}

/**
 * Validates booking form data and returns validation errors
 */
export function validateBookingData(bookingData: {
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!bookingData.serviceId) {
    errors.push(createValidationError('serviceId', 'Selecione um serviço'));
  }

  if (!bookingData.staffId) {
    errors.push(createValidationError('staffId', 'Selecione um profissional'));
  }

  if (!bookingData.date) {
    errors.push(createValidationError('date', 'Selecione uma data'));
  } else {
    const selectedDate = new Date(bookingData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      errors.push(createValidationError('date', 'A data não pode ser no passado'));
    }
  }

  if (!bookingData.time) {
    errors.push(createValidationError('time', 'Selecione um horário'));
  } else if (!isWithinBusinessHours(bookingData.time)) {
    errors.push(createValidationError('time', 'Horário fora do funcionamento'));
  }

  if (!bookingData.customerName || bookingData.customerName.trim().length < 2) {
    errors.push(createValidationError('customerName', 'Nome deve ter pelo menos 2 caracteres'));
  }

  if (!bookingData.customerPhone) {
    errors.push(createValidationError('customerPhone', 'Telefone é obrigatório'));
  } else {
    // Basic phone validation (Brazilian format)
    const phoneRegex = /^[\d\s\(\)\-\+]{10,15}$/;
    if (!phoneRegex.test(bookingData.customerPhone)) {
      errors.push(createValidationError('customerPhone', 'Formato de telefone inválido'));
    }
  }

  if (bookingData.customerEmail && bookingData.customerEmail.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.customerEmail)) {
      errors.push(createValidationError('customerEmail', 'Formato de email inválido'));
    }
  }

  return errors;
}