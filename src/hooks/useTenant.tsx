import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { generateTenantURL, generateAdminURL, getCurrentDomain } from '@/lib/domain';

interface TenantSettings {
  primary_color?: string;
  logo_url?: string;
}

interface Tenant {
  id: string;
  slug: string;
  name: string;
  owner_id: string | null;
  settings: TenantSettings;
  plan: string;
  status: string;
  subscription_status?: string;
  mp_payer_id?: string;
  mp_subscription_id?: string;
}

interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'staff';
  status: string;
}

type TenantMode = 'public' | 'admin';

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: Tenant[];
  currentMembership: TenantMember | null;
  loading: boolean;
  mode: TenantMode;
  setCurrentTenant: (tenant: Tenant | null) => void;
  refreshTenants: () => Promise<void>;
  createTenant: (name: string, slug: string) => Promise<{ tenant: Tenant | null; error: Error | null }>;
  generateTenantPublicURL: (tenantSlug: string, path?: string) => string;
  generateAdminURL: (path?: string) => string;
  getCurrentDomain: () => string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userTenants, setUserTenants] = useState<Tenant[]>([]);
  const [currentMembership, setCurrentMembership] = useState<TenantMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<TenantMode>('admin');

  // Determine mode based on URL
  const determineMode = (): TenantMode => {
    const path = location.pathname;
    if (path.startsWith('/app') || path.startsWith('/dashboard') || path === '/onboarding') {
      return 'admin';
    }
    // Check if it's a valid tenant slug pattern
    if (path !== '/' && path !== '/auth' && !path.startsWith('/app')) {
      const slug = path.split('/')[1];
      // Valid tenant slugs should be alphanumeric with hyphens/underscores only
      if (slug && /^[a-zA-Z0-9_-]+$/.test(slug) && !['app', 'dashboard', 'auth', 'onboarding'].includes(slug)) {
        return 'public';
      }
    }
    return 'admin';
  };

  // Fetch tenant by slug for public mode
  const fetchTenantBySlug = async (slug: string) => {
    try {
      const { data: tenantData, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !tenantData) {
        console.error('Tenant not found for slug:', slug);
        return null;
      }

      const tenant: Tenant = {
        id: tenantData.id,
        slug: tenantData.slug,
        name: tenantData.name,
        owner_id: tenantData.owner_id,
        settings: (tenantData.settings || {}) as TenantSettings,
        plan: tenantData.plan || 'free',
        status: tenantData.status,
        subscription_status: tenantData.subscription_status,
        mp_payer_id: tenantData.mp_payer_id,
        mp_subscription_id: tenantData.mp_subscription_id,
      };

      return tenant;
    } catch (error) {
      console.error('Error fetching tenant by slug:', error);
      return null;
    }
  };

  // Fetch user tenants for admin mode
  const fetchUserTenants = async () => {
    if (!user) {
      setUserTenants([]);
      setCurrentTenant(null);
      setCurrentMembership(null);
      setLoading(false);
      return;
    }

    try {
      // Get all memberships for user
      const { data: memberships, error: memberError } = await supabase
        .from('tenant_members')
        .select('*, tenants(*)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (memberError) throw memberError;

      if (memberships && memberships.length > 0) {
        const tenants: Tenant[] = memberships
          .map((m: { tenants?: any; role?: string }) => {
            if (!m.tenants) return null;
            return {
              ...m.tenants,
              settings: (m.tenants.settings || {}) as TenantSettings,
              subscription_status: m.tenants.subscription_status,
              mp_payer_id: m.tenants.mp_payer_id,
              mp_subscription_id: m.tenants.mp_subscription_id,
            } as Tenant;
          })
          .filter(Boolean) as Tenant[];
        
        setUserTenants(tenants);
        
        // Set first tenant as current if none selected
        if (!currentTenant && tenants.length > 0) {
          setCurrentTenant(tenants[0]);
          setCurrentMembership(memberships[0]);
        } else if (currentTenant) {
          // Update membership for current tenant
          const membership = memberships.find((m: { tenant_id?: string }) => m.tenant_id === currentTenant.id);
          setCurrentMembership(membership || null);
        }
      } else {
        setUserTenants([]);
        setCurrentTenant(null);
        setCurrentMembership(null);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Main tenant loading logic based on mode
  const loadTenantContext = async () => {
    setLoading(true);
    const currentMode = determineMode();
    setMode(currentMode);

    if (currentMode === 'public') {
      // Extract slug from URL
      const pathSegments = location.pathname.split('/').filter(Boolean);
      const slug = pathSegments[0];
      
      if (slug) {
        const tenant = await fetchTenantBySlug(slug);
        setCurrentTenant(tenant);
        setCurrentMembership(null); // No membership in public mode
        setUserTenants([]); // No user tenants in public mode
      } else {
        setCurrentTenant(null);
        setCurrentMembership(null);
        setUserTenants([]);
      }
      setLoading(false);
    } else {
      // Admin mode - use existing membership-based logic
      await fetchUserTenants();
    }
  };

  const createTenant = async (name: string, slug: string): Promise<{ tenant: Tenant | null; error: Error | null }> => {
    if (!user) {
      return { tenant: null, error: new Error('Not authenticated') };
    }

    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name,
          slug: slug.toLowerCase(),
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const tenant: Tenant = {
        ...data,
        settings: (data.settings || {}) as TenantSettings,
      };

      await fetchUserTenants();
      return { tenant, error: null };
    } catch (error) {
      return { tenant: null, error: error as Error };
    }
  };

  // Effect to load tenant context when location or user changes
  useEffect(() => {
    loadTenantContext();
  }, [location.pathname, user]);

  // Effect to update mode when location changes
  useEffect(() => {
    const currentMode = determineMode();
    if (currentMode !== mode) {
      setMode(currentMode);
    }
  }, [location.pathname]);

  // Domain-aware URL generation functions
  const generateTenantPublicURL = (tenantSlug: string, path?: string): string => {
    return generateTenantURL(tenantSlug, path);
  };

  const generateAdminURLWrapper = (path?: string): string => {
    return generateAdminURL(path);
  };

  const getCurrentDomainWrapper = (): string => {
    return getCurrentDomain();
  };

  return (
    <TenantContext.Provider value={{
      currentTenant,
      userTenants,
      currentMembership,
      loading,
      mode,
      setCurrentTenant,
      refreshTenants: loadTenantContext,
      createTenant,
      generateTenantPublicURL,
      generateAdminURL: generateAdminURLWrapper,
      getCurrentDomain: getCurrentDomainWrapper,
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
