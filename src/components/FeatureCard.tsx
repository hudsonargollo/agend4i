import * as React from "react"
import { cn } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"

export interface FeatureCardProps {
  title: string
  description: string
  visual: React.ReactNode
  layout?: 'left' | 'right'
  animationDelay?: number
  className?: string
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ title, description, visual, layout = 'left', animationDelay = 0, className, ...props }, ref) => {
    const isLeft = layout === 'left'
    
    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-6xl mx-auto",
          "flex flex-col gap-8",
          // Desktop zig-zag layout
          "lg:flex-row lg:items-center lg:gap-16",
          isLeft ? "lg:flex-row" : "lg:flex-row-reverse",
          className
        )}
        style={{
          animationDelay: `${animationDelay}ms`
        }}
        {...props}
      >
        {/* Content Section */}
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {title}
            </h3>
            <p className="text-lg text-text-secondary leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Visual Section */}
        <div className="flex-1 flex justify-center">
          <GlassCard className="p-6 lg:p-8 w-full max-w-md">
            {visual}
          </GlassCard>
        </div>
      </div>
    )
  }
)

FeatureCard.displayName = "FeatureCard"

export { FeatureCard }