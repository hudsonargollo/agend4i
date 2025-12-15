-- ==========================================
-- WHATSAPP NOTIFICATION WEBHOOK TRIGGER
-- ==========================================

-- Create webhook events table to queue notifications
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS on webhook_events table
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage webhook events
CREATE POLICY "Service role can manage webhook events" ON public.webhook_events
  FOR ALL TO service_role USING (true);

-- Function to queue WhatsApp notification webhook
CREATE OR REPLACE FUNCTION public.queue_whatsapp_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only trigger for INSERT operations with 'pending' status
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    
    -- Insert webhook event into queue
    INSERT INTO public.webhook_events (event_type, payload)
    VALUES (
      'whatsapp_notification',
      jsonb_build_object(
        'booking_id', NEW.id,
        'tenant_id', NEW.tenant_id,
        'event_type', 'booking_created',
        'timestamp', extract(epoch from now())
      )
    );
    
    -- Log successful webhook queuing
    RAISE LOG 'WhatsApp notification queued for booking %', NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for booking INSERT events
DROP TRIGGER IF EXISTS on_booking_created_whatsapp ON public.bookings;
CREATE TRIGGER on_booking_created_whatsapp
  AFTER INSERT ON public.bookings
  FOR EACH ROW 
  EXECUTE FUNCTION public.queue_whatsapp_notification();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.queue_whatsapp_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_whatsapp_notification() TO anon;

-- Create indexes for webhook events table
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events(created_at);
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);

-- Add comment for documentation
COMMENT ON FUNCTION public.queue_whatsapp_notification() IS 
'Queues WhatsApp notification webhook when a new booking is created with pending status. 
Uses webhook_events table to ensure reliable delivery.';

COMMENT ON TRIGGER on_booking_created_whatsapp ON public.bookings IS 
'Automatically queues WhatsApp notification for new bookings with pending status.';

COMMENT ON TABLE public.webhook_events IS 
'Queue table for webhook events including WhatsApp notifications. 
Allows for reliable processing and retry logic.';