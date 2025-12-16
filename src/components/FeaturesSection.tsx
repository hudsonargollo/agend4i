import * as React from "react"
import { FeatureCard } from "@/components/FeatureCard"
import { MessageCircle, CreditCard, Heart, Bot, Shield, Gift } from "lucide-react"
import { cn } from "@/lib/utils"

const FeaturesSection = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    // AI Scheduling Visual - Chat simulation
    const AISchedulingVisual = () => (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-neon-green" />
          </div>
          <span className="text-sm text-text-secondary">AgendAi Assistant</span>
        </div>
        
        <div className="space-y-3">
          {/* User message */}
          <div className="flex justify-end">
            <div className="bg-neon-green/10 border border-neon-green/30 rounded-lg px-3 py-2 max-w-[80%]">
              <p className="text-sm text-white">Quero agendar um corte para amanhã às 14h</p>
            </div>
          </div>
          
          {/* AI response */}
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 max-w-[80%]">
              <p className="text-sm text-white">Perfeito! Agendei seu corte para amanhã às 14h com João. Confirmação enviada por WhatsApp! 💇‍♂️</p>
            </div>
          </div>
          
          {/* Typing indicator */}
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-neon-green/60 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-neon-green/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-neon-green/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

    // No-Show Protection Visual - Pix payment
    const NoShowProtectionVisual = () => (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-neon-green" />
          </div>
          <span className="text-sm text-text-secondary">Proteção Anti-Falta</span>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white">Corte + Barba</span>
            <span className="text-lg font-bold text-neon-green">R$ 45,00</span>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-neon-green" />
            <span className="text-xs text-text-secondary">Pré-pagamento via Pix</span>
          </div>
          
          <div className="bg-neon-green/10 border border-neon-green/30 rounded p-2">
            <p className="text-xs text-neon-green text-center">✓ Agendamento Garantido</p>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-text-secondary">Reduz faltas em até 90%</p>
        </div>
      </div>
    )

    // Client Loyalty Visual - Smart cart notification
    const ClientLoyaltyVisual = () => (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-neon-green" />
          </div>
          <span className="text-sm text-text-secondary">Fidelidade Inteligente</span>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center">
                <span className="text-xs font-bold text-neon-green">MC</span>
              </div>
              <span className="text-sm text-white">Maria Clara</span>
            </div>
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-neon-green rounded-full"></div>
              ))}
              <div className="w-2 h-2 bg-white/20 rounded-full"></div>
            </div>
          </div>
          
          <div className="bg-neon-green/10 border border-neon-green/30 rounded p-2 mb-2">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-neon-green" />
              <span className="text-xs text-neon-green">Próximo corte GRÁTIS!</span>
            </div>
          </div>
          
          <p className="text-xs text-text-secondary text-center">4/5 visitas completas</p>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-text-secondary">+40% de retenção de clientes</p>
        </div>
      </div>
    )

    return (
      <section
        ref={ref}
        className={cn(
          "section-padding-mobile lg:section-padding-desktop",
          "container-padding",
          className
        )}
        {...props}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16 lg:mb-24">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mb-6">
              Três Recursos que Mudam Tudo
            </h2>
            <p className="text-lg lg:text-xl text-text-secondary max-w-3xl mx-auto">
              Descubra como o AgendAi revoluciona a gestão da sua agenda com inteligência artificial, 
              proteção contra faltas e fidelização automática de clientes.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-24 lg:space-y-32">
            <FeatureCard
              title="Agendamento com IA"
              description="Sua secretária virtual que nunca dorme. O AgendAi entende linguagem natural e agenda automaticamente via WhatsApp, Instagram e site. Seus clientes agendam quando quiserem, você só aparece para atender."
              visual={<AISchedulingVisual />}
              layout="left"
              animationDelay={0}
            />

            <FeatureCard
              title="Proteção Anti-Falta"
              description="Chega de agenda furada! Com pré-pagamento via Pix integrado, seus clientes confirmam o compromisso financeiramente. Redução de até 90% nas faltas e aumento garantido na sua receita."
              visual={<NoShowProtectionVisual />}
              layout="right"
              animationDelay={200}
            />

            <FeatureCard
              title="Fidelidade Inteligente"
              description="Sistema de pontos automático que recompensa seus melhores clientes. A cada visita, eles acumulam pontos para descontos e brindes. Aumento de 40% na retenção sem esforço manual."
              visual={<ClientLoyaltyVisual />}
              layout="left"
              animationDelay={400}
            />
          </div>
        </div>
      </section>
    )
  }
)

FeaturesSection.displayName = "FeaturesSection"

export { FeaturesSection }