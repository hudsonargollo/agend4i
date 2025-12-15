import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingData {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  staff_name: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price?: number;
}

interface TenantData {
  id: string;
  name: string;
  plan: string;
  subscription_status: string;
  settings: {
    whatsapp_enabled?: boolean;
    whatsapp_api_url?: string;
    whatsapp_api_key?: string;
    whatsapp_instance?: string;
  };
}

interface WhatsAppMessage {
  number: string;
  message: string;
}

async function sendWhatsAppMessage(
  apiUrl: string,
  apiKey: string,
  instance: string,
  message: WhatsAppMessage,
  retryAttempt: number = 0
): Promise<{ success: boolean; error?: string; retryable?: boolean }> {
  const maxRetries = 3;
  const retryDelay = Math.min(1000 * Math.pow(2, retryAttempt), 10000); // Exponential backoff, max 10s

  try {
    console.log(`Sending WhatsApp message to ${message.number} (attempt ${retryAttempt + 1})`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'User-Agent': 'Agendai-WhatsApp/1.0'
      },
      body: JSON.stringify({
        number: message.number,
        text: message.message,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`WhatsApp API error: ${response.status} - ${errorText}`);
      
      // Determine if error is retryable
      const retryable = response.status >= 500 || response.status === 429 || response.status === 408;
      
      if (retryable && retryAttempt < maxRetries) {
        console.log(`Retrying WhatsApp message in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return await sendWhatsAppMessage(apiUrl, apiKey, instance, message, retryAttempt + 1);
      }
      
      return { 
        success: false, 
        error: `WhatsApp API error: ${response.status}`, 
        retryable 
      };
    }

    const result = await response.json();
    console.log('WhatsApp message sent successfully:', result);
    return { success: true };
    
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    
    // Network errors are generally retryable
    const isNetworkError = error instanceof Error && (
      error.name === 'AbortError' || 
      error.message.includes('fetch') ||
      error.message.includes('network')
    );
    
    if (isNetworkError && retryAttempt < maxRetries) {
      console.log(`Retrying WhatsApp message due to network error in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return await sendWhatsAppMessage(apiUrl, apiKey, instance, message, retryAttempt + 1);
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: isNetworkError
    };
  }
}

function formatBookingMessage(booking: BookingData, tenant: TenantData): string {
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  
  const dateStr = startTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeStr = `${startTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })} às ${endTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  const priceStr = booking.total_price 
    ? `\n💰 Valor: R$ ${booking.total_price.toFixed(2)}`
    : '';

  return `🎉 *Agendamento Confirmado!*

Olá ${booking.customer_name}! Seu agendamento foi confirmado:

📅 *Data:* ${dateStr}
⏰ *Horário:* ${timeStr}
✂️ *Serviço:* ${booking.service_name}
👨‍💼 *Profissional:* ${booking.staff_name}
🏪 *Local:* ${tenant.name}${priceStr}

📱 Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco.

Obrigado por escolher nossos serviços! 😊`;
}

function isProPlanActive(tenant: TenantData): boolean {
  return (
    (tenant.plan === 'pro' || tenant.plan === 'enterprise') &&
    tenant.subscription_status === 'active'
  );
}

function hasWhatsAppConfiguration(tenant: TenantData): boolean {
  const settings = tenant.settings;
  return !!(
    settings.whatsapp_enabled &&
    settings.whatsapp_api_url &&
    settings.whatsapp_api_key &&
    settings.whatsapp_instance
  );
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if missing (assuming Brazil +55)
  if (cleaned.length === 11 && cleaned.startsWith('11')) {
    return `55${cleaned}`;
  } else if (cleaned.length === 10) {
    return `5511${cleaned}`;
  } else if (cleaned.length === 9) {
    return `5511${cleaned}`;
  } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned;
  }
  
  // Return as-is if we can't normalize
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { booking_id } = await req.json();
    
    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing WhatsApp notification for booking: ${booking_id}`);

    // Fetch booking data with related information
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        tenant_id,
        start_time,
        end_time,
        status,
        total_price,
        customers!inner(name, phone, email),
        staff!inner(display_name),
        services!inner(name)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !bookingData) {
      console.error('Error fetching booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch tenant data
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, plan, subscription_status, settings')
      .eq('id', bookingData.tenant_id)
      .single();

    if (tenantError || !tenantData) {
      console.error('Error fetching tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if tenant has Pro plan and active subscription
    if (!isProPlanActive(tenantData)) {
      console.log(`Tenant ${tenantData.name} does not have active Pro plan. Skipping WhatsApp notification.`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp notifications not available for current plan' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if WhatsApp is configured
    if (!hasWhatsAppConfiguration(tenantData)) {
      console.log(`Tenant ${tenantData.name} does not have WhatsApp configuration. Skipping notification.`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp not configured for this tenant' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if customer has phone number
    if (!bookingData.customers.phone) {
      console.log(`Customer for booking ${booking_id} has no phone number. Skipping WhatsApp notification.`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Customer has no phone number' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare booking data for message formatting
    const booking: BookingData = {
      id: bookingData.id,
      tenant_id: bookingData.tenant_id,
      customer_name: bookingData.customers.name,
      customer_phone: bookingData.customers.phone,
      customer_email: bookingData.customers.email,
      staff_name: bookingData.staff.display_name,
      service_name: bookingData.services.name,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      status: bookingData.status,
      total_price: bookingData.total_price,
    };

    // Format and send WhatsApp message
    const message = formatBookingMessage(booking, tenantData);
    const normalizedPhone = normalizePhoneNumber(booking.customer_phone);
    
    const whatsappMessage: WhatsAppMessage = {
      number: normalizedPhone,
      message: message,
    };

    const result = await sendWhatsAppMessage(
      tenantData.settings.whatsapp_api_url!,
      tenantData.settings.whatsapp_api_key!,
      tenantData.settings.whatsapp_instance!,
      whatsappMessage
    );

    if (result.success) {
      console.log(`WhatsApp notification sent successfully for booking ${booking_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp notification sent successfully' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.error(`Failed to send WhatsApp notification for booking ${booking_id}: ${result.error}`);
      
      // Return different status codes based on error type
      const statusCode = result.retryable ? 503 : 500; // 503 for retryable errors
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to send WhatsApp notification',
          error: result.error,
          retryable: result.retryable
        }),
        { 
          status: statusCode, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('WhatsApp notification error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});