-- ==========================================
-- AVAILABILITY CHECKING FUNCTION
-- ==========================================

-- Function to check booking availability atomically
-- Prevents double-booking by using database-level locking
CREATE OR REPLACE FUNCTION public.check_availability(
  p_tenant_id UUID,
  p_staff_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Validate input parameters
  IF p_tenant_id IS NULL OR p_staff_id IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Validate time range
  IF p_start_time >= p_end_time THEN
    RETURN FALSE;
  END IF;
  
  -- Check for conflicting bookings with row-level locking
  -- This prevents race conditions during concurrent booking attempts
  SELECT COUNT(*)
  INTO conflict_count
  FROM public.bookings
  WHERE tenant_id = p_tenant_id
    AND staff_id = p_staff_id
    AND status NOT IN ('cancelled', 'no_show')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      -- Time overlap detection: two time ranges overlap if start1 < end2 AND start2 < end1
      p_start_time < end_time AND start_time < p_end_time
    )
  FOR UPDATE; -- Lock rows to prevent concurrent modifications
  
  -- Return TRUE if no conflicts found
  RETURN conflict_count = 0;
END;
$;

-- Grant execute permission to anonymous users for public booking
GRANT EXECUTE ON FUNCTION public.check_availability(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_availability(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;