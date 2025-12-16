import * as React from "react"
import { cn } from "@/lib/utils"
import { PricingCard } from "@/components/PricingCard"

export interface PricingSectionProps {
  className?: string
}

const PricingSection = React.forwardRef<HTMLElement, PricingSectionProps>(
  ({ className, ...props }, ref) => {
    const [billingPeriod, setBillingPeriod] = React.useState<'monthly' | 'yearly'>('monthly')
    
    // Pricing data based on AgendAi requirements
    const pricingData = {
      free: {
        title: 'Gratuito',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: [
          'Até 50 agendamentos por mês',
          'Calendário básico',
          'Notificações por WhatsApp',
          'Suporte por email',
          '1 profissional'
        ],
        ctaText: 'Começar Grátis'
      },
      pro: {
        title: 'Profissional',
        monthlyPrice: 29,
        yearlyPrice: 290, // 10 months price for yearly (2 months free)
        originalYearlyPrice: 348, // 12 months at monthly price
        features: [
          'Agendamentos ilimitados',
          'Múltiplos profissionais',
          'Relatórios financeiros',
          'Integração com Pix',
          'Sistema de fidelidade',
          'Proteção contra no-show',
          'Suporte prioritário',
          'Personalização avançada'
        ],
        ctaText: 'Começar Teste Grátis'
      }
    }
    
    const getCurrentPrice = (tier: 'free' | 'pro') => {
      const data = pricingData[tier]
      return billingPeriod === 'monthly' ? data.monthlyPrice : data.yearlyPrice
    }
    
    const getOriginalPrice = (tier: 'free' | 'pro') => {
      const data = pricingData[tier]
      if (billingPeriod === 'yearly' && tier === 'pro' && 'originalYearlyPrice' in data) {
        return data.originalYearlyPrice
      }
      return undefined
    }
    
    return (
      <section 
        ref={ref}
        className={cn(
          'section-padding-mobile md:section-padding-desktop container-padding',
          className
        )}
        {...props}
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-heading text-white mb-4">
              Planos que Crescem com Você
            </h2>
            <p className="text-lg text-text-secondary text-body max-w-2xl mx-auto">
              Comece gratuitamente e evolua conforme sua agenda cresce. 
              Sem compromisso, sem taxas ocultas.
            </p>
          </div>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <div className="glass-effect rounded-full p-1 flex items-center gap-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  'px-6 py-2 rounded-full text-sm font-medium transition-all duration-300',
                  billingPeriod === 'monthly'
                    ? 'bg-neon-green text-brand-dark neon-glow'
                    : 'text-text-secondary hover:text-white'
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn(
                  'px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 relative',
                  billingPeriod === 'yearly'
                    ? 'bg-neon-green text-brand-dark neon-glow'
                    : 'text-text-secondary hover:text-white'
                )}
              >
                Anual
                {/* Discount Badge */}
                <span className="absolute -top-2 -right-2 bg-deep-purple text-white text-xs px-2 py-0.5 rounded-full">
                  -17%
                </span>
              </button>
            </div>
          </div>
          
          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <PricingCard
              tier="free"
              title={pricingData.free.title}
              price={getCurrentPrice('free')}
              period={billingPeriod}
              originalPrice={getOriginalPrice('free')}
              features={pricingData.free.features}
              ctaText={pricingData.free.ctaText}
            />
            
            {/* Pro Tier */}
            <PricingCard
              tier="pro"
              title={pricingData.pro.title}
              price={getCurrentPrice('pro')}
              period={billingPeriod}
              originalPrice={getOriginalPrice('pro')}
              features={pricingData.pro.features}
              ctaText={pricingData.pro.ctaText}
              popular={true}
            />
          </div>
          
          {/* Additional Info */}
          <div className="text-center mt-8">
            <p className="text-sm text-text-secondary">
              Todos os planos incluem 14 dias de teste grátis. 
              Cancele a qualquer momento, sem multas.
            </p>
          </div>
        </div>
      </section>
    )
  }
)

PricingSection.displayName = "PricingSection"

export { PricingSection }