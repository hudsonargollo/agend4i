import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Instagram, Twitter, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className }) => {
  return (
    <footer className={cn(
      "relative bg-brand-dark border-t border-white/10 py-12 overflow-hidden",
      className
    )}>
      {/* Massive AgendAi Watermark - Clipped by bottom edge */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 pointer-events-none">
        <div className="text-[20rem] font-black text-white/[0.02] tracking-tighter leading-none select-none">
          AgendAi
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo and Brand */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-text-primary hover:text-neon-green transition-colors"
            >
              <Calendar className="w-8 h-8" />
              <span className="text-2xl font-bold tracking-tight">AgendAi</span>
            </Link>
            <p className="text-text-secondary text-sm text-center md:text-left max-w-xs">
              A plataforma que conecta profissionais aos seus clientes
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-6 text-sm">
              <Link 
                to="/auth" 
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Entrar
              </Link>
              <Link 
                to="/auth?mode=signup" 
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Criar Conta
              </Link>
              <Link 
                to="/terms" 
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Termos de Uso
              </Link>
              <Link 
                to="/privacy" 
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Política de Privacidade
              </Link>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a 
                href="https://instagram.com/agendai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-text-secondary hover:text-neon-green transition-colors rounded-full hover:bg-white/5"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com/agendai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-text-secondary hover:text-neon-green transition-colors rounded-full hover:bg-white/5"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/company/agendai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-text-secondary hover:text-neon-green transition-colors rounded-full hover:bg-white/5"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-white/10 text-center">
          <p className="text-text-secondary text-sm">
            © {new Date().getFullYear()} AgendAi. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};