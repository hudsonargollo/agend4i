/**
 * Unit tests for error handling functionality
 * Tests booking conflict error messages, external service failure handling,
 * and retry mechanisms with fallback behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createBookingConflictError,
  createExternalServiceError,
  createValidationError,
  RetryManager,
  withRetry,
  formatErrorMessage,
  generateAlternativeSlots,
  validateBookingData,
  isWithinBusinessHours
} from '@/lib/errorHandling';
import { WebhookFallbackManager, ServiceDegradationManager } from '@/lib/webhookFallback';

describe('Error Handling', () => {
  describe('Error Creation Functions', () => {
    it('should create booking conflict error with suggested slots', () => {
      const conflictingBooking = {
        id: 'booking-123',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        customer_name: 'John Doe'
      };

      const suggestedSlots = [
        { time: '10:30', available: true },
        { time: '11:00', available: true }
      ];

      const error = createBookingConflictError(conflictingBooking, suggestedSlots);

      expect(error.type).toBe('booking_conflict');
      expect(error.message).toBe('Este horário não está mais disponível. Por favor, escolha outro horário.');
      expect(error.conflictingBooking).toEqual({
        id: 'booking-123',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        customer_name: 'John Doe'
      });
      expect(error.suggestedSlots).toEqual(suggestedSlots);
    });

    it('should create external service error with retry information', () => {
      const originalError = new Error('Network timeout');
      const error = createExternalServiceError('whatsapp', originalError, true, 5);

      expect(error.type).toBe('external_service_error');
      expect(error.service).toBe('whatsapp');
      expect(error.message).toBe('Erro no serviço de WhatsApp. Seu agendamento foi criado, mas a notificação pode não ter sido enviada.');
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(5);
    });

    it('should create validation error for form fields', () => {
      const error = createValidationError('customerName', 'Nome é obrigatório');

      expect(error.type).toBe('validation_error');
      expect(error.field).toBe('customerName');
      expect(error.message).toBe('Nome é obrigatório');
    });
  });

  describe('RetryManager', () => {
    let retryManager: RetryManager;

    beforeEach(() => {
      retryManager = new RetryManager();
    });

    it('should allow retry on first attempt', () => {
      const canRetry = retryManager.canRetry('test-key', 3, 1000);
      expect(canRetry).toBe(true);
    });

    it('should prevent retry after max attempts', () => {
      // Record max attempts
      retryManager.recordAttempt('test-key');
      retryManager.recordAttempt('test-key');
      retryManager.recordAttempt('test-key');

      const canRetry = retryManager.canRetry('test-key', 3, 1000);
      expect(canRetry).toBe(false);
    });

    it('should calculate exponential backoff delay', () => {
      retryManager.recordAttempt('test-key');
      const delay1 = retryManager.getNextRetryDelay('test-key', 1000);
      expect(delay1).toBe(2000); // 1000 * 2^1

      retryManager.recordAttempt('test-key');
      const delay2 = retryManager.getNextRetryDelay('test-key', 1000);
      expect(delay2).toBe(4000); // 1000 * 2^2
    });

    it('should reset retry counter on success', () => {
      retryManager.recordAttempt('test-key');
      retryManager.recordAttempt('test-key');
      retryManager.reset('test-key');

      const canRetry = retryManager.canRetry('test-key', 3, 1000);
      expect(canRetry).toBe(true);
    });
  });

  describe('withRetry Function', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation, 'test-key', 3, 1000);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue('success');
      
      const promise = withRetry(operation, 'test-key', 3, 50); // Shorter delay for testing
      
      // Fast-forward through retry delay
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Validation error');
      (error as any).status = 400;
      
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, 'test-key', 3, 1000)).rejects.toThrow('Validation error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));
      
      const promise = withRetry(operation, 'test-key', 2, 50); // Shorter delay for testing
      
      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(200);
      
      await expect(promise).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe('Alternative Slot Generation', () => {
    it('should generate alternative slots closest to original time', () => {
      const availableSlots = [
        { time: '09:00', available: true },
        { time: '09:30', available: false },
        { time: '10:00', available: true },
        { time: '10:30', available: true },
        { time: '11:00', available: true },
        { time: '11:30', available: true }
      ];

      const alternatives = generateAlternativeSlots('10:15', availableSlots, 3);

      expect(alternatives).toHaveLength(3);
      expect(alternatives[0].time).toBe('10:00'); // Closest available
      expect(alternatives[1].time).toBe('10:30'); // Next closest
      expect(alternatives[2].time).toBe('11:00'); // Third closest
    });

    it('should return empty array when no slots available', () => {
      const availableSlots = [
        { time: '09:00', available: false },
        { time: '10:00', available: false }
      ];

      const alternatives = generateAlternativeSlots('10:00', availableSlots, 3);
      expect(alternatives).toHaveLength(0);
    });
  });

  describe('Business Hours Validation', () => {
    it('should validate time within default business hours', () => {
      expect(isWithinBusinessHours('09:00')).toBe(true);
      expect(isWithinBusinessHours('12:00')).toBe(true);
      expect(isWithinBusinessHours('17:30')).toBe(true);
    });

    it('should reject time outside default business hours', () => {
      expect(isWithinBusinessHours('07:30')).toBe(false);
      expect(isWithinBusinessHours('18:00')).toBe(false);
      expect(isWithinBusinessHours('22:00')).toBe(false);
    });

    it('should validate time within custom business hours', () => {
      const customHours = { start: '10:00', end: '20:00' };
      
      expect(isWithinBusinessHours('09:00', customHours)).toBe(false);
      expect(isWithinBusinessHours('15:00', customHours)).toBe(true);
      expect(isWithinBusinessHours('20:00', customHours)).toBe(false);
    });
  });

  describe('Booking Data Validation', () => {
    const validBookingData = {
      serviceId: 'service-123',
      staffId: 'staff-456',
      date: '2025-12-20',
      time: '10:00',
      customerName: 'John Doe',
      customerPhone: '11999999999',
      customerEmail: 'john@example.com'
    };

    it('should return no errors for valid booking data', () => {
      const errors = validateBookingData(validBookingData);
      expect(errors).toHaveLength(0);
    });

    it('should validate required fields', () => {
      const invalidData = {
        ...validBookingData,
        serviceId: '',
        customerName: '',
        customerPhone: ''
      };

      const errors = validateBookingData(invalidData);
      expect(errors).toHaveLength(3);
      expect(errors.some(e => e.field === 'serviceId')).toBe(true);
      expect(errors.some(e => e.field === 'customerName')).toBe(true);
      expect(errors.some(e => e.field === 'customerPhone')).toBe(true);
    });

    it('should validate date is not in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const invalidData = {
        ...validBookingData,
        date: pastDate.toISOString().split('T')[0]
      };

      const errors = validateBookingData(invalidData);
      expect(errors.some(e => e.field === 'date' && e.message.includes('passado'))).toBe(true);
    });

    it('should validate phone number format', () => {
      const invalidData = {
        ...validBookingData,
        customerPhone: '123'
      };

      const errors = validateBookingData(invalidData);
      expect(errors.some(e => e.field === 'customerPhone' && e.message.includes('inválido'))).toBe(true);
    });

    it('should validate email format when provided', () => {
      const invalidData = {
        ...validBookingData,
        customerEmail: 'invalid-email'
      };

      const errors = validateBookingData(invalidData);
      expect(errors.some(e => e.field === 'customerEmail' && e.message.includes('inválido'))).toBe(true);
    });

    it('should allow empty email', () => {
      const validData = {
        ...validBookingData,
        customerEmail: ''
      };

      const errors = validateBookingData(validData);
      expect(errors.some(e => e.field === 'customerEmail')).toBe(false);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format booking conflict error', () => {
      const error = createBookingConflictError();
      const message = formatErrorMessage(error);
      expect(message).toBe('Este horário não está mais disponível. Por favor, escolha outro horário.');
    });

    it('should format external service error', () => {
      const error = createExternalServiceError('whatsapp', new Error('API error'));
      const message = formatErrorMessage(error);
      expect(message).toBe('Erro no serviço de WhatsApp. Seu agendamento foi criado, mas a notificação pode não ter sido enviada.');
    });

    it('should format validation error', () => {
      const error = createValidationError('customerName', 'Nome é obrigatório');
      const message = formatErrorMessage(error);
      expect(message).toBe('Nome é obrigatório');
    });

    it('should format generic error safely', () => {
      const error = new Error('Internal server error');
      const message = formatErrorMessage(error);
      expect(message).toBe('Ocorreu um erro inesperado. Tente novamente.');
    });
  });
});

describe('Webhook Fallback Manager', () => {
  let manager: WebhookFallbackManager;

  beforeEach(() => {
    manager = new WebhookFallbackManager({ maxRetries: 2, retryDelay: 100, fallbackDelay: 200 });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should process webhook successfully on first attempt', async () => {
    const processor = vi.fn().mockResolvedValue(true);
    
    const result = await manager.processWebhook('webhook-1', 'payment', { id: 'pay-123' }, processor);
    
    expect(result.success).toBe(true);
    expect(result.usedFallback).toBe(false);
    expect(processor).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const processor = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    
    // First call should fail and schedule retry
    const result1 = await manager.processWebhook('webhook-2', 'payment', { id: 'pay-123' }, processor);
    expect(result1.success).toBe(false);
    expect(result1.usedFallback).toBe(false);
    
    // Fast-forward through retry delay
    await vi.advanceTimersByTimeAsync(100);
    
    // Second call should succeed
    const result2 = await manager.processWebhook('webhook-2', 'payment', { id: 'pay-123' }, processor);
    expect(result2.success).toBe(true);
    expect(result2.usedFallback).toBe(false);
  });

  it('should use fallback after max retries', async () => {
    const processor = vi.fn().mockResolvedValue(false);
    
    // Process webhook multiple times to exceed max retries
    await manager.processWebhook('webhook-3', 'whatsapp', { booking_id: 'book-123' }, processor);
    await manager.processWebhook('webhook-3', 'whatsapp', { booking_id: 'book-123' }, processor);
    const result = await manager.processWebhook('webhook-3', 'whatsapp', { booking_id: 'book-123' }, processor);
    
    expect(result.success).toBe(true);
    expect(result.usedFallback).toBe(true);
  });

  it('should track retry and fallback queues', async () => {
    const processor = vi.fn().mockResolvedValue(false);
    
    // Process webhook to add to retry queue
    await manager.processWebhook('webhook-4', 'payment', { id: 'pay-123' }, processor);
    
    const status = manager.getStatus();
    expect(status.totalPending).toBeGreaterThan(0);
  });

  it('should clear queues when requested', () => {
    const processor = vi.fn().mockResolvedValue(false);
    
    manager.processWebhook('webhook-5', 'payment', { id: 'pay-123' }, processor);
    manager.clearQueues();
    
    const status = manager.getStatus();
    expect(status.totalPending).toBe(0);
  });
});

describe('Service Degradation Manager', () => {
  let manager: ServiceDegradationManager;

  beforeEach(() => {
    manager = new ServiceDegradationManager();
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should check WhatsApp service availability', async () => {
    const available = await manager.isServiceAvailable('whatsapp');
    expect(available).toBe(true); // WhatsApp always returns true in current implementation
  });

  it('should check MercadoPago service availability', async () => {
    (global.fetch as any).mockResolvedValue({ status: 200 });
    
    const available = await manager.isServiceAvailable('mercado_pago');
    expect(available).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/payment_methods',
      expect.objectContaining({
        method: 'GET',
        headers: { 'User-Agent': 'Agendai-HealthCheck/1.0' }
      })
    );
  });

  it('should detect MercadoPago service unavailability', async () => {
    (global.fetch as any).mockResolvedValue({ status: 500 });
    
    const available = await manager.isServiceAvailable('mercado_pago');
    expect(available).toBe(false);
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    
    const available = await manager.isServiceAvailable('mercado_pago');
    expect(available).toBe(false);
  });

  it('should provide degradation messages', () => {
    const whatsappMessage = manager.getDegradationMessage('whatsapp');
    expect(whatsappMessage).toContain('WhatsApp');
    expect(whatsappMessage).toContain('temporariamente indisponível');

    const mpMessage = manager.getDegradationMessage('mercado_pago');
    expect(mpMessage).toContain('pagamentos');
    expect(mpMessage).toContain('temporariamente indisponível');
  });

  it('should provide alternative actions', () => {
    const whatsappActions = manager.getAlternativeActions('whatsapp');
    expect(whatsappActions).toHaveLength(2);
    expect(whatsappActions[0].action).toBe('manual_contact');
    expect(whatsappActions[1].action).toBe('email_fallback');

    const mpActions = manager.getAlternativeActions('mercado_pago');
    expect(mpActions).toHaveLength(2);
    expect(mpActions[0].action).toBe('retry_later');
    expect(mpActions[1].action).toBe('contact_support');
  });
});