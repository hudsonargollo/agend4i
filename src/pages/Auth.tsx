import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { getOAuthConfig, validateOAuthConfig, getOAuthRedirectUrls, validateOAuthButtonConfig, testOAuthFlowInitiation } from '@/lib/oauth-config';
import { initiateSecureOAuth, validateOAuthParameters } from '@/lib/oauth-security';
import { isZeroumAccount } from '@/scripts/create-zeroum-account';

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  password: z.string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha muito longa'),
});

const signupSchema = z.object({
  fullName: z.string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  email: z.string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  password: z.string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const { userTenants, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [oauthButtonsReady, setOauthButtonsReady] = useState(false);
  
  // Get initial tab from URL params
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [activeTab, setActiveTab] = useState(initialMode);

  // Handle OAuth errors from URL params
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      let errorMessage = 'Erro na autenticação com Google';
      
      switch (error) {
        case 'access_denied':
          errorMessage = 'Acesso negado. Você cancelou a autenticação com Google.';
          break;
        case 'callback_error':
          errorMessage = 'Erro no callback de autenticação. Tente novamente.';
          break;
        case 'invalid_request':
          errorMessage = 'Solicitação inválida. Verifique a configuração OAuth.';
          break;
        case 'server_error':
          errorMessage = 'Erro no servidor. Tente novamente em alguns minutos.';
          break;
        case 'temporarily_unavailable':
          errorMessage = 'Serviço temporariamente indisponível. Tente novamente mais tarde.';
          break;
        case 'oauth_configuration_error':
          errorMessage = 'Erro de configuração OAuth. Contate o suporte.';
          break;
        default:
          if (errorDescription) {
            errorMessage = `Erro OAuth: ${errorDescription}`;
          }
      }
      
      toast({
        title: 'Erro na autenticação',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Clean up URL params
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('error');
      newSearchParams.delete('error_description');
      navigate({ search: newSearchParams.toString() }, { replace: true });
    }
  }, [searchParams, toast, navigate]);

  // OAuth configuration and button validation
  useEffect(() => {
    // Basic configuration check
    const config = getOAuthConfig();
    const validation = validateOAuthConfig(config);
    
    if (!validation.isValid) {
      if (import.meta.env.DEV) {
        console.warn('OAuth Configuration Issues:');
        validation.errors.forEach(error => console.warn('- ' + error));
        console.warn('See docs/GOOGLE_OAUTH_SETUP.md for setup instructions');
      }
    }

    // Validate OAuth button configuration
    const buttonValidation = validateOAuthButtonConfig();
    if (!buttonValidation.isValid) {
      console.error('OAuth Button Configuration Issues:');
      buttonValidation.errors.forEach(error => console.error('- ' + error));
    }

    if (buttonValidation.warnings.length > 0) {
      console.warn('OAuth Button Configuration Warnings:');
      buttonValidation.warnings.forEach(warning => console.warn('- ' + warning));
    }

    // Test OAuth flow initiation capability
    const flowTest = testOAuthFlowInitiation();
    if (!flowTest.canInitiate) {
      console.error('OAuth Flow Initiation Issues:');
      flowTest.errors.forEach(error => console.error('- ' + error));
    }

    if (flowTest.warnings.length > 0) {
      console.warn('OAuth Flow Initiation Warnings:');
      flowTest.warnings.forEach(warning => console.warn('- ' + warning));
    }

    // Mark OAuth buttons as ready if all validations pass
    setOauthButtonsReady(validation.isValid && buttonValidation.isValid && flowTest.canInitiate);
  }, []);

  // Handle edge cases for users without tenant association
  const handleUserWithoutTenant = async (userId: string) => {
    try {
      // Check if user has any pending tenant memberships
      const { data: pendingMemberships } = await supabase
        .from('tenant_members')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (pendingMemberships && pendingMemberships.length > 0) {
        // User has pending memberships - redirect to dashboard with message
        toast({
          title: 'Convite pendente',
          description: 'Você tem convites pendentes para se juntar a estabelecimentos.',
        });
        navigate('/app');
      } else {
        // Truly new user - redirect to onboarding
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Error checking user memberships:', error);
      // Default to onboarding on error
      navigate('/onboarding');
    }
  };

  // Post-authentication routing logic
  useEffect(() => {
    if (user && !authLoading && !tenantLoading) {
      // Get return URL from search params if available
      const returnTo = searchParams.get('returnTo');
      
      // Check if user has any tenant associations
      if (userTenants.length === 0) {
        // Handle edge cases for users without active tenant associations
        handleUserWithoutTenant(user.id);
      } else {
        // Existing user with tenant - redirect to specified URL or admin dashboard
        const redirectUrl = returnTo && returnTo.startsWith('/') ? returnTo : '/app';
        navigate(redirectUrl);
      }
    }
  }, [user, authLoading, tenantLoading, userTenants, navigate, searchParams]);



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(loginForm.email.trim().toLowerCase(), loginForm.password);
      
      if (error) {
        let errorMessage = 'Erro desconhecido';
        
        if (error.message === 'Invalid login credentials') {
          errorMessage = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Por favor, confirme seu email antes de fazer login';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas. Tente novamente em alguns minutos';
        } else {
          errorMessage = error.message;
        }
        
        toast({
          title: 'Erro ao entrar',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao entrar',
        description: 'Erro de conexão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }



    setLoading(true);
    try {
      const { error } = await signUp(
        signupForm.email.trim().toLowerCase(), 
        signupForm.password, 
        signupForm.fullName.trim()
      );
      
      if (error) {
        let errorMessage = 'Erro desconhecido';
        
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          errorMessage = 'Este email já possui uma conta. Tente fazer login ou use "Continuar com Google" se você se registrou com Google.';
          setErrors({ email: errorMessage });
          
          // Suggest switching to login tab
          toast({
            title: 'Conta já existe',
            description: 'Este email já está registrado. Redirecionando para o login...',
            variant: 'destructive',
          });
          
          // Auto-switch to login tab after a short delay
          setTimeout(() => {
            setActiveTab('login');
            setLoginForm({ email: signupForm.email, password: '' });
          }, 2000);
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Senha deve ter pelo menos 6 caracteres';
          setErrors({ password: errorMessage });
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Email inválido';
          setErrors({ email: errorMessage });
        } else if (error.message.includes('Signup is disabled')) {
          errorMessage = 'Cadastro temporariamente desabilitado. Tente novamente mais tarde.';
        } else {
          errorMessage = error.message;
        }
        
        toast({
          title: 'Erro ao criar conta',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Conta criada com sucesso!',
          description: 'Você será redirecionado para configurar seu negócio.',
        });
        // Clear form
        setSignupForm({ fullName: '', email: '', password: '' });
      }
    } catch (error) {
      toast({
        title: 'Erro ao criar conta',
        description: 'Erro de conexão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setOauthLoading(true);
    try {
      // Check if user is trying to use OAuth with Zeroum account email
      const currentEmail = activeTab === 'login' ? loginForm.email : signupForm.email;
      if (currentEmail && isZeroumAccount(currentEmail.trim().toLowerCase())) {
        toast({
          title: 'Método de autenticação não permitido',
          description: 'Esta conta deve usar autenticação tradicional com email e senha.',
          variant: 'destructive',
        });
        setOauthLoading(false);
        return;
      }
      
      // Validate OAuth configuration before proceeding
      const config = getOAuthConfig();
      const validation = validateOAuthConfig(config);
      
      if (!validation.isValid) {
        console.error('OAuth configuration errors:', validation.errors);
        toast({
          title: 'Configuração OAuth inválida',
          description: 'Google OAuth não está configurado corretamente. Contate o suporte.',
          variant: 'destructive',
        });
        return;
      }

      // Get proper redirect URLs for current environment
      const redirectUrls = getOAuthRedirectUrls(config);
      
      // For development, use the current window location to ensure correct port
      let callbackBaseUrl = redirectUrls.appCallback;
      if (window.location.hostname === 'localhost') {
        callbackBaseUrl = `${window.location.protocol}//${window.location.host}/auth/callback`;
      }
      
      // Debug: Log the redirect URLs
      console.log('OAuth redirect URLs:', redirectUrls);
      console.log('Using callback base URL:', callbackBaseUrl);
      
      // Initialize secure OAuth with CSRF protection
      const returnTo = searchParams.get('returnTo');
      const secureOAuth = await initiateSecureOAuth(returnTo || undefined);
      
      if (secureOAuth.error) {
        toast({
          title: 'Erro de segurança OAuth',
          description: secureOAuth.error,
          variant: 'destructive',
        });
        return;
      }
      
      // Add signup mode parameter to track if this is a signup attempt
      const isSignupMode = activeTab === 'signup';
      const callbackUrl = new URL(callbackBaseUrl);
      if (isSignupMode) {
        callbackUrl.searchParams.set('signup_mode', 'true');
      }
      
      // Debug: Log the final callback URL
      console.log('Final OAuth callback URL:', callbackUrl.toString());
      
      // Validate OAuth parameters before initiating flow
      const oauthParams = {
        provider: 'google' as const,
        redirectTo: callbackUrl.toString(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          state: secureOAuth.state,
        },
      };
      
      const paramValidation = validateOAuthParameters(oauthParams);
      
      if (!paramValidation.isValid) {
        console.error('OAuth parameter validation failed:', paramValidation.errors);
        toast({
          title: 'Erro de configuração OAuth',
          description: `Parâmetros OAuth inválidos: ${paramValidation.errors.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
      
      if (paramValidation.warnings.length > 0) {
        console.warn('OAuth parameter warnings:', paramValidation.warnings);
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: oauthParams.provider,
        options: {
          redirectTo: oauthParams.redirectTo,
          queryParams: oauthParams.queryParams,
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        let errorMessage = 'Erro ao conectar com Google';
        
        // Enhanced error handling for different OAuth scenarios
        if (error.message.includes('Invalid redirect URL') || error.message.includes('redirect_uri_mismatch')) {
          errorMessage = 'URL de redirecionamento inválida. Verifique a configuração OAuth no Google Console.';
        } else if (error.message.includes('OAuth provider not enabled') || error.message.includes('provider_not_supported')) {
          errorMessage = 'Google OAuth não está habilitado. Contate o suporte técnico.';
        } else if (error.message.includes('invalid_client') || error.message.includes('unauthorized_client')) {
          errorMessage = 'Cliente OAuth inválido. Verifique as credenciais do Google.';
        } else if (error.message.includes('access_denied')) {
          errorMessage = 'Acesso negado pelo Google. Verifique as permissões da aplicação.';
        } else if (error.message.includes('invalid_scope')) {
          errorMessage = 'Escopo OAuth inválido. Contate o suporte técnico.';
        } else if (error.message.includes('server_error')) {
          errorMessage = 'Erro no servidor do Google. Tente novamente em alguns minutos.';
        } else if (error.message.includes('temporarily_unavailable')) {
          errorMessage = 'Serviço do Google temporariamente indisponível. Tente novamente mais tarde.';
        } else if (error.message.includes('rate_limit') || error.message.includes('quota_exceeded')) {
          errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else {
          errorMessage = `Erro OAuth: ${error.message}`;
        }
        
        toast({
          title: 'Erro ao conectar com Google',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Google OAuth error:', error);
      let errorMessage = 'Erro de conexão. Tente novamente.';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Erro de rede. Verifique sua conexão com a internet.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Timeout na conexão. Tente novamente.';
        } else if (error.message.includes('Connection refused') || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else {
          errorMessage = 'Erro de conexão. Tente novamente.';
        }
      }
      
      toast({
        title: 'Erro ao conectar com Google',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setOauthLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      {/* Back to Home Link */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Voltar ao início</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 hover:opacity-90 transition-opacity">
            <Calendar className="w-6 h-6 text-primary-foreground" />
          </Link>
          <CardTitle className="text-2xl font-bold">agend4i</CardTitle>
          <CardDescription>Sua agenda profissional online</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="space-y-4">
                <Button 
                  onClick={handleGoogleAuth} 
                  variant="outline" 
                  className="w-full" 
                  disabled={loading || oauthLoading || !oauthButtonsReady}
                  data-testid="google-oauth-login-button"
                  aria-label="Entrar com Google"
                >
                  {oauthLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {!oauthButtonsReady ? 'Configurando...' : (oauthLoading ? 'Conectando...' : 'Continuar com Google')}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Entrar
                  </Button>
                </form>
              </div>
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="space-y-4">
                <Button 
                  onClick={handleGoogleAuth} 
                  variant="outline" 
                  className="w-full" 
                  disabled={loading || oauthLoading || !oauthButtonsReady}
                  data-testid="google-oauth-signup-button"
                  aria-label="Criar conta com Google"
                >
                  {oauthLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {!oauthButtonsReady ? 'Configurando...' : (oauthLoading ? 'Conectando...' : 'Continuar com Google')}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupForm.fullName}
                      onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                    />
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Criar conta
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
