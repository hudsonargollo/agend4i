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
  MessageSquare, 
  Crown, 
  Lock, 
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';

interface WhatsAppConfig {
  enabled: boolean;
  api_url: string;
  api_key: string;
  instance_name: string;
  message_template: string;
}

interface WhatsAppSettingsProps {
  onUpgrade?: () => void;
}

export const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({ onUpgrade }) => {
  const { currentTenant } = useTenant();
  const { checkFeature, getUpgradeMessage, currentPlan } = useFeatureAccess();
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: false,
    api_url: '',
    api_key: '',
    instance_name: '',
    message_template: 'Olá {customer_name}! Seu agendamento para {service_name} foi confirmado para {date} às {time}. Nos vemos em breve! - {business_name}',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasWhatsAppAccess = checkFeature('whatsappNotifications');
  const isFreePlan = currentPlan === 'free';

  useEffect(() => {
    if (currentTenant && hasWhatsAppAccess) {
      loadWhatsAppConfig();
    } else {
      setLoading(false);
    }
  }, [currentTenant, hasWhatsAppAccess]);

  const loadWhatsAppConfig = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const settings = currentTenant.settings as any;
      const whatsappConfig = settings?.whatsapp || {};
      
      setConfig({
        enabled: whatsappConfig.enabled || false,
        api_url: whatsappConfig.api_url || '',
        api_key: whatsappConfig.api_key || '',
        instance_name: whatsappConfig.instance_name || '',
        message_template: whatsappConfig.message_template || config.message_template,
      });
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
      setError('Failed to load WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsAppConfig = async () => {
    if (!currentTenant || !hasWhatsAppAccess) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const currentSettings = (currentTenant.settings as any) || {};
      const updatedSettings = {
        ...currentSettings,
        whatsapp: config,
      };

      const { error } = await supabase
        .from('tenants')
        .update({ settings: updatedSettings })
        .eq('id', currentTenant.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
      setError('Failed to save WhatsApp configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (field: keyof WhatsAppConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            WhatsApp Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">Loading WhatsApp settings...</div>
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
              <MessageSquare className="w-5 h-5" />
              WhatsApp Notifications
              {isFreePlan && (
                <Crown className="w-4 h-4 text-amber-500" />
              )}
            </CardTitle>
            <CardDescription>
              Send automatic booking confirmations via WhatsApp
            </CardDescription>
          </div>
          {hasWhatsAppAccess && (
            <div className="flex items-center gap-2">
              <Label htmlFor="whatsapp-enabled">Enable</Label>
              <Switch
                id="whatsapp-enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!hasWhatsAppAccess ? (
          <Alert className="border-amber-200 bg-amber-50">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              <div className="space-y-3">
                <p>{getUpgradeMessage('whatsappNotifications')}</p>
                <div className="bg-white/50 p-3 rounded border">
                  <h4 className="font-medium mb-2">Pro Plan includes:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Automatic WhatsApp notifications</li>
                    <li>• Custom message templates</li>
                    <li>• Booking confirmations</li>
                    <li>• Reminder messages</li>
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
                  WhatsApp configuration saved successfully!
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="api_url">API URL</Label>
                <Input
                  id="api_url"
                  value={config.api_url}
                  onChange={(e) => handleConfigChange('api_url', e.target.value)}
                  placeholder="https://your-whatsapp-api.com"
                  disabled={!config.enabled}
                />
              </div>
              
              <div>
                <Label htmlFor="instance_name">Instance Name</Label>
                <Input
                  id="instance_name"
                  value={config.instance_name}
                  onChange={(e) => handleConfigChange('instance_name', e.target.value)}
                  placeholder="your-instance"
                  disabled={!config.enabled}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                value={config.api_key}
                onChange={(e) => handleConfigChange('api_key', e.target.value)}
                placeholder="Your WhatsApp API key"
                disabled={!config.enabled}
              />
            </div>

            <div>
              <Label htmlFor="message_template">Message Template</Label>
              <textarea
                id="message_template"
                value={config.message_template}
                onChange={(e) => handleConfigChange('message_template', e.target.value)}
                placeholder="Custom message template"
                disabled={!config.enabled}
                className="w-full px-3 py-2 border border-input rounded-md min-h-[100px] disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available variables: {'{customer_name}'}, {'{service_name}'}, {'{date}'}, {'{time}'}, {'{business_name}'}
              </p>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={saveWhatsAppConfig}
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