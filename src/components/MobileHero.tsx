import React from 'react';
import { NeonButton } from '@/components/ui/neon-button';
import { GlassCard } from '@/components/ui/glass-card';
import { ResponsiveImage } from '@/components/ui/responsive-image';

interface MobileHeroProps {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHoverText: string;
}

const MobileHero: React.FC<MobileHeroProps> = ({
  headline,
  subheadline,
  ctaText,
  ctaHoverText
}) => {
  return (
    <section className="flex flex-col items-center justify-center min-h-screen px-4 py-12 text-center">
      {/* Dashboard Image with CSS Perspective Tilt */}
      <div className="mb-8 w-full max-w-sm">
        <GlassCard className="p-4 transform perspective-1000 rotate-x-12 hover:rotate-x-0 transition-transform duration-500">
          <div className="aspect-[4/3] rounded-lg overflow-hidden">
            <ResponsiveImage
              src="/placeholder.svg"
              alt="AgendAi Dashboard Preview"
              priority={true}
              sizes="(max-width: 768px) 320px, 400px"
              className="w-full h-full"
              fallback="/placeholder.svg"
            />
          </div>
        </GlassCard>
      </div>

      {/* Headline */}
      <h1 className="text-4xl md:text-5xl font-bold text-heading text-text-primary mb-4 leading-tight">
        {headline}
      </h1>

      {/* Subheadline */}
      <p className="text-lg text-text-secondary text-body mb-8 max-w-md leading-relaxed">
        {subheadline}
      </p>

      {/* CTA Button */}
      <div className="group">
        <NeonButton 
          variant="primary" 
          size="lg"
          className="text-lg px-8 py-4 transition-all duration-300"
        >
          <span className="group-hover:hidden">{ctaText}</span>
          <span className="hidden group-hover:inline">{ctaHoverText}</span>
        </NeonButton>
      </div>

      {/* Trust Indicators */}
      <div className="mt-8 flex flex-col gap-2 text-sm text-text-secondary">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-neon-green rounded-full"></div>
          <span>Grátis para começar</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-neon-green rounded-full"></div>
          <span>Sem cartão de crédito</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-neon-green rounded-full"></div>
          <span>Configuração em 2 minutos</span>
        </div>
      </div>
    </section>
  );
};

export default MobileHero;