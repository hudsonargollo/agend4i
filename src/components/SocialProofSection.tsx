import React from 'react';

interface CompanyLogo {
  name: string;
  logo: string;
  alt: string;
}

interface SocialProofSectionProps {
  statement?: string;
  logos?: CompanyLogo[];
}

const defaultLogos: CompanyLogo[] = [
  { name: 'Barbearia Silva', logo: '/placeholder.svg', alt: 'Barbearia Silva' },
  { name: 'Salão Beleza', logo: '/placeholder.svg', alt: 'Salão Beleza' },
  { name: 'Studio Hair', logo: '/placeholder.svg', alt: 'Studio Hair' },
  { name: 'Clínica Estética', logo: '/placeholder.svg', alt: 'Clínica Estética' },
  { name: 'Spa Wellness', logo: '/placeholder.svg', alt: 'Spa Wellness' },
  { name: 'Nail Art Studio', logo: '/placeholder.svg', alt: 'Nail Art Studio' },
  { name: 'Beauty Center', logo: '/placeholder.svg', alt: 'Beauty Center' },
  { name: 'Hair Design', logo: '/placeholder.svg', alt: 'Hair Design' },
];

const SocialProofSection: React.FC<SocialProofSectionProps> = ({
  statement = "Simplificando a vida de +500 profissionais",
  logos = defaultLogos
}) => {
  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...logos, ...logos];

  return (
    <section className="py-16 bg-brand-dark overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Statement */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
            {statement}
          </h2>
          <div className="w-24 h-1 bg-neon-green mx-auto rounded-full"></div>
        </div>

        {/* Logo Marquee */}
        <div className="relative">
          {/* Gradient overlays for fade effect */}
          <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-brand-dark to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-brand-dark to-transparent z-10 pointer-events-none"></div>
          
          {/* Scrolling container */}
          <div className="marquee-container">
            <div className="marquee-content">
              {duplicatedLogos.map((logo, index) => (
                <div
                  key={`${logo.name}-${index}`}
                  className="marquee-item group"
                >
                  <div className="logo-wrapper">
                    <img
                      src={logo.logo}
                      alt={logo.alt}
                      className="logo-image"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;