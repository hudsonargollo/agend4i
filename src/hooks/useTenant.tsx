import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
}

interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'staff';
  status: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: Tenant[];
  currentMembership: TenantMember | null;
  loading: boolean;
  setCurrentTenant: (tenant: Tenant | null) => void;
  refreshTenants: () => Promise<void>;
  createTenant: (name: string, slug: string) => Promise<{ tenant: Tenant | null; error: Error | null }>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userTenants, setUserTenants] = useState<Tenant[]>([]);
  const [currentMembership, setCurrentMembership] = useState<TenantMember | null>(null);
  const [loading, setLoading] = useState(true);

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
          .map((m: any) => {
            if (!m.tenants) return null;
            return {
              ...m.tenants,
              settings: (m.tenants.settings || {}) as TenantSettings,
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
          const membership = memberships.find((m: any) => m.tenant_id === currentTenant.id);
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

  useEffect(() => {
    fetchUserTenants();
  }, [user]);

  return (
    <TenantContext.Provider value={{
      currentTenant,
      userTenants,
      currentMembership,
      loading,
      setCurrentTenant,
      refreshTenants: fetchUserTenants,
      createTenant,
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
