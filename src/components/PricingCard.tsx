import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { NeonButton } from "@/components/ui/neon-button"
import { Badge } from "@/components/ui/badge"

export interface PricingCardProps {
  tier: 'free' | 'pro'
  title: string
  price: number
  period: 'monthly' | 'yearly'
  originalPrice?: number
  features: string[]
  ctaText: string
  popular?: boolean
  className?: string
}

const PricingCard = React.forwardRef<HTMLDivElement, PricingCardProps>(
  ({ 
    tier, 
    title, 
    price, 
    period, 
    originalPrice, 
    features, 
    ctaText, 
    popular = false, 
    className,
    ...props 
  }, ref) => {
    const isPro = tier === 'pro'
    
    return (
      <GlassCard
        ref={ref}
        variant={isPro ? 'highlighted' : 'pricing'}
        className={cn(
          'relative p-6 transition-all duration-300 hover:scale-105',
          isPro && 'border-neon-green/50 neon-glow',
          className
        )}
        {...props}
      >
        {/* Popular Badge */}
        {popular && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge 
              className="bg-neon-green text-brand-dark font-semibold px-3 py-1 neon-glow"
            >
              Popular
            </Badge>
          </div>
        )}
        
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-heading text-white mb-2">
            {title}
          </h3>
          
          {/* Price */}
          <div className="flex items-baseline justify-center gap-2 mb-2">
            {originalPrice && originalPrice > price && (
              <span className="text-sm text-text-secondary line-through">
                R$ {originalPrice}
              </span>
            )}
            <span className="text-4xl font-bold text-white">
              R$ {price}
            </span>
            <span className="text-text-secondary">
              /{period === 'monthly' ? 'mês' : 'ano'}
            </span>
          </div>
          
          {/* Discount Badge */}
          {originalPrice && originalPrice > price && (
            <div className="text-xs text-neon-green font-medium">
              Economize {Math.round(((originalPrice - price) / originalPrice) * 100)}%
            </div>
          )}
        </div>
        
        {/* Features */}
        <div className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <Check 
                className={cn(
                  "w-5 h-5 mt-0.5 flex-shrink-0",
                  isPro ? "text-neon-green drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]" : "text-text-secondary"
                )} 
              />
              <span className="text-sm text-white text-body leading-relaxed">
                {feature}
              </span>
            </div>
          ))}
        </div>
        
        {/* CTA Button */}
        <NeonButton
          variant={isPro ? 'primary' : 'secondary'}
          size="lg"
          className="w-full"
        >
          {ctaText}
        </NeonButton>
      </GlassCard>
    )
  }
)

PricingCard.displayName = "PricingCard"

export { PricingCard }