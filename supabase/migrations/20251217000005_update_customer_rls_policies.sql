-- Update RLS policies for customers to allow public booking creation
-- This is needed for the public booking flow to create customers

-- Allow anonymous users to create customers (for booking flow)
CREATE POLICY "Anonymous can create customers for bookings" ON public.customers
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous users to read customers (for booking confirmation)
CREATE POLICY "Anonymous can read customers for bookings" ON public.customers
  FOR SELECT TO anon USING (true);

-- Allow anonymous users to update customers (for booking updates)
CREATE POLICY "Anonymous can update customers for bookings" ON public.customers
  FOR UPDATE TO anon USING (true);

-- Grant access to the analytics views for authenticated users
GRANT SELECT ON public.customer_analytics TO authenticated;
GRANT SELECT ON public.marketing_segments TO authenticated;