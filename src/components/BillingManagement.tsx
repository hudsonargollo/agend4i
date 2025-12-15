import React, { useState } from 'react';
import { useFeatureAccess, PLAN_FEATURES, SubscriptionPlan } from '@/lib/featureGating';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  Zap, 
  Check, 
  X, 
  CreditCard, 
  Calendar,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PlanComparisonProps {
  onUpgrade: (plan: SubscriptionPlan) => void;
  currentPlan: SubscriptionPlan;
  loading?: boolean;
}

const PlanComparison: React.FC<PlanComparisonProps> = ({ 
  onUpgrade, 
  currentPlan, 
  loading = false 
}) => {
  const plans = [
    {
      id: 'free' as SubscriptionPlan,
      name: 'Free',
      price: 'R$ 0',
      period: '/mês',
      description: 'Perfect for getting started',
      icon: null,
      popular: false,
      features: PLAN_FEATURES.free,
    },
    {
      id: 'pro' as SubscriptionPlan,
      name: 'Pro',
      price: 'R$ 49',
      period: '/mês',
      description: 'Best for growing businesses',
      icon: Crown,
      popular: true,
      features: PLAN_FEATURES.pro,
    },
    {
      id: 'enterprise' as SubscriptionPlan,
      name: 'Enterprise',
      price: 'R$ 149',
      period: '/mês',
      description: 'For large organizations',
      icon: Zap,
      popular: false,
      features: PLAN_FEATURES.enterprise,
    },
  ];

  const featureLabels = {
    whatsappNotifications: 'WhatsApp Notifications',
    paymentProcessing: 'Payment Processing',
    advancedAnalytics: 'Advanced Analytics',
    customBranding: 'Custom Branding',
    multipleStaff: 'Multiple Staff Members',
    apiAccess: 'API Access',
    prioritySupport: 'Priority Support',
    maxBookingsPerMonth: 'Monthly Bookings',
    maxStaffMembers: 'Staff Members',
  };

  const formatFeatureValue = (key: keyof typeof PLAN_FEATURES.free, value: any) => {
    if (typeof value === 'boolean') {
      return value ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-gray-400" />;
    }
    if (key === 'maxBookingsPerMonth' || key === 'maxStaffMembers') {
      return value === -1 ? 'Unlimited' : value.toString();
    }
    return value.toString();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Upgrade to unlock powerful features for your business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const canUpgrade = plan.id !== 'free' && currentPlan !== plan.id;

          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${isCurrent ? 'bg-secondary/50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {Icon && <Icon className="w-5 h-5" />}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {Object.entries(featureLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span>{label}</span>
                      <span className="flex items-center">
                        {formatFeatureValue(key as keyof typeof PLAN_FEATURES.free, plan.features[key as keyof typeof PLAN_FEATURES.free])}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <Button
                  onClick={() => onUpgrade(plan.id)}
                  disabled={!canUpgrade || loading}
                  variant={plan.popular ? 'default' : 'outline'}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : isCurrent ? (
                    'Plano Atual'
                  ) : plan.id === 'free' ? (
                    'Fazer Downgrade'
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade para {plan.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

interface BillingStatusProps {
  tenant: any;
}

const BillingStatus: React.FC<BillingStatusProps> = ({ tenant }) => {
  const { subscriptionStatus, currentPlan } = useFeatureAccess();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'past_due': return 'text-yellow-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'past_due': return 'Past Due';
      case 'cancelled': return 'Cancelled';
      case 'inactive': return 'Inactive';
      default: return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Billing Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Plan</span>
          <Badge variant="outline" className="capitalize">
            {currentPlan}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <span className={`text-sm font-medium capitalize ${getStatusColor(subscriptionStatus)}`}>
            {getStatusLabel(subscriptionStatus)}
          </span>
        </div>

        {tenant.mp_subscription_id && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Subscription ID</span>
            <span className="text-sm text-muted-foreground font-mono">
              {tenant.mp_subscription_id.slice(-8)}
            </span>
          </div>
        )}

        {subscriptionStatus === 'past_due' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your subscription payment is overdue. Please update your payment method to continue using Pro features.
            </AlertDescription>
          </Alert>
        )}

        {subscriptionStatus === 'cancelled' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your subscription has been cancelled. You can reactivate it at any time to restore Pro features.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export const BillingManagement: React.FC = () => {
  const { currentTenant } = useTenant();
  const { currentPlan } = useFeatureAccess();
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const handleUpgrade = async (plan: SubscriptionPlan, isRetry: boolean = false) => {
    if (!currentTenant || plan === 'free') return;
    
    setLoading(true);
    if (!isRetry) {
      setError(null);
      setRetryAttempt(0);
    }

    try {
      // Get user email for payment
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Email do usuário não encontrado');
      }

      // Call the Mercado Pago checkout function with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/mp-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
        body: JSON.stringify({
          tenant_id: currentTenant.id,
          plan: plan,
          payer_email: user.email,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.init_point) {
          // Redirect to Mercado Pago checkout
          window.open(data.init_point, '_blank');
          setError(null);
        } else {
          throw new Error(data.error || 'Falha ao criar sessão de checkout');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle different error types
        if (response.status === 503) {
          throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns minutos.');
        } else if (response.status === 429) {
          throw new Error('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
        } else if (response.status >= 500) {
          throw new Error('Erro interno do servidor. Tente novamente em alguns instantes.');
        } else {
          throw new Error(errorData.error || `Erro ${response.status}: Falha na comunicação com o servidor`);
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      
      let errorMessage = 'Erro inesperado ao processar pagamento';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout na conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setRetryAttempt(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const retryUpgrade = (plan: SubscriptionPlan) => {
    handleUpgrade(plan, true);
  };

  if (!currentTenant) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tenant selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing preferences
        </p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <div className="space-y-2">
              <p>{error}</p>
              {retryAttempt < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Retry the last attempted plan upgrade
                    const lastPlan = currentPlan === 'free' ? 'pro' : 'enterprise';
                    retryUpgrade(lastPlan);
                  }}
                  disabled={loading}
                  className="mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Tentando novamente...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Tentar novamente
                    </>
                  )}
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <BillingStatus tenant={currentTenant} />
        </div>
        
        <div className="lg:col-span-2">
          <PlanComparison
            onUpgrade={handleUpgrade}
            currentPlan={currentPlan}
            loading={loading}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Manage Subscription
          </CardTitle>
          <CardDescription>
            Access your Mercado Pago account to manage payment methods and view invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a 
              href="https://www.mercadopago.com.br/subscriptions" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Mercado Pago
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};