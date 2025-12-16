import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileHero from './MobileHero';
import { DesktopStage } from './DesktopStage';
import { AuroraBackground } from '@/components/ui/aurora-background';

interface HeroSectionProps {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHoverText: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  headline,
  subheadline,
  ctaText,
  ctaHoverText
}) => {
  const isMobile = useIsMobile();

  // Desktop floating cards configuration
  const floatingCards = [
    {
      id: 'whatsapp',
      image: '/placeholder.svg',
      position: { x: -200, y: -150, z: 50 },
      className: 'floating-whatsapp'
    },
    {
      id: 'pix',
      image: '/placeholder.svg', 
      position: { x: 200, y: -100, z: 30 },
      className: 'floating-pix'
    },
    {
      id: 'calendar',
      image: '/placeholder.svg',
      position: { x: 0, y: -200, z: 80 },
      className: 'floating-calendar'
    }
  ];

  return (
    <AuroraBackground 
      intensity="medium" 
      className="relative min-h-screen bg-brand-dark"
    >
      {isMobile ? (
        <MobileHero
          headline={headline}
          subheadline={subheadline}
          ctaText={ctaText}
          ctaHoverText={ctaHoverText}
        />
      ) : (
        <DesktopStage
          dashboardImage="/placeholder.svg"
          floatingCards={floatingCards}
          scrollDistance="200vh"
        />
      )}
    </AuroraBackground>
  );
};

export default HeroSection;