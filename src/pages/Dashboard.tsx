import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useFeatureAccess } from '@/lib/featureGating';
import { generateTenantURL, getCurrentDomain } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FeatureGate, FeatureLocked, PlanBadge } from '@/components/FeatureGate';
import { BillingManagement } from '@/components/BillingManagement';
import { 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  LogOut, 
  ExternalLink,
  BarChart3,
  Clock,
  DollarSign,
  Crown,
  MessageSquare,
  CreditCard
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentTenant, userTenants, loading: tenantLoading } = useTenant();
  const { checkFeature, currentPlan, subscriptionStatus } = useFeatureAccess();
  const [showBilling, setShowBilling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !tenantLoading && user && userTenants.length === 0) {
      navigate('/onboarding');
    }
  }, [user, authLoading, tenantLoading, userTenants, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || tenantLoading || !currentTenant) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const publicUrl = generateTenantURL(currentTenant.slug);
  const currentDomain = getCurrentDomain();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-foreground">{currentTenant.name}</h1>
              <PlanBadge plan={currentPlan} />
            </div>
            <a 
              href={publicUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              {currentDomain}/{currentTenant.slug}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showBilling} onOpenChange={setShowBilling}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Billing
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Billing Management</DialogTitle>
                </DialogHeader>
                <BillingManagement />
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Agendamentos Hoje
              </CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Nenhum agendamento ainda</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Total de clientes</p>
            </CardContent>
          </Card>
          
          <FeatureLocked feature="advancedAnalytics">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Faturamento
                </CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 0</div>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </CardContent>
            </Card>
          </FeatureLocked>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate('/dashboard/schedule')}>
              <CardContent className="pt-6 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Agenda</p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate('/dashboard/services')}>
              <CardContent className="pt-6 text-center">
                <Scissors className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Serviços</p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate('/dashboard/customers')}>
              <CardContent className="pt-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Clientes</p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate('/dashboard/settings')}>
              <CardContent className="pt-6 text-center">
                <Settings className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Configurações</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pro Features Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recursos Pro</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureGate feature="whatsappNotifications">
              <Card className="cursor-pointer hover:bg-secondary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <MessageSquare className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold">WhatsApp Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatic booking confirmations via WhatsApp
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Configure WhatsApp
                  </Button>
                </CardContent>
              </Card>
            </FeatureGate>

            <FeatureGate feature="paymentProcessing">
              <Card className="cursor-pointer hover:bg-secondary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">Payment Processing</h3>
                      <p className="text-sm text-muted-foreground">
                        Accept payments through Mercado Pago
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Setup Payments
                  </Button>
                </CardContent>
              </Card>
            </FeatureGate>
          </div>
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Agenda de Hoje
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum agendamento para hoje</p>
              <p className="text-sm">Compartilhe seu link para começar a receber clientes</p>
              <Button variant="outline" className="mt-4" onClick={() => navigator.clipboard.writeText(publicUrl)}>
                Copiar link
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
