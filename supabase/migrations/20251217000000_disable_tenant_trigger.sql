-- Temporarily disable the tenant creation trigger
DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;