-- ==========================================
-- ENHANCE CUSTOMER DATA FOR MARKETING & CONTROL
-- ==========================================

-- Add marketing and control fields to customers table
-- Marketing fields
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN DEFAULT true;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT false;

-- Customer segmentation
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_segment TEXT DEFAULT 'new';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_services TEXT[];

-- Behavioral data
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS average_booking_value DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_booking_date TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS booking_frequency TEXT DEFAULT 'unknown';

-- Acquisition tracking
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS acquisition_source TEXT DEFAULT 'direct';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS referred_by_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Engagement tracking
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_attempts INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS response_rate DECIMAL(3,2) DEFAULT 0.00;

-- Geographic and demographic
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gender TEXT;

-- Status tracking
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add constraints after columns are created (using DO block to handle existing constraints)
DO $$
BEGIN
    -- Add constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_customer_segment') THEN
        ALTER TABLE public.customers ADD CONSTRAINT check_customer_segment 
            CHECK (customer_segment IN ('new', 'regular', 'vip', 'inactive'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_booking_frequency') THEN
        ALTER TABLE public.customers ADD CONSTRAINT check_booking_frequency 
            CHECK (booking_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'irregular', 'unknown'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_acquisition_source') THEN
        ALTER TABLE public.customers ADD CONSTRAINT check_acquisition_source 
            CHECK (acquisition_source IN ('direct', 'whatsapp', 'instagram', 'facebook', 'google', 'referral', 'walk_in'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_age_group') THEN
        ALTER TABLE public.customers ADD CONSTRAINT check_age_group 
            CHECK (age_group IN ('18-25', '26-35', '36-45', '46-55', '56-65', '65+'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_gender') THEN
        ALTER TABLE public.customers ADD CONSTRAINT check_gender 
            CHECK (gender IN ('M', 'F', 'Other', 'Prefer not to say'));
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_segment ON public.customers(customer_segment);
CREATE INDEX IF NOT EXISTS idx_customers_acquisition ON public.customers(acquisition_source);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_last_booking ON public.customers(last_booking_date);
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON public.customers(total_spent);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Create a function to automatically update customer statistics
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    customer_stats RECORD;
    days_since_last_booking INTEGER;
    frequency_category TEXT;
BEGIN
    -- Calculate customer statistics
    SELECT 
        COUNT(*) as booking_count,
        COALESCE(SUM(total_price), 0) as total_amount,
        COALESCE(AVG(total_price), 0) as avg_amount,
        MAX(start_time) as last_booking
    INTO customer_stats
    FROM public.bookings 
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND status IN ('confirmed', 'completed');
    
    -- Determine booking frequency
    IF customer_stats.booking_count > 1 THEN
        SELECT EXTRACT(days FROM (customer_stats.last_booking - MIN(start_time))) / customer_stats.booking_count
        INTO days_since_last_booking
        FROM public.bookings 
        WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
        AND status IN ('confirmed', 'completed');
        
        frequency_category := CASE 
            WHEN days_since_last_booking <= 10 THEN 'weekly'
            WHEN days_since_last_booking <= 20 THEN 'biweekly'
            WHEN days_since_last_booking <= 40 THEN 'monthly'
            WHEN days_since_last_booking <= 120 THEN 'quarterly'
            ELSE 'irregular'
        END;
    ELSE
        frequency_category := 'unknown';
    END IF;
    
    -- Update customer record
    UPDATE public.customers 
    SET 
        total_bookings = customer_stats.booking_count,
        total_spent = customer_stats.total_amount,
        average_booking_value = customer_stats.avg_amount,
        last_booking_date = customer_stats.last_booking,
        booking_frequency = frequency_category,
        customer_segment = CASE 
            WHEN customer_stats.booking_count = 0 THEN 'new'
            WHEN customer_stats.booking_count >= 10 OR customer_stats.total_amount >= 500 THEN 'vip'
            WHEN customer_stats.booking_count >= 3 THEN 'regular'
            WHEN customer_stats.last_booking < NOW() - INTERVAL '6 months' THEN 'inactive'
            ELSE 'new'
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to automatically update customer stats
DROP TRIGGER IF EXISTS update_customer_stats_on_booking ON public.bookings;
CREATE TRIGGER update_customer_stats_on_booking
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customer_stats();

-- Create a view for customer analytics
CREATE OR REPLACE VIEW public.customer_analytics AS
SELECT 
    c.tenant_id,
    c.id,
    c.name,
    c.phone,
    c.email,
    c.customer_segment,
    c.total_bookings,
    c.total_spent,
    c.average_booking_value,
    c.last_booking_date,
    c.booking_frequency,
    c.acquisition_source,
    c.marketing_consent,
    c.whatsapp_consent,
    c.email_consent,
    c.is_active,
    c.loyalty_points,
    c.created_at,
    
    -- Calculated fields
    EXTRACT(days FROM (NOW() - c.last_booking_date)) as days_since_last_booking,
    EXTRACT(days FROM (NOW() - c.created_at)) as days_as_customer,
    
    -- Preferred staff name
    s.display_name as preferred_staff_name,
    
    -- Risk indicators
    CASE 
        WHEN c.last_booking_date < NOW() - INTERVAL '3 months' THEN 'at_risk'
        WHEN c.last_booking_date < NOW() - INTERVAL '6 months' THEN 'churned'
        ELSE 'active'
    END as churn_risk,
    
    -- Lifetime value category
    CASE 
        WHEN c.total_spent >= 1000 THEN 'high_value'
        WHEN c.total_spent >= 300 THEN 'medium_value'
        WHEN c.total_spent >= 100 THEN 'low_value'
        ELSE 'minimal_value'
    END as ltv_category

FROM public.customers c
LEFT JOIN public.staff s ON c.preferred_staff_id = s.id
WHERE c.is_active = true;

-- Create a view for marketing campaigns
CREATE OR REPLACE VIEW public.marketing_segments AS
SELECT 
    tenant_id,
    customer_segment,
    acquisition_source,
    COUNT(*) as customer_count,
    AVG(total_spent) as avg_ltv,
    AVG(total_bookings) as avg_bookings,
    COUNT(*) FILTER (WHERE marketing_consent = true) as marketing_consent_count,
    COUNT(*) FILTER (WHERE whatsapp_consent = true) as whatsapp_consent_count,
    COUNT(*) FILTER (WHERE email_consent = true) as email_consent_count,
    COUNT(*) FILTER (WHERE last_booking_date > NOW() - INTERVAL '30 days') as active_last_30_days,
    COUNT(*) FILTER (WHERE last_booking_date > NOW() - INTERVAL '90 days') as active_last_90_days
FROM public.customers 
WHERE is_active = true
GROUP BY tenant_id, customer_segment, acquisition_source;

-- Create function to track customer acquisition source from booking
CREATE OR REPLACE FUNCTION public.set_customer_acquisition_source(
    p_customer_id UUID,
    p_source TEXT DEFAULT 'direct',
    p_referral_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.customers 
    SET 
        acquisition_source = p_source,
        referral_code = p_referral_code,
        updated_at = NOW()
    WHERE id = p_customer_id 
    AND acquisition_source = 'direct'; -- Only update if not already set
END;
$$;

-- Grant permissions
GRANT SELECT ON public.customer_analytics TO authenticated, anon;
GRANT SELECT ON public.marketing_segments TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_customer_acquisition_source(UUID, TEXT, TEXT) TO authenticated, anon;

-- Add some sample data to existing Zeroum customers (if any exist)
DO $$
DECLARE
    zeroum_tenant_id UUID;
BEGIN
    -- Get Zeroum tenant ID
    SELECT id INTO zeroum_tenant_id 
    FROM public.tenants 
    WHERE slug = 'zeroumbarbearia';
    
    IF zeroum_tenant_id IS NOT NULL THEN
        -- Update any existing customers with default marketing preferences
        UPDATE public.customers 
        SET 
            marketing_consent = true,
            whatsapp_consent = true,
            acquisition_source = 'direct',
            customer_segment = 'new',
            is_active = true
        WHERE tenant_id = zeroum_tenant_id
        AND marketing_consent IS NULL;
        
        RAISE NOTICE 'Updated existing Zeroum customers with marketing preferences';
    END IF;
END $$;