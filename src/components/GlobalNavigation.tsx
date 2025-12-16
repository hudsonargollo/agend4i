import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Menu, X } from 'lucide-react';
import { NeonButton } from '@/components/ui/neon-button';
import { cn } from '@/lib/utils';

interface GlobalNavigationProps {
  className?: string;
}

export const GlobalNavigation: React.FC<GlobalNavigationProps> = ({ className }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation - Floating Pill Design */}
      <nav className={cn(
        "fixed top-6 left-1/2 transform -translate-x-1/2 z-50",
        "hidden md:block",
        className
      )}>
        <div className="bg-glass-surface backdrop-blur-xl border border-white/10 rounded-full px-6 py-3">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 text-text-primary hover:text-neon-green transition-colors"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-lg font-bold tracking-tight">AgendAi</span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              <Link 
                to="#features" 
                className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
              >
                Recursos
              </Link>
              <Link 
                to="#pricing" 
                className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
              >
                Preços
              </Link>
              <Link 
                to="#faq" 
                className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
              >
                FAQ
              </Link>
            </div>

            {/* CTA Button */}
            <NeonButton 
              variant="primary" 
              size="sm"
              asChild
            >
              <Link to="/auth?mode=signup">
                Começar Grátis
              </Link>
            </NeonButton>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50">
        <div className="bg-glass-surface backdrop-blur-xl border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 text-text-primary"
              onClick={closeMobileMenu}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-lg font-bold tracking-tight">AgendAi</span>
            </Link>

            {/* Hamburger Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-text-primary hover:text-neon-green transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-[73px] bg-glass-surface backdrop-blur-xl z-40">
            <div className="flex flex-col items-center justify-center h-full space-y-8 px-6">
              {/* Navigation Links */}
              <Link 
                to="#features" 
                className="text-2xl font-medium text-text-primary hover:text-neon-green transition-colors"
                onClick={closeMobileMenu}
              >
                Recursos
              </Link>
              <Link 
                to="#pricing" 
                className="text-2xl font-medium text-text-primary hover:text-neon-green transition-colors"
                onClick={closeMobileMenu}
              >
                Preços
              </Link>
              <Link 
                to="#faq" 
                className="text-2xl font-medium text-text-primary hover:text-neon-green transition-colors"
                onClick={closeMobileMenu}
              >
                FAQ
              </Link>

              {/* CTA Button */}
              <div className="pt-8">
                <NeonButton 
                  variant="primary" 
                  size="lg"
                  asChild
                >
                  <Link to="/auth?mode=signup" onClick={closeMobileMenu}>
                    Começar Grátis
                  </Link>
                </NeonButton>
              </div>

              {/* Login Link */}
              <Link 
                to="/auth" 
                className="text-text-secondary hover:text-text-primary transition-colors"
                onClick={closeMobileMenu}
              >
                Já tem conta? Entrar
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};