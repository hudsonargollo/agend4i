import * as React from "react"
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

export interface FAQItemProps {
  question: string
  answer: string
  value: string
  className?: string
}

const FAQItem = React.forwardRef<HTMLDivElement, FAQItemProps>(
  ({ question, answer, value, className }, ref) => {
    return (
      <AccordionItem
        ref={ref}
        value={value}
        className={cn(
          "border-b border-white/10 transition-all duration-300",
          "data-[state=open]:glass-effect data-[state=open]:rounded-glass data-[state=open]:border-white/20",
          "data-[state=open]:bg-white/3 data-[state=open]:backdrop-blur-[8px]",
          className
        )}
      >
        <AccordionTrigger className="flex flex-1 items-center justify-between py-6 px-6 font-semibold text-left text-white hover:text-neon-green transition-colors duration-200 [&[data-state=open]>svg]:rotate-180 hover:no-underline">
          <span className="text-lg leading-relaxed">{question}</span>
        </AccordionTrigger>
        <AccordionContent className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="px-6 pb-6 pt-0 text-text-secondary leading-relaxed">
            {answer}
          </div>
        </AccordionContent>
      </AccordionItem>
    )
  }
)

FAQItem.displayName = "FAQItem"

export { FAQItem }