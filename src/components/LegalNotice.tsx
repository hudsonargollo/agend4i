import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LegalNoticeProps {
  className?: string;
}

export const LegalNotice: React.FC<LegalNoticeProps> = ({ className }) => {
  return (
    <section className={cn(
      "relative bg-brand-dark/50 border-t border-white/5 py-8",
      className
    )}>
      <div className="container mx-auto px-6">
        <div className="text-center">
          <p className="text-text-secondary text-sm mb-4">
            Ao usar o AgendAi, você concorda com nossos termos e políticas
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
            <Link 
              to="/auth" 
              className="text-text-secondary hover:text-neon-green transition-colors underline decoration-dotted underline-offset-4"
            >
              Entrar
            </Link>
            <span className="text-white/20">•</span>
            <Link 
              to="/auth?mode=signup" 
              className="text-text-secondary hover:text-neon-green transition-colors underline decoration-dotted underline-offset-4"
            >
              Criar Conta
            </Link>
            <span className="text-white/20">•</span>
            <Link 
              to="/terms" 
              className="text-text-secondary hover:text-neon-green transition-colors underline decoration-dotted underline-offset-4"
            >
              Termos de Uso
            </Link>
            <span className="text-white/20">•</span>
            <Link 
              to="/privacy" 
              className="text-text-secondary hover:text-neon-green transition-colors underline decoration-dotted underline-offset-4"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};