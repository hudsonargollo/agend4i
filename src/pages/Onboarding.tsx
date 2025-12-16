import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Loader2, Check, X, AlertCircle, Info } from 'lucide-react';
import { getCurrentDomain, generateTenantURL } from '@/lib/domain';
import { 
  generateSlugFromName, 
  isValidSlugFormat,
  isReservedSlug
} from '@/lib/slugValidation';
import { validateSlugAvailability, SlugValidationResult } from '@/lib/slugValidationService';

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
  const [slugValidation, setSlugValidation] = useState<SlugValidationResult | null>(null);
  const [manualSlugEdit, setManualSlugEdit] = useState(false);
  
  // Get current domain for display
  const currentDomain = getCurrentDomain();

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

  // Auto-generate slug from shop name (only if not manually edited)
  useEffect(() => {
    if (shopName && !manualSlugEdit) {
      const generatedSlug = generateSlugFromName(shopName);
      setSlug(generatedSlug);
    }
  }, [shopName, manualSlugEdit]);

  // Check slug availability and validation using database function
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      setSlugValidation(null);
      return;
    }

    const checkSlug = async () => {
      setCheckingSlug(true);
      
      try {
        const validation = await validateSlugAvailability(slug);
        setSlugValidation(validation);
        setSlugAvailable(validation.available);
      } catch (error) {
        console.error('Error validating slug:', error);
        setSlugValidation({
          available: false,
          error: 'Erro ao verificar disponibilidade do link'
        });
        setSlugAvailable(false);
      } finally {
        setCheckingSlug(false);
      }
    };

    const timeout = setTimeout(checkSlug, 500);
    return () => clearTimeout(timeout);
  }, [slug]);

  const handleCreateShop = async () => {
    if (!shopName || !slug || !slugAvailable) return;

    setLoading(true);
    try {
      const { error } = await createTenant(shopName, slug);
      
      if (error) {
        toast({
          title: 'Erro ao criar estabelecimento',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Estabelecimento criado com sucesso!',
          description: `Sua página estará disponível em ${generateTenantURL(slug)}`,
        });
        navigate('/app');
      }
    } catch (error) {
      toast({
        title: 'Erro ao criar estabelecimento',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSlugChange = (value: string) => {
    setManualSlugEdit(true);
    const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleanSlug);
    
    // Immediate client-side validation feedback
    if (cleanSlug.length >= 2) {
      if (isReservedSlug(cleanSlug)) {
        setSlugValidation({
          available: false,
          error: 'Este nome está reservado pelo sistema',
          suggestions: [
            `${cleanSlug}-shop`,
            `${cleanSlug}-store`,
            `${cleanSlug}1`,
            `${cleanSlug}-pro`,
            `${cleanSlug}-biz`
          ]
        });
        setSlugAvailable(false);
      } else if (!isValidSlugFormat(cleanSlug)) {
        setSlugValidation({
          available: false,
          error: 'Use apenas letras minúsculas, números e hífens (sem começar ou terminar com hífen)'
        });
        setSlugAvailable(false);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSlug(suggestion);
    setManualSlugEdit(true);
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
            Passo {step} de 2 - Vamos criar sua página de agendamentos
          </CardDescription>
          <div className="mt-4">
            <Progress value={(step / 2) * 100} className="w-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Digite o nome do seu estabelecimento. Vamos usar isso para criar seu link personalizado.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="shop-name">Nome do estabelecimento *</Label>
                <Input
                  id="shop-name"
                  placeholder="Ex: Barbearia do João, Salão Beleza & Cia"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  maxLength={100}
                />
                {shopName && (
                  <p className="text-sm text-muted-foreground">
                    Seu link será: {currentDomain}/{generateSlugFromName(shopName)}
                  </p>
                )}
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => setStep(2)}
                disabled={!shopName.trim() || shopName.trim().length < 2}
              >
                Continuar
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Personalize seu link de agendamentos. Seus clientes usarão este endereço para fazer reservas.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Seu link personalizado *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{currentDomain}/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="flex-1"
                    placeholder="meu-negocio"
                  />
                  <div className="w-6">
                    {checkingSlug && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {!checkingSlug && slugAvailable === true && <Check className="w-5 h-5 text-green-500" />}
                    {!checkingSlug && slugAvailable === false && <X className="w-5 h-5 text-destructive" />}
                  </div>
                </div>
                
                {slugValidation?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{slugValidation.error}</AlertDescription>
                  </Alert>
                )}
                
                {slugValidation?.suggestions && slugValidation.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {isReservedSlug(slug) 
                        ? 'Este nome é reservado pelo sistema. Experimente uma dessas alternativas:' 
                        : 'Este link já está em uso. Experimente uma dessas alternativas:'
                      }
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {slugValidation.suggestions.map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs hover:bg-primary hover:text-primary-foreground"
                        >
                          {currentDomain}/{suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {slugAvailable === true && (
                  <p className="text-sm text-green-600">
                    ✓ Link disponível: {currentDomain}/{slug}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Voltar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleCreateShop}
                  disabled={loading || !slugAvailable || !slug.trim()}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Criar Estabelecimento
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
