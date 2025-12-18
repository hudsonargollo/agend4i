-- ==========================================
-- ZEROUM BARBEARIA COMPLETE SETUP
-- ==========================================
-- This migration creates the complete Zeroum Barbearia setup with all services, staff, and configuration

-- First, create the Zeroum user account (this would normally be done through auth, but we'll create a placeholder)
DO $$
DECLARE
    zeroum_user_id UUID;
    zeroum_tenant_id UUID;
    service_ids UUID[];
    staff_ids UUID[];
BEGIN
    -- Generate a consistent UUID for the Zeroum user
    zeroum_user_id := '00000000-0000-0000-0000-000000000001'::UUID;
    
    -- Skip profile creation for now - will be created when user signs up
    -- We'll use NULL for owner_id to avoid foreign key constraint issues

    -- Create the Zeroum Barbearia tenant
    INSERT INTO public.tenants (
        slug,
        name,
        owner_id,
        plan,
        status,
        settings
    ) VALUES (
        'zeroumbarbearia',
        'Zero Um Barber Shop',
        NULL,
        'pro',
        'active',
        jsonb_build_object(
            'primary_color', '#000000',
            'logo_url', 'https://storagesalon.s3.sa-east-1.amazonaws.com/237813logomarca3cc485ee218540c2e908f319ee0b53b1pc.jpg',
            'whatsapp_enabled', true,
            'payment_enabled', true,
            'is_zeroum_account', true,
            'account_protected', true,
            'handle', 'zeroum.jequie',
            'location', 'Centro, Jequié - BA',
            'rating', 4.9,
            'review_count', 342,
            'loyalty_program', jsonb_build_object(
                'enabled', true,
                'threshold', 10,
                'reward_description', 'Corte Grátis'
            ),
            'policies', jsonb_build_array(
                'Cancelamento com 24h de antecedência.',
                'Tolerância de atraso de 10 minutos.',
                'No-show sujeito a taxa de 50% no próximo agendamento.'
            ),
            'business_hours', jsonb_build_object(
                'monday', jsonb_build_object('open', '09:00', 'close', '18:00'),
                'tuesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
                'wednesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
                'thursday', jsonb_build_object('open', '09:00', 'close', '18:00'),
                'friday', jsonb_build_object('open', '09:00', 'close', '18:00'),
                'saturday', jsonb_build_object('open', '09:00', 'close', '16:00'),
                'sunday', jsonb_build_object('closed', true)
            )
        )
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        settings = EXCLUDED.settings
    RETURNING id INTO zeroum_tenant_id;

    -- If tenant already existed, get its ID
    IF zeroum_tenant_id IS NULL THEN
        SELECT id INTO zeroum_tenant_id FROM public.tenants WHERE slug = 'zeroumbarbearia';
    END IF;

    RAISE NOTICE 'Zeroum tenant ID: %', zeroum_tenant_id;

    -- Create all services from the mock data
    WITH service_data AS (
        SELECT * FROM (VALUES
            -- Beard services
            ('1', 'Barba', 'Modelagem e hidratação.', 30, 25.00, 'Barba', 'https://images.unsplash.com/photo-1503951914875-befea74701c5?w=800&auto=format&fit=crop&q=60'),
            ('2', 'Barboterapia', 'Barba com toalha quente e massagem.', 30, 30.00, 'Barba', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=60'),
            
            -- Hair services
            ('3', 'Corte', 'Corte social ou moderno.', 30, 35.00, 'Cabelo', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=60'),
            ('11', 'Freestyle', 'Desenhos e arte no cabelo.', 20, 25.00, 'Cabelo', 'https://images.unsplash.com/photo-1593702288056-40e697e62754?w=800&auto=format&fit=crop&q=60'),
            ('15', 'Platinado', 'Descoloração global.', 60, 180.00, 'Química', 'https://images.unsplash.com/photo-1616952936720-3b4787a71676?w=800&auto=format&fit=crop&q=60'),
            
            -- Combos
            ('4', 'Corte + Barba', 'Combo clássico.', 60, 55.00, 'Combos', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=60'),
            ('5', 'Corte + Barba + Sobrancelhas', 'Serviço completo.', 60, 60.00, 'Combos', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=60'),
            ('6', 'Corte + Barboterapia', 'Corte e relaxamento facial.', 60, 60.00, 'Combos', 'https://images.unsplash.com/photo-1503951914875-befea74701c5?w=800&auto=format&fit=crop&q=60'),
            ('7', 'Corte + Barboterapia + Sobrancelhas', 'A experiência completa.', 60, 65.00, 'Combos', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&auto=format&fit=crop&q=60'),
            ('8', 'Corte + Freestyle', 'Corte com arte.', 30, 40.00, 'Combos', 'https://images.unsplash.com/photo-1593702288056-40e697e62754?w=800&auto=format&fit=crop&q=60'),
            ('9', 'Corte + Sobrancelhas', 'Alinhamento do visual.', 30, 40.00, 'Combos', 'https://images.unsplash.com/photo-1504812888631-4a41f6e2e505?w=800&auto=format&fit=crop&q=60'),
            ('10', 'Corte + Penteado', 'Corte com finalização especial.', 30, 45.00, 'Combos', 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=800&auto=format&fit=crop&q=60'),
            ('16', 'Platinado + Corte', 'Visual totalmente novo.', 60, 200.00, 'Combos', 'https://images.unsplash.com/photo-1616952936720-3b4787a71676?w=800&auto=format&fit=crop&q=60'),
            ('17', 'Platinado + Corte + Barba', 'Transformação total.', 120, 220.00, 'Combos', 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b2?w=800&auto=format&fit=crop&q=60'),
            ('18', 'Platinado + Corte + Barboterapia', 'Transformação com relaxamento.', 120, 225.00, 'Combos', 'https://images.unsplash.com/photo-1534349762913-57a46984e77d?w=800&auto=format&fit=crop&q=60'),
            
            -- Other services
            ('12', 'Hidratação', 'Tratamento capilar profundo.', 30, 25.00, 'Tratamento', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60'),
            ('13', 'Penteado', 'Modelagem para eventos.', 15, 25.00, 'Acabamento', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=60'),
            ('14', 'Pezinho', 'Acabamento do corte.', 15, 15.00, 'Acabamento', 'https://images.unsplash.com/photo-1503951914875-befea74701c5?w=800&auto=format&fit=crop&q=60'),
            ('19', 'Sobrancelhas', 'Design na navalha.', 15, 15.00, 'Acabamento', 'https://images.unsplash.com/photo-1596704017254-9b1b1c9c9c1c?w=800&auto=format&fit=crop&q=60')
        ) AS t(service_id, name, description, duration_min, price, category, image_url)
    )
    INSERT INTO public.services (tenant_id, name, description, duration_min, price, category, image_url, is_active)
    SELECT 
        zeroum_tenant_id,
        name,
        description,
        duration_min,
        price,
        category,
        image_url,
        true
    FROM service_data
    ON CONFLICT DO NOTHING;


    -- Create staff members from the mock data
    WITH staff_data AS (
        SELECT * FROM (VALUES
            ('p1', 'Iwlys', 'https://storagesalon.s3.sa-east-1.amazonaws.com/237813239886b2ebf01c5447ad5c3ec17419d9cf22fcpp.jpg', 'Barbeiro'),
            ('p2', 'Rodrigo', 'https://storagesalon.s3.sa-east-1.amazonaws.com/237813237813635684a28748d8a7e25eb63ed34590e3pp.jpg', 'Barbeiro'),
            ('p3', 'Jefter', 'https://storagesalon.s3.sa-east-1.amazonaws.com/237813277566dda64785067db96fb7bf3ade0dfaf6c4pp.jpg', 'Barbeiro')
        ) AS t(staff_id, display_name, avatar_url, role)
    )
    INSERT INTO public.staff (tenant_id, display_name, avatar_url, role, is_active, working_hours)
    SELECT 
        zeroum_tenant_id,
        display_name,
        avatar_url,
        role,
        true,
        jsonb_build_object(
            'monday', jsonb_build_object('start', '09:00', 'end', '18:00'),
            'tuesday', jsonb_build_object('start', '09:00', 'end', '18:00'),
            'wednesday', jsonb_build_object('start', '09:00', 'end', '18:00'),
            'thursday', jsonb_build_object('start', '09:00', 'end', '18:00'),
            'friday', jsonb_build_object('start', '09:00', 'end', '18:00'),
            'saturday', jsonb_build_object('start', '09:00', 'end', '16:00'),
            'sunday', jsonb_build_object('closed', true)
        )
    FROM staff_data
    ON CONFLICT DO NOTHING;


    -- Get all service IDs for staff assignment
    SELECT ARRAY_AGG(id) INTO service_ids 
    FROM public.services 
    WHERE tenant_id = zeroum_tenant_id;

    -- Update all staff to offer all services
    UPDATE public.staff 
    SET services_offered = service_ids
    WHERE tenant_id = zeroum_tenant_id;

    RAISE NOTICE 'Zeroum Barbearia setup completed successfully!';
    RAISE NOTICE 'Tenant URL: https://agendai.clubemkt.digital/zeroumbarbearia';
    RAISE NOTICE 'Services created: %', (SELECT COUNT(*) FROM public.services WHERE tenant_id = zeroum_tenant_id);
    RAISE NOTICE 'Staff created: %', (SELECT COUNT(*) FROM public.staff WHERE tenant_id = zeroum_tenant_id);

END $$;

-- Verify the setup
SELECT 
    'TENANT' as type,
    slug,
    name,
    plan,
    status,
    (settings->>'logo_url') as logo_url,
    (settings->>'location') as location
FROM public.tenants 
WHERE slug = 'zeroumbarbearia'

UNION ALL

SELECT 
    'SERVICES' as type,
    COUNT(*)::text as slug,
    'Total Services' as name,
    '' as plan,
    '' as status,
    '' as logo_url,
    '' as location
FROM public.services s
JOIN public.tenants t ON s.tenant_id = t.id
WHERE t.slug = 'zeroumbarbearia'

UNION ALL

SELECT 
    'STAFF' as type,
    COUNT(*)::text as slug,
    'Total Staff' as name,
    '' as plan,
    '' as status,
    '' as logo_url,
    '' as location
FROM public.staff s
JOIN public.tenants t ON s.tenant_id = t.id
WHERE t.slug = 'zeroumbarbearia';