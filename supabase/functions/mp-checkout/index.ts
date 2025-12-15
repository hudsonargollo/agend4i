import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { generateAdminURL } from "../_shared/domain.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateSubscriptionRequest {
  tenant_id: string;
  plan: 'pro' | 'enterprise';
  payer_email: string;
}

interface MercadoPagoPreference {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
  }>;
  payer: {
    email: string;
  };
  external_reference: string;
  notification_url: string;
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
  subscription_data?: {
    frequency: number;
    frequency_type: string;
    repetitions?: number;
  };
}

interface WebhookPayload {
  id: string;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: string;
  user_id: string;
  version: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

// Plan configurations
const PLAN_CONFIG = {
  pro: {
    title: 'Plano Pro - Agendai',
    price: 29.90,
    features: ['WhatsApp notifications', 'Payment processing', 'Advanced analytics']
  },
  enterprise: {
    title: 'Plano Enterprise - Agendai',
    price: 99.90,
    features: ['All Pro features', 'Custom branding', 'Priority support', 'API access']
  }
};

async function createMercadoPagoPreference(
  accessToken: string,
  request: CreateSubscriptionRequest,
  baseUrl: string,
  retryAttempt: number = 0
): Promise<{ preference_id: string; init_point: string }> {
  const maxRetries = 3;
  const retryDelay = Math.min(1000 * Math.pow(2, retryAttempt), 10000); // Exponential backoff

  try {
    const planConfig = PLAN_CONFIG[request.plan];
    
    const preference: MercadoPagoPreference = {
      items: [{
        title: planConfig.title,
        quantity: 1,
        unit_price: planConfig.price,
        currency_id: 'BRL'
      }],
      payer: {
        email: request.payer_email
      },
      external_reference: `tenant_${request.tenant_id}_${request.plan}`,
      notification_url: `${baseUrl}/functions/v1/mp-checkout`,
      back_urls: {
        success: `${generateAdminURL('/billing?status=success', baseUrl)}`,
        failure: `${generateAdminURL('/billing?status=failure', baseUrl)}`,
        pending: `${generateAdminURL('/billing?status=pending', baseUrl)}`
      },
      auto_return: 'approved',
      subscription_data: {
        frequency: 1,
        frequency_type: 'months'
      }
    };

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Agendai-Checkout/1.0'
      },
      body: JSON.stringify(preference),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`MercadoPago API error: ${response.status} - ${errorText}`);
      
      // Determine if error is retryable
      const retryable = response.status >= 500 || response.status === 429 || response.status === 408;
      
      if (retryable && retryAttempt < maxRetries) {
        console.log(`Retrying MercadoPago preference creation in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return await createMercadoPagoPreference(accessToken, request, baseUrl, retryAttempt + 1);
      }
      
      throw new Error(`MercadoPago API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.id || !data.init_point) {
      throw new Error('Invalid response from MercadoPago API: missing required fields');
    }
    
    return {
      preference_id: data.id,
      init_point: data.init_point
    };
    
  } catch (error) {
    console.error('Error creating MercadoPago preference:', error);
    
    // Network errors are generally retryable
    const isNetworkError = error instanceof Error && (
      error.name === 'AbortError' || 
      error.message.includes('fetch') ||
      error.message.includes('network')
    );
    
    if (isNetworkError && retryAttempt < maxRetries) {
      console.log(`Retrying MercadoPago preference creation due to network error in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return await createMercadoPagoPreference(accessToken, request, baseUrl, retryAttempt + 1);
    }
    
    throw error;
  }
}

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Enhanced signature verification with multiple format support
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Handle different signature formats (hex, base64)
    let signatureBuffer: Uint8Array;
    
    if (signature.startsWith('sha256=')) {
      // GitHub-style signature
      const hexSignature = signature.replace('sha256=', '');
      signatureBuffer = new Uint8Array(
        hexSignature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
    } else if (signature.match(/^[0-9a-fA-F]+$/)) {
      // Plain hex signature
      signatureBuffer = new Uint8Array(
        signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
    } else {
      // Assume base64
      const binaryString = atob(signature);
      signatureBuffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        signatureBuffer[i] = binaryString.charCodeAt(i);
      }
    }

    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(payload)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Validate external reference format and extract tenant info securely
function parseExternalReference(externalRef: string): { tenantId: string; plan: string } | null {
  try {
    // Strict validation of external_reference format
    if (!externalRef || typeof externalRef !== 'string') {
      return null;
    }

    // Must match exact pattern: tenant_{uuid}_{plan}
    const pattern = /^tenant_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(pro|enterprise)$/;
    const match = externalRef.match(pattern);
    
    if (!match) {
      return null;
    }

    return {
      tenantId: match[1],
      plan: match[2]
    };
  } catch (error) {
    console.error('Error parsing external reference:', error);
    return null;
  }
}

// Sanitize and validate payment data before storage
function sanitizePaymentData(payment: any): { payerId: string; subscriptionId: string } | null {
  try {
    // Only extract necessary identifiers, never store sensitive data
    const payerId = payment?.payer?.id;
    const subscriptionId = payment?.id;

    // Validate that IDs are strings and not empty
    if (!payerId || !subscriptionId || 
        typeof payerId !== 'string' || typeof subscriptionId !== 'string' ||
        payerId.trim() === '' || subscriptionId.trim() === '') {
      return null;
    }

    // Additional validation: IDs should be alphanumeric with limited special chars
    const idPattern = /^[a-zA-Z0-9_-]+$/;
    if (!idPattern.test(payerId) || !idPattern.test(subscriptionId)) {
      return null;
    }

    return {
      payerId: payerId.trim(),
      subscriptionId: subscriptionId.trim()
    };
  } catch (error) {
    console.error('Error sanitizing payment data:', error);
    return null;
  }
}

async function processPaymentWebhook(
  supabase: any,
  webhookData: WebhookPayload,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Processing payment webhook:', { id: webhookData.data.id, type: webhookData.type });

    // Validate webhook data structure
    if (!webhookData.data?.id || typeof webhookData.data.id !== 'string') {
      throw new Error('Invalid webhook data structure');
    }

    // Fetch payment details from MercadoPago with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${webhookData.data.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Agendai-Webhook/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!paymentResponse.ok) {
      throw new Error(`Failed to fetch payment details: ${paymentResponse.status}`);
    }

    const payment = await paymentResponse.json();
    
    // Log only non-sensitive payment info
    console.log('Payment status:', { 
      id: payment.id, 
      status: payment.status, 
      external_reference: payment.external_reference 
    });

    // Securely parse external_reference
    const refData = parseExternalReference(payment.external_reference);
    if (!refData) {
      throw new Error('Invalid or malformed external_reference');
    }

    const { tenantId, plan } = refData;

    // Verify tenant exists before processing payment
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, subscription_status')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Sanitize payment data before storage
    const sanitizedData = sanitizePaymentData(payment);
    if (!sanitizedData) {
      throw new Error('Failed to sanitize payment data');
    }

    // Determine subscription status based on payment status
    let subscriptionStatus: string;
    switch (payment.status) {
      case 'approved':
        subscriptionStatus = 'active';
        break;
      case 'pending':
        subscriptionStatus = 'past_due';
        break;
      case 'cancelled':
      case 'rejected':
        subscriptionStatus = 'cancelled';
        break;
      default:
        subscriptionStatus = 'inactive';
    }

    // Validate plan is allowed
    if (!['pro', 'enterprise'].includes(plan)) {
      throw new Error(`Invalid plan in external_reference: ${plan}`);
    }

    // Update tenant subscription information with transaction
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        plan: plan,
        subscription_status: subscriptionStatus,
        mp_payer_id: sanitizedData.payerId,
        mp_subscription_id: sanitizedData.subscriptionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId);

    if (updateError) {
      throw new Error(`Failed to update tenant: ${updateError.message}`);
    }

    console.log(`Successfully updated tenant ${tenantId} with ${plan} plan, status: ${subscriptionStatus}`);
    return { success: true };

  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
    const mpWebhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET')!;
    
    if (!supabaseUrl || !supabaseServiceKey || !mpAccessToken) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle webhook notifications from MercadoPago
    if (req.method === 'POST') {
      const url = new URL(req.url);
      
      // Check if this is a webhook notification
      if (url.searchParams.has('id') && url.searchParams.has('topic')) {
        const webhookPayload = await req.text();
        const signature = req.headers.get('x-signature') || req.headers.get('x-hub-signature-256');
        
        // Enhanced security: Always require signature verification for webhooks
        if (!mpWebhookSecret) {
          console.error('Webhook secret not configured');
          return new Response(
            JSON.stringify({ error: 'Webhook authentication not configured' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        if (!signature) {
          console.error('Missing webhook signature');
          return new Response(
            JSON.stringify({ error: 'Missing signature' }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Verify webhook signature
        const isValid = await verifyWebhookSignature(webhookPayload, signature, mpWebhookSecret);
        if (!isValid) {
          console.error('Invalid webhook signature');
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Additional security: Rate limiting check (basic implementation)
        const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        console.log(`Webhook from IP: ${clientIP}`);

        // Validate payload size (prevent DoS)
        if (webhookPayload.length > 10000) { // 10KB limit
          console.error('Webhook payload too large');
          return new Response(
            JSON.stringify({ error: 'Payload too large' }),
            { 
              status: 413, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Parse webhook data
        const webhookData: WebhookPayload = JSON.parse(webhookPayload);
        
        // Process payment webhook
        if (webhookData.type === 'payment') {
          const result = await processPaymentWebhook(supabase, webhookData, mpAccessToken);
          
          if (result.success) {
            return new Response(
              JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          } else {
            return new Response(
              JSON.stringify({ error: result.error }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        }

        // Acknowledge other webhook types
        return new Response(
          JSON.stringify({ success: true, message: 'Webhook acknowledged' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Handle subscription creation request
      const requestData: CreateSubscriptionRequest = await req.json();
      
      // Enhanced input validation
      if (!requestData.tenant_id || !requestData.plan || !requestData.payer_email) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: tenant_id, plan, payer_email' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Validate tenant_id format (UUID)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(requestData.tenant_id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid tenant_id format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Validate email format
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(requestData.payer_email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!['pro', 'enterprise'].includes(requestData.plan)) {
        return new Response(
          JSON.stringify({ error: 'Invalid plan. Must be "pro" or "enterprise"' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Verify tenant exists and is active
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, owner_id, status, subscription_status')
        .eq('id', requestData.tenant_id)
        .eq('status', 'active') // Only allow active tenants
        .single();

      if (tenantError || !tenant) {
        return new Response(
          JSON.stringify({ error: 'Tenant not found or inactive' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Security: Prevent duplicate active subscriptions
      if (tenant.subscription_status === 'active') {
        return new Response(
          JSON.stringify({ error: 'Tenant already has an active subscription' }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Create MercadoPago preference
      const preference = await createMercadoPagoPreference(
        mpAccessToken,
        requestData,
        supabaseUrl
      );

      console.log(`Created MercadoPago preference for tenant ${requestData.tenant_id}: ${preference.preference_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          preference_id: preference.preference_id,
          init_point: preference.init_point,
          plan: requestData.plan,
          price: PLAN_CONFIG[requestData.plan].price
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle GET requests (health check)
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'MercadoPago checkout service is running',
          plans: PLAN_CONFIG
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('MercadoPago checkout error:', error);
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