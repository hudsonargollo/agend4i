import React from 'react';
import { GlobalNavigation } from '@/components/GlobalNavigation';
import HeroSection from '@/components/HeroSection';
import SocialProofSection from '@/components/SocialProofSection';
import { FeaturesSection } from '@/components/FeaturesSection';
import { BentoGrid, defaultBentoTiles } from '@/components/BentoGrid';
import { PricingSection } from '@/components/PricingSection';
import { FAQSection } from '@/components/FAQSection';
import { GoogleOAuthCompliance } from '@/components/GoogleOAuthCompliance';
import { AppIdentityBanner } from '@/components/AppIdentityBanner';
import { LegalNotice } from '@/components/LegalNotice';
import { Footer } from '@/components/Footer';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-dark">
      {/* App Identity Banner */}
      <AppIdentityBanner />
      
      {/* Global Navigation */}
      <GlobalNavigation />

      {/* Hero Section with AuroraBackground */}
      <HeroSection
        headline="AgendAi - Sua Agenda Profissional Online"
        subheadline="Plataforma completa de agendamento que conecta profissionais aos seus clientes. Gerencie horários, receba pagamentos e automatize sua agenda com segurança total."
        ctaText="Começar Grátis"
        ctaHoverText="Criar Minha Agenda ->"
      />

      {/* Social Proof Section with marquee animation */}
      <SocialProofSection />

      {/* Features Section */}
      <FeaturesSection id="features" />

      {/* Bento Grid Section */}
      <BentoGrid tiles={defaultBentoTiles} />

      {/* Pricing Section */}
      <PricingSection id="pricing" />

      {/* FAQ Section */}
      <FAQSection id="faq" />

      {/* Google OAuth Compliance Section */}
      <GoogleOAuthCompliance />

      {/* Legal Notice */}
      <LegalNotice />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
