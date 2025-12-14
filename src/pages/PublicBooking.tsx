import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Star, Clock, Scissors } from 'lucide-react';

interface TenantSettings {
  primary_color?: string;
  logo_url?: string;
}

interface Tenant {
  id: string;
  slug: string;
  name: string;
  settings: TenantSettings;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price: number;
  category: string | null;
}

interface Staff {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string | null;
}

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (tenantError || !tenantData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const tenant: Tenant = {
        id: tenantData.id,
        slug: tenantData.slug,
        name: tenantData.name,
        settings: (tenantData.settings || {}) as TenantSettings,
      };

      setTenant(tenant);

      // Fetch services and staff in parallel
      const [servicesRes, staffRes] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('is_active', true)
          .order('display_name'),
      ]);

      setServices(servicesRes.data || []);
      setStaff(staffRes.data || []);
      setLoading(false);
    };

    fetchTenantData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-bold mb-2">Estabelecimento não encontrado</h1>
            <p className="text-muted-foreground">
              O link que você acessou não existe ou foi desativado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = tenant?.settings?.primary_color || '#000000';

  return (
    <div className="min-h-screen bg-background">
      {/* Header with branding */}
      <div 
        className="py-8 px-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-2xl mx-auto text-center">
          {tenant?.settings?.logo_url ? (
            <img 
              src={tenant.settings.logo_url} 
              alt={tenant.name}
              className="w-20 h-20 mx-auto rounded-full object-cover border-4 border-white/20"
            />
          ) : (
            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center">
              <Scissors className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold mt-4 text-white">{tenant?.name}</h1>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Services */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Serviços</h2>
          {services.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum serviço disponível no momento
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <Card key={service.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      {service.description && (
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{service.duration_min}min</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R$ {service.price.toFixed(2)}</p>
                      <Button size="sm" className="mt-2" style={{ backgroundColor: primaryColor }}>
                        Agendar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Staff */}
        {staff.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Profissionais</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {staff.map((member) => (
                <Card key={member.id} className="flex-shrink-0 w-32">
                  <CardContent className="py-4 text-center">
                    {member.avatar_url ? (
                      <img 
                        src={member.avatar_url} 
                        alt={member.display_name}
                        className="w-16 h-16 mx-auto rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-xl font-bold">{member.display_name[0]}</span>
                      </div>
                    )}
                    <p className="font-medium mt-2 text-sm truncate">{member.display_name}</p>
                    {member.role && (
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
