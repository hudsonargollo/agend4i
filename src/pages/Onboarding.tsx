import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Loader2, Check, X } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { userTenants, createTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!tenantLoading && userTenants.length > 0) {
      navigate('/dashboard');
    }
  }, [userTenants, tenantLoading, navigate]);

  // Auto-generate slug from shop name
  useEffect(() => {
    if (shopName) {
      const generatedSlug = shopName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generatedSlug);
    }
  }, [shopName]);

  // Check slug availability
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      return;
    }

    const checkSlug = async () => {
      setCheckingSlug(true);
      const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      
      setSlugAvailable(data === null);
      setCheckingSlug(false);
    };

    const timeout = setTimeout(checkSlug, 500);
    return () => clearTimeout(timeout);
  }, [slug]);

  const handleCreateShop = async () => {
    if (!shopName || !slug || !slugAvailable) return;

    setLoading(true);
    const { error } = await createTenant(shopName, slug);
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao criar estabelecimento',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Estabelecimento criado!',
        description: `Sua página estará disponível em agendai.online/${slug}`,
      });
      navigate('/dashboard');
    }
  };

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Scissors className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Configure seu negócio</CardTitle>
          <CardDescription>
            Passo {step} de 2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="shop-name">Nome do estabelecimento</Label>
                <Input
                  id="shop-name"
                  placeholder="Ex: Barbearia do João"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => setStep(2)}
                disabled={!shopName}
              >
                Continuar
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="slug">Seu link personalizado</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">agendai.online/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1"
                  />
                  <div className="w-6">
                    {checkingSlug && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {!checkingSlug && slugAvailable === true && <Check className="w-5 h-5 text-green-500" />}
                    {!checkingSlug && slugAvailable === false && <X className="w-5 h-5 text-destructive" />}
                  </div>
                </div>
                {slugAvailable === false && (
                  <p className="text-sm text-destructive">Este link já está em uso</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Voltar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleCreateShop}
                  disabled={loading || !slugAvailable}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Criar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
