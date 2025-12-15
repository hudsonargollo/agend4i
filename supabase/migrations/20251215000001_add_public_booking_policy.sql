-- ==========================================
-- PUBLIC BOOKING RLS POLICY
-- ==========================================

-- Allow anonymous users to INSERT bookings with status 'pending'
-- This enables public booking functionality without authentication
CREATE POLICY "Anonymous users can create pending bookings" ON public.bookings
  FOR INSERT TO anon 
  WITH CHECK (
    status = 'pending' 
    AND tenant_id IS NOT NULL
    AND staff_id IS NOT NULL
    AND service_id IS NOT NULL
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
  );

-- Allow anonymous users to view bookings for availability checking
-- This is needed for the public booking interface to check conflicts
CREATE POLICY "Anonymous users can view bookings for availability" ON public.bookings
  FOR SELECT TO anon 
  USING (
    tenant_id IS NOT NULL
    AND status NOT IN ('cancelled', 'no_show')
  );