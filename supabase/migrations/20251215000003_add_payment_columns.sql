-- ==========================================
-- MERCADO PAGO INTEGRATION COLUMNS
-- ==========================================

-- Add Mercado Pago integration columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN mp_payer_id TEXT,
ADD COLUMN mp_subscription_id TEXT,
ADD COLUMN subscription_status TEXT DEFAULT 'inactive' CHECK (
  subscription_status IN ('active', 'past_due', 'cancelled', 'inactive')
);

-- Add indexes for payment-related queries
CREATE INDEX idx_tenants_mp_payer ON public.tenants(mp_payer_id) WHERE mp_payer_id IS NOT NULL;
CREATE INDEX idx_tenants_mp_subscription ON public.tenants(mp_subscription_id) WHERE mp_subscription_id IS NOT NULL;
CREATE INDEX idx_tenants_subscription_status ON public.tenants(subscription_status);

-- Add constraint to ensure subscription consistency
-- If mp_subscription_id exists, subscription_status should not be 'inactive'
ALTER TABLE public.tenants 
ADD CONSTRAINT subscription_consistency CHECK (
  (mp_subscription_id IS NULL AND subscription_status = 'inactive') OR
  (mp_subscription_id IS NOT NULL AND subscription_status != 'inactive')
);