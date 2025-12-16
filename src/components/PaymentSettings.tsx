import React, { useState, useEffect } from 'react';
import { useFeatureAccess } from '@/lib/featureGating';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Crown, 
  Lock, 
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface PaymentConfig {
  enabled: boolean;
  mp_access_token: string;
  mp_public_key: string;
  webhook_url: string;
  require_payment: boolean;
}

interface PaymentSettingsProps {
  onUpgrade?: () => void;
}

export const PaymentSettings: React.FC<PaymentSettingsProps> = ({ onUpgrade }) => {
  const { currentTenant } = useTenant();
  const { checkFeature, getUpgradeMessage, currentPlan } = useFeatureAccess();
  const [config, setConfig] = useState<PaymentConfig>({
    enabled: false,
    mp_access_token: '',
    mp_public_key: '',
    webhook_url: '',
    require_payment: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasPaymentAccess = checkFeature('paymentProcessing');
  const isFreePlan = currentPlan === 'free';

  useEffect(() => {
    if (currentTenant && hasPaymentAccess) {
      loadPaymentConfig();
    } else {
      setLoading(false);
    }
  }, [currentTenant, hasPaymentAccess]);

  const loadPaymentConfig = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const settings = currentTenant.settings as any;
      const paymentConfig = settings?.payment || {};
      
      setConfig({
        enabled: paymentConfig.enabled || false,
        mp_access_token: paymentConfig.mp_access_token || '',
        mp_public_key: paymentConfig.mp_public_key || '',
        webhook_url: paymentConfig.webhook_url || '',
        require_payment: paymentConfig.require_payment || false,
      });
    } catch (error) {
      console.error('Error loading payment config:', error);
      setError('Failed to load payment configuration');
    } finally {
      setLoading(false);
    }
  };

  const savePaymentConfig = async () => {
    if (!currentTenant || !hasPaymentAccess) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const currentSettings = (currentTenant.settings as any) || {};
      const updatedSettings = {
        ...currentSettings,
        payment: config,
      };

      const { error } = await supabase
        .from('tenants')
        .update({ settings: updatedSettings })
        .eq('id', currentTenant.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving payment config:', error);
      setError('Failed to save payment configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (field: keyof PaymentConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">Loading payment settings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Processing
              {isFreePlan && (
                <Crown className="w-4 h-4 text-amber-500" />
              )}
            </CardTitle>
            <CardDescription>
              Accept payments through Mercado Pago integration
            </CardDescription>
          </div>
          {hasPaymentAccess && (
            <div className="flex items-center gap-2">
              <Label htmlFor="payment-enabled">Enable</Label>
              <Switch
                id="payment-enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!hasPaymentAccess ? (
          <Alert className="border-amber-200 bg-amber-50">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              <div className="space-y-3">
                <p>{getUpgradeMessage('paymentProcessing')}</p>
                <div className="bg-white/50 p-3 rounded border">
                  <h4 className="font-medium mb-2">Pro Plan includes:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Mercado Pago integration</li>
                    <li>• Secure payment processing</li>
                    <li>• Automatic payment confirmations</li>
                    <li>• Payment analytics</li>
                  </ul>
                </div>
                <Button 
                  onClick={onUpgrade}
                  className="w-full"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro Plan
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Payment configuration saved successfully!
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="mp_access_token">Mercado Pago Access Token</Label>
                <Input
                  id="mp_access_token"
                  type="password"
                  value={config.mp_access_token}
                  onChange={(e) => handleConfigChange('mp_access_token', e.target.value)}
                  placeholder="APP_USR-..."
                  disabled={!config.enabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your Mercado Pago access token for processing payments
                </p>
              </div>
              
              <div>
                <Label htmlFor="mp_public_key">Mercado Pago Public Key</Label>
                <Input
                  id="mp_public_key"
                  value={config.mp_public_key}
                  onChange={(e) => handleConfigChange('mp_public_key', e.target.value)}
                  placeholder="APP_USR-..."
                  disabled={!config.enabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your Mercado Pago public key for frontend integration
                </p>
              </div>

              <div>
                <Label htmlFor="webhook_url">Webhook URL</Label>
                <Input
                  id="webhook_url"
                  value={config.webhook_url}
                  onChange={(e) => handleConfigChange('webhook_url', e.target.value)}
                  placeholder="https://your-domain.com/webhooks/mercadopago"
                  disabled={!config.enabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL to receive payment notifications from Mercado Pago
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="require_payment"
                  checked={config.require_payment}
                  onCheckedChange={(checked) => handleConfigChange('require_payment', checked)}
                  disabled={!config.enabled}
                />
                <Label htmlFor="require_payment">Require payment for bookings</Label>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Create a Mercado Pago developer account</li>
                <li>Generate your access token and public key</li>
                <li>Configure webhook notifications</li>
                <li>Test with sandbox credentials first</li>
              </ol>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                asChild
              >
                <a 
                  href="https://developers.mercadopago.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Mercado Pago Docs
                </a>
              </Button>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={savePaymentConfig}
                disabled={saving || !config.enabled}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};