/**
 * Fallback mechanisms for webhook processing failures
 * Provides alternative ways to handle payment and notification events
 */

import { supabase } from '@/integrations/supabase/client';

export interface WebhookFallbackConfig {
  maxRetries: number;
  retryDelay: number;
  fallbackDelay: number;
}

const DEFAULT_CONFIG: WebhookFallbackConfig = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  fallbackDelay: 300000, // 5 minutes
};

/**
 * Manages webhook processing with fallback mechanisms
 */
export class WebhookFallbackManager {
  private config: WebhookFallbackConfig;
  private retryQueue: Map<string, number> = new Map();
  private fallbackQueue: Set<string> = new Set();

  constructor(config: Partial<WebhookFallbackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Processes a webhook with retry and fallback logic
   */
  async processWebhook(
    webhookId: string,
    webhookType: 'payment' | 'whatsapp',
    payload: any,
    processor: (payload: any) => Promise<boolean>
  ): Promise<{ success: boolean; usedFallback: boolean }> {
    const retryCount = this.retryQueue.get(webhookId) || 0;

    try {
      const success = await processor(payload);
      
      if (success) {
        // Clear retry count on success
        this.retryQueue.delete(webhookId);
        this.fallbackQueue.delete(webhookId);
        return { success: true, usedFallback: false };
      }

      // If processing failed, schedule retry or fallback
      return await this.handleFailure(webhookId, webhookType, payload, processor, retryCount);
      
    } catch (error) {
      console.error(`Webhook processing error for ${webhookId}:`, error);
      return await this.handleFailure(webhookId, webhookType, payload, processor, retryCount);
    }
  }

  /**
   * Handles webhook processing failures with retry and fallback logic
   */
  private async handleFailure(
    webhookId: string,
    webhookType: 'payment' | 'whatsapp',
    payload: any,
    processor: (payload: any) => Promise<boolean>,
    retryCount: number
  ): Promise<{ success: boolean; usedFallback: boolean }> {
    
    if (retryCount < this.config.maxRetries) {
      // Schedule retry
      this.retryQueue.set(webhookId, retryCount + 1);
      
      setTimeout(async () => {
        await this.processWebhook(webhookId, webhookType, payload, processor);
      }, this.config.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      
      return { success: false, usedFallback: false };
    }

    // Max retries reached, use fallback mechanism
    return await this.useFallback(webhookId, webhookType, payload);
  }

  /**
   * Implements fallback mechanisms for different webhook types
   */
  private async useFallback(
    webhookId: string,
    webhookType: 'payment' | 'whatsapp',
    payload: any
  ): Promise<{ success: boolean; usedFallback: boolean }> {
    
    this.fallbackQueue.add(webhookId);
    
    try {
      switch (webhookType) {
        case 'payment':
          return await this.paymentFallback(payload);
        case 'whatsapp':
          return await this.whatsappFallback(payload);
        default:
          return { success: false, usedFallback: false };
      }
    } catch (error) {
      console.error(`Fallback mechanism failed for ${webhookId}:`, error);
      return { success: false, usedFallback: false };
    }
  }

  /**
   * Fallback mechanism for payment webhooks
   * Polls MercadoPago API directly to get payment status
   */
  private async paymentFallback(payload: any): Promise<{ success: boolean; usedFallback: boolean }> {
    try {
      // Extract payment ID from payload
      const paymentId = payload.data?.id || payload.id;
      if (!paymentId) {
        throw new Error('No payment ID found in payload');
      }

      // Schedule a delayed check of payment status
      setTimeout(async () => {
        try {
          // Call our own function to check payment status
          const { data, error } = await supabase.functions.invoke('mp-checkout', {
            body: { 
              action: 'check_payment_status',
              payment_id: paymentId 
            }
          });

          if (error) {
            console.error('Payment status check failed:', error);
            return;
          }

          console.log('Payment status checked via fallback:', data);
        } catch (error) {
          console.error('Payment fallback check failed:', error);
        }
      }, this.config.fallbackDelay);

      return { success: true, usedFallback: true };
      
    } catch (error) {
      console.error('Payment fallback failed:', error);
      return { success: false, usedFallback: false };
    }
  }

  /**
   * Fallback mechanism for WhatsApp webhooks
   * Logs the failure and schedules manual notification check
   */
  private async whatsappFallback(payload: any): Promise<{ success: boolean; usedFallback: boolean }> {
    try {
      const bookingId = payload.booking_id;
      if (!bookingId) {
        throw new Error('No booking ID found in payload');
      }

      // Log the failed notification for manual review
      const { error } = await supabase
        .from('notification_failures')
        .insert({
          booking_id: bookingId,
          notification_type: 'whatsapp',
          failure_reason: 'webhook_processing_failed',
          payload: payload,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log notification failure:', error);
      }

      // Schedule a delayed retry of the notification
      setTimeout(async () => {
        try {
          const { error: retryError } = await supabase.functions.invoke('notify-whatsapp', {
            body: { booking_id: bookingId }
          });

          if (retryError) {
            console.error('WhatsApp notification retry failed:', retryError);
          } else {
            console.log('WhatsApp notification retry succeeded via fallback');
          }
        } catch (error) {
          console.error('WhatsApp fallback retry failed:', error);
        }
      }, this.config.fallbackDelay);

      return { success: true, usedFallback: true };
      
    } catch (error) {
      console.error('WhatsApp fallback failed:', error);
      return { success: false, usedFallback: false };
    }
  }

  /**
   * Gets the current status of webhook processing
   */
  getStatus() {
    return {
      retryQueue: Array.from(this.retryQueue.entries()),
      fallbackQueue: Array.from(this.fallbackQueue),
      totalPending: this.retryQueue.size + this.fallbackQueue.size
    };
  }

  /**
   * Clears all queues (for testing or reset)
   */
  clearQueues() {
    this.retryQueue.clear();
    this.fallbackQueue.clear();
  }
}

/**
 * Global webhook fallback manager instance
 */
export const webhookFallbackManager = new WebhookFallbackManager();

/**
 * Graceful degradation for external service failures
 */
export class ServiceDegradationManager {
  private serviceStatus: Map<string, { available: boolean; lastCheck: number }> = new Map();
  private readonly CHECK_INTERVAL = 60000; // 1 minute

  /**
   * Checks if a service is available
   */
  async isServiceAvailable(service: 'whatsapp' | 'mercado_pago'): Promise<boolean> {
    const status = this.serviceStatus.get(service);
    const now = Date.now();

    // Return cached status if recent
    if (status && (now - status.lastCheck) < this.CHECK_INTERVAL) {
      return status.available;
    }

    // Check service availability
    const available = await this.checkServiceHealth(service);
    this.serviceStatus.set(service, { available, lastCheck: now });
    
    return available;
  }

  /**
   * Performs health check for external services
   */
  private async checkServiceHealth(service: 'whatsapp' | 'mercado_pago'): Promise<boolean> {
    try {
      switch (service) {
        case 'whatsapp':
          // Simple connectivity check - could be enhanced with actual API call
          return true; // Assume available unless we have specific health endpoint
          
        case 'mercado_pago':
          // Check MercadoPago API status
          const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
            method: 'GET',
            headers: { 'User-Agent': 'Agendai-HealthCheck/1.0' }
          });
          return response.status < 500;
          
        default:
          return false;
      }
    } catch (error) {
      console.error(`Health check failed for ${service}:`, error);
      return false;
    }
  }

  /**
   * Gets degraded functionality message for unavailable services
   */
  getDegradationMessage(service: 'whatsapp' | 'mercado_pago'): string {
    switch (service) {
      case 'whatsapp':
        return 'O serviço de notificações WhatsApp está temporariamente indisponível. Seu agendamento foi criado com sucesso, mas você pode não receber a confirmação por WhatsApp.';
      case 'mercado_pago':
        return 'O serviço de pagamentos está temporariamente indisponível. Tente novamente em alguns minutos ou entre em contato conosco.';
      default:
        return 'Alguns serviços estão temporariamente indisponíveis.';
    }
  }

  /**
   * Provides alternative actions when services are degraded
   */
  getAlternativeActions(service: 'whatsapp' | 'mercado_pago'): Array<{ label: string; action: string }> {
    switch (service) {
      case 'whatsapp':
        return [
          { label: 'Anotar número para contato manual', action: 'manual_contact' },
          { label: 'Enviar email de confirmação', action: 'email_fallback' }
        ];
      case 'mercado_pago':
        return [
          { label: 'Tentar novamente em 5 minutos', action: 'retry_later' },
          { label: 'Contatar suporte', action: 'contact_support' }
        ];
      default:
        return [];
    }
  }
}

/**
 * Global service degradation manager instance
 */
export const serviceDegradationManager = new ServiceDegradationManager();