import React from 'react';
import { GlobalNavigation } from '@/components/GlobalNavigation';
import HeroSection from '@/components/HeroSection';
import SocialProofSection from '@/components/SocialProofSection';
import { FeaturesSection } from '@/components/FeaturesSection';
import { BentoGrid, defaultBentoTiles } from '@/components/BentoGrid';
import { PricingSection } from '@/components/PricingSection';
import { FAQSection } from '@/components/FAQSection';
import { Footer } from '@/components/Footer';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Global Navigation */}
      <GlobalNavigation />

      {/* Hero Section with AuroraBackground */}
      <HeroSection
        headline="Sua Agenda Cheia. Zero Esforço."
        subheadline="O AgendAi é a sua secretária virtual 24h"
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

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
