import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookEvent {
  id: string;
  event_type: string;
  payload: any;
  status: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  error_message?: string;
}

async function processWhatsAppNotification(
  supabase: any,
  event: WebhookEvent
): Promise<{ success: boolean; error?: string }> {
  try {
    const { booking_id } = event.payload;
    
    if (!booking_id) {
      return { success: false, error: 'Missing booking_id in payload' };
    }

    // Call the notify-whatsapp function
    const { data, error } = await supabase.functions.invoke('notify-whatsapp', {
      body: { booking_id },
    });

    if (error) {
      console.error('Error calling notify-whatsapp function:', error);
      return { success: false, error: error.message };
    }

    console.log('WhatsApp notification processed successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Error processing WhatsApp notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function processWebhookEvent(
  supabase: any,
  event: WebhookEvent
): Promise<{ success: boolean; error?: string }> {
  console.log(`Processing webhook event ${event.id} of type ${event.event_type}`);

  switch (event.event_type) {
    case 'whatsapp_notification':
      return await processWhatsAppNotification(supabase, event);
    default:
      return { success: false, error: `Unknown event type: ${event.event_type}` };
  }
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
    
    console.log('Processing webhook events...');

    // Fetch pending webhook events
    const { data: events, error: fetchError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', supabase.raw('max_attempts'))
      .order('created_at', { ascending: true })
      .limit(10); // Process up to 10 events at a time

    if (fetchError) {
      console.error('Error fetching webhook events:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch webhook events' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!events || events.length === 0) {
      console.log('No pending webhook events found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending events to process',
          processed: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${events.length} pending webhook events`);

    let processedCount = 0;
    let failedCount = 0;

    // Process each event
    for (const event of events) {
      try {
        // Mark event as processing
        await supabase
          .from('webhook_events')
          .update({ 
            status: 'processing',
            attempts: event.attempts + 1 
          })
          .eq('id', event.id);

        // Process the event
        const result = await processWebhookEvent(supabase, event);

        if (result.success) {
          // Mark as completed
          await supabase
            .from('webhook_events')
            .update({ 
              status: 'completed',
              processed_at: new Date().toISOString(),
              error_message: null
            })
            .eq('id', event.id);
          
          processedCount++;
          console.log(`Successfully processed event ${event.id}`);
        } else {
          // Check if we should retry or mark as failed
          const shouldRetry = event.attempts + 1 < event.max_attempts;
          const newStatus = shouldRetry ? 'pending' : 'failed';
          
          await supabase
            .from('webhook_events')
            .update({ 
              status: newStatus,
              error_message: result.error,
              processed_at: shouldRetry ? null : new Date().toISOString()
            })
            .eq('id', event.id);
          
          if (!shouldRetry) {
            failedCount++;
            console.error(`Event ${event.id} failed permanently: ${result.error}`);
          } else {
            console.warn(`Event ${event.id} failed, will retry: ${result.error}`);
          }
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        
        // Mark as failed or pending for retry
        const shouldRetry = event.attempts + 1 < event.max_attempts;
        const newStatus = shouldRetry ? 'pending' : 'failed';
        
        await supabase
          .from('webhook_events')
          .update({ 
            status: newStatus,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_at: shouldRetry ? null : new Date().toISOString()
          })
          .eq('id', event.id);
        
        if (!shouldRetry) {
          failedCount++;
        }
      }
    }

    console.log(`Webhook processing completed: ${processedCount} successful, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processing completed',
        processed: processedCount,
        failed: failedCount,
        total: events.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook processor error:', error);
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