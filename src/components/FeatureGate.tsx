import React, { ReactNode } from 'react';
import { useFeatureAccess, PlanFeatures } from '@/lib/featureGating';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap } from 'lucide-react';

interface FeatureGateProps {
  feature: keyof PlanFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  className?: string;
}

interface UpgradePromptProps {
  feature: keyof PlanFeatures;
  onUpgrade?: () => void;
  className?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  className = '',
}) => {
  const { checkFeature, getUpgradeMessage } = useFeatureAccess();
  
  const hasAccess = checkFeature(feature);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showUpgradePrompt) {
    return (
      <div className={`relative ${className}`}>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <UpgradePrompt feature={feature} />
        </div>
      </div>
    );
  }
  
  return null;
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  onUpgrade,
  className = '',
}) => {
  const { getUpgradeMessage, currentPlan } = useFeatureAccess();
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default upgrade action - could navigate to billing page
      console.log('Upgrade clicked for feature:', feature);
    }
  };
  
  return (
    <Card className={`max-w-sm ${className}`}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-lg">Upgrade Required</CardTitle>
        <CardDescription className="text-sm">
          {getUpgradeMessage(feature)}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs">
            Current: {currentPlan.toUpperCase()}
          </Badge>
          <Badge className="text-xs bg-primary">
            <Zap className="w-3 h-3 mr-1" />
            PRO
          </Badge>
        </div>
        <Button onClick={handleUpgrade} className="w-full">
          <Crown className="w-4 h-4 mr-2" />
          Upgrade para Pro
        </Button>
      </CardContent>
    </Card>
  );
};

interface FeatureLockedProps {
  feature: keyof PlanFeatures;
  children: ReactNode;
  className?: string;
}

export const FeatureLocked: React.FC<FeatureLockedProps> = ({
  feature,
  children,
  className = '',
}) => {
  const { checkFeature } = useFeatureAccess();
  
  const hasAccess = checkFeature(feature);
  
  return (
    <div className={`relative ${className}`}>
      <div className={hasAccess ? '' : 'opacity-30 pointer-events-none'}>
        {children}
      </div>
      {!hasAccess && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs">
            <Lock className="w-3 h-3 mr-1" />
            Pro
          </Badge>
        </div>
      )}
    </div>
  );
};

interface PlanBadgeProps {
  plan: 'free' | 'pro' | 'enterprise';
  className?: string;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ plan, className = '' }) => {
  const badgeConfig = {
    free: { label: 'Free', variant: 'secondary' as const, icon: null },
    pro: { label: 'Pro', variant: 'default' as const, icon: Crown },
    enterprise: { label: 'Enterprise', variant: 'default' as const, icon: Zap },
  };
  
  const config = badgeConfig[plan];
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className={className}>
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
};