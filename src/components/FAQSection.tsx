import * as React from "react"
import { Accordion } from "@/components/ui/accordion"
import { FAQItem } from "@/components/FAQItem"
import { cn } from "@/lib/utils"

export interface FAQData {
  id: string
  question: string
  answer: string
}

export interface FAQSectionProps {
  className?: string
}

const faqData: FAQData[] = [
  {
    id: "credit-cards",
    question: "Preciso de máquina de cartão para usar o AgendAi?",
    answer: "Não! O AgendAi funciona com Pix, que é gratuito e instantâneo. Você pode receber pagamentos diretamente pelo celular, sem precisar de máquina de cartão ou taxas extras. Seus clientes pagam na hora do agendamento e você recebe o dinheiro imediatamente."
  },
  {
    id: "multiple-clinics",
    question: "Posso usar o AgendAi para várias clínicas ou salões?",
    answer: "Sim! O plano Pro permite gerenciar múltiplos estabelecimentos em uma única conta. Você pode ter equipes diferentes, horários específicos e relatórios separados para cada local, tudo centralizado em um só lugar."
  },
  {
    id: "app-requirement",
    question: "Meus clientes precisam baixar um aplicativo?",
    answer: "Não! Seus clientes agendam direto pelo WhatsApp ou por um link que você compartilha. É super simples - eles clicam, escolhem o horário e pronto. Nada de complicação ou downloads extras."
  },
  {
    id: "setup-time",
    question: "Quanto tempo leva para configurar o AgendAi?",
    answer: "Menos de 5 minutos! Você cadastra seus serviços, define os horários de funcionamento e já pode começar a receber agendamentos. Nossa IA aprende com seu negócio e fica cada vez mais inteligente."
  },
  {
    id: "whatsapp-integration",
    question: "Como funciona a integração com WhatsApp?",
    answer: "O AgendAi se conecta ao seu WhatsApp Business e responde automaticamente seus clientes 24h por dia. Ele agenda, confirma, lembra dos horários e até processa pagamentos - tudo sem você precisar ficar no celular o tempo todo."
  },
  {
    id: "pricing-plans",
    question: "Posso testar antes de pagar?",
    answer: "Claro! O plano gratuito permite até 50 agendamentos por mês, perfeito para testar todas as funcionalidades. Quando seu negócio crescer, você pode migrar para o Pro e ter agendamentos ilimitados."
  }
]

const FAQSection = React.forwardRef<HTMLElement, FAQSectionProps>(
  ({ className }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          "py-16 md:py-24 px-4",
          "bg-gradient-to-b from-transparent to-brand-dark/20",
          className
        )}
      >
        <div className="container mx-auto max-w-4xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Perguntas Frequentes
            </h2>
            <p className="text-text-secondary text-lg leading-relaxed max-w-2xl mx-auto">
              Tire suas dúvidas sobre o AgendAi e descubra como nossa plataforma pode transformar seu negócio
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion 
            type="single" 
            collapsible 
            className="space-y-4"
          >
            {faqData.map((faq) => (
              <FAQItem
                key={faq.id}
                value={faq.id}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </Accordion>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <p className="text-text-secondary mb-6">
              Ainda tem dúvidas? Nossa equipe está aqui para ajudar!
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-200 hover:scale-105"
            >
              Falar com Suporte
            </a>
          </div>
        </div>
      </section>
    )
  }
)

FAQSection.displayName = "FAQSection"

export { FAQSection }