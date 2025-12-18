import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Shield, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppIdentityBannerProps {
  className?: string;
}

export const AppIdentityBanner: React.FC<AppIdentityBannerProps> = ({ className }) => {
  return (
    <div className={cn(
      "bg-glass-surface/50 backdrop-blur-sm border-b border-white/10 py-3",
      className
    )}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          {/* App Identity */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neon-green" />
              <span className="text-text-primary font-medium">
                AgendAi - Plataforma de Agendamento Profissional
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-text-secondary">
              <Globe className="w-4 h-4" />
              <span>agendai.clubemkt.digital</span>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center gap-4 text-text-secondary">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-neon-green" />
              <span>Seguro & Confiável</span>
            </div>
            <Link 
              to="/privacy" 
              className="hover:text-text-primary transition-colors underline decoration-dotted"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};