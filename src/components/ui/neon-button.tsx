import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const neonButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 gpu-accelerated",
  {
    variants: {
      variant: {
        primary: "bg-neon-green text-brand-dark hover:bg-neon-green/90 neon-glow hover:neon-glow-lg hover:scale-105 active:scale-95",
        secondary: "border border-neon-green/50 text-neon-green hover:bg-neon-green/10 hover:border-neon-green hover:neon-glow active:scale-95"
      },
      size: {
        sm: "h-8 px-3 text-xs min-h-[44px] min-w-[44px]",
        md: "h-9 px-4 py-2 min-h-[44px] min-w-[44px]",
        lg: "h-10 px-8 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface NeonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof neonButtonVariants> {
  asChild?: boolean
}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(neonButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)

NeonButton.displayName = "NeonButton"

export { NeonButton, neonButtonVariants }