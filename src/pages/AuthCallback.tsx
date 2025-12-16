import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { validateOAuthCallback, cleanupOAuthSecurity, handleDuplicateAccount } from '@/lib/oauth-security';
import { isZeroumAccount } from '@/scripts/create-zeroum-account';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userTenants, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Perform comprehensive OAuth security validation
        const validation = await validateOAuthCallback(searchParams);
        
        if (!validation.isValid) {
          console.error('OAuth callback validation failed:', validation.errors);
          
          // Clean up any security data
          cleanupOAuthSecurity();
          
          let errorMessage = 'Erro na validação de segurança OAuth';
          
          // Handle specific security errors
          if (validation.errors.some(error => error.includes('CSRF'))) {
            errorMessage = 'Possível ataque CSRF detectado. Tente fazer login novamente.';
          } else if (validation.errors.some(error => error.includes('expired'))) {
            errorMessage = 'Sessão OAuth expirada. Tente fazer login novamente.';
          } else if (validation.errors.some(error => error.includes('provider error'))) {
            const providerError = validation.errors.find(error => error.includes('provider error'));
            errorMessage = providerError || errorMessage;
          } else if (validation.errors.length > 0) {
            errorMessage = validation.errors[0];
          }
          
          toast({
            title: 'Erro na autenticação',
            description: errorMessage,
            variant: 'destructive',
          });
          
          navigate('/auth');
          return;
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.warn('OAuth callback warnings:', validation.warnings);
        }

        // Get session data (already validated by validateOAuthCallback)
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !data.session?.user) {
          console.error('Auth callback session error:', sessionError);
          
          // Clean up security data
          cleanupOAuthSecurity();
          
          toast({
            title: 'Erro na autenticação',
            description: 'Não foi possível estabelecer uma sessão segura. Tente novamente.',
            variant: 'destructive',
          });
          
          navigate('/auth?error=callback_error');
          return;
        }

        const currentUser = data.session.user;
        
        // SECURITY CHECK: Prevent OAuth linking to Zeroum account
        if (currentUser.email && isZeroumAccount(currentUser.email)) {
          console.error('SECURITY VIOLATION: OAuth authentication attempted for Zeroum account');
          
          // Force sign out and clean up
          await supabase.auth.signOut();
          cleanupOAuthSecurity();
          
          toast({
            title: 'Método de autenticação não permitido',
            description: 'Esta conta deve usar autenticação tradicional com email e senha.',
            variant: 'destructive',
          });
          
          navigate('/auth');
          return;
        }
        
        setUser(currentUser);
        
        // Extract user profile data from OAuth response
        const identities = currentUser.identities || [];
        const googleIdentity = identities.find(identity => identity.provider === 'google');
        
        // Log successful OAuth authentication with security validation
        console.log('OAuth authentication successful with security validation:', {
          userId: currentUser.id,
          email: currentUser.email,
          provider: googleIdentity?.provider || 'unknown',
          isNewUser: !currentUser.email_confirmed_at,
          securityValidated: true,
          warnings: validation.warnings,
        });

        // Handle duplicate account detection for OAuth sign-up attempts
        const signupMode = searchParams.get('signup_mode') === 'true';
        const duplicateAccountResult = handleDuplicateAccount(currentUser, signupMode);
        
        if (duplicateAccountResult.isDuplicate) {
          // User attempted to sign up with Google but account already exists
          toast({
            title: 'Conta já existe',
            description: duplicateAccountResult.message || 'Esta conta Google já está registrada. Você foi conectado automaticamente.',
          });
        } else {
          // Check if this is a new user or existing account
          const isNewUser = !currentUser.email_confirmed_at;
          
          if (isNewUser) {
            toast({
              title: 'Bem-vindo!',
              description: 'Conta criada com sucesso. Configure seu negócio para começar.',
            });
          } else {
            toast({
              title: 'Login realizado com sucesso!',
              description: 'Redirecionando para o painel...',
            });
          }
        }

        // Wait for tenant data to load before routing
        setProcessing(false);
        
      } catch (error) {
        console.error('Auth callback error:', error);
        
        // Clean up security data on error
        cleanupOAuthSecurity();
        
        let errorMessage = 'Erro inesperado durante a autenticação';
        
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          } else if (error.message.includes('Network')) {
            errorMessage = 'Erro de rede. Tente novamente.';
          }
        }
        
        toast({
          title: 'Erro na autenticação',
          description: errorMessage,
          variant: 'destructive',
        });
        
        navigate('/auth?error=callback_error');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, toast]);

  // Handle routing after user and tenant data are available
  useEffect(() => {
    if (!processing && user && !tenantLoading) {
      // Check if user has any tenant associations
      if (userTenants.length === 0) {
        // New user without tenant - redirect to onboarding
        navigate('/onboarding');
      } else {
        // Existing user with tenant - redirect to dashboard
        navigate('/app');
      }
    }
  }, [processing, user, userTenants, tenantLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {processing ? 'Finalizando autenticação...' : 'Carregando dados do usuário...'}
        </p>
      </div>
    </div>
  );
}