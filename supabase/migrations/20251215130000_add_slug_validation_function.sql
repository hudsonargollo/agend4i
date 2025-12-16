-- Create function to validate tenant slugs
CREATE OR REPLACE FUNCTION validate_tenant_slug(slug_candidate text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reserved_slugs text[] := ARRAY[
        'app', 'auth', 'api', 'dashboard', 'onboarding', 
        'settings', 'login', 'register', 'admin', 'public'
    ];
    existing_tenant_id uuid;
    result jsonb;
BEGIN
    -- Initialize result object
    result := jsonb_build_object(
        'available', false,
        'error', null,
        'suggestions', '[]'::jsonb
    );
    
    -- Check if slug is empty or too short
    IF slug_candidate IS NULL OR length(trim(slug_candidate)) < 2 THEN
        result := jsonb_set(result, '{error}', '"Slug deve ter pelo menos 2 caracteres"');
        RETURN result;
    END IF;
    
    -- Check if slug is too long
    IF length(slug_candidate) > 50 THEN
        result := jsonb_set(result, '{error}', '"Slug deve ter no máximo 50 caracteres"');
        RETURN result;
    END IF;
    
    -- Check if slug starts or ends with hyphen
    IF slug_candidate ~ '^-' OR slug_candidate ~ '-$' THEN
        result := jsonb_set(result, '{error}', '"O link não pode começar ou terminar com hífen"');
        RETURN result;
    END IF;
    
    -- Check slug format (only lowercase letters, numbers, and hyphens)
    IF slug_candidate !~ '^[a-z0-9-]+$' THEN
        result := jsonb_set(result, '{error}', '"Use apenas letras minúsculas, números e hífens"');
        RETURN result;
    END IF;
    
    -- Check if slug is reserved
    IF slug_candidate = ANY(reserved_slugs) THEN
        result := jsonb_set(result, '{error}', '"Este nome está reservado pelo sistema"');
        -- Generate suggestions by adding suffixes
        result := jsonb_set(result, '{suggestions}', 
            jsonb_build_array(
                slug_candidate || '-shop',
                slug_candidate || '-store', 
                slug_candidate || '-biz',
                slug_candidate || '1',
                slug_candidate || '-pro'
            )
        );
        RETURN result;
    END IF;
    
    -- Check database uniqueness
    SELECT id INTO existing_tenant_id 
    FROM tenants 
    WHERE slug = slug_candidate 
    LIMIT 1;
    
    IF existing_tenant_id IS NOT NULL THEN
        result := jsonb_set(result, '{error}', '"Este link já está em uso"');
        -- Generate numbered alternatives
        result := jsonb_set(result, '{suggestions}', 
            jsonb_build_array(
                slug_candidate || '1',
                slug_candidate || '2',
                slug_candidate || '-2',
                slug_candidate || '-new',
                slug_candidate || '-plus'
            )
        );
        RETURN result;
    END IF;
    
    -- Slug is available
    result := jsonb_set(result, '{available}', 'true');
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_tenant_slug(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION validate_tenant_slug(text) IS 'Validates tenant slug availability and format, returns validation result with suggestions if unavailable';