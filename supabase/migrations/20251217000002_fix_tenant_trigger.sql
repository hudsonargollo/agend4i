-- Fix the tenant creation trigger to handle NULL owner_id
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create tenant member if owner_id is not NULL
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role, status)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  END IF;
  RETURN NEW;
END;
$$;