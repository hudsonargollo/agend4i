import * as React from "react"
import { cn } from "@/lib/utils"

export interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: 'low' | 'medium' | 'high'
  colors?: string[]
  children?: React.ReactNode
}

const AuroraBackground = React.forwardRef<HTMLDivElement, AuroraBackgroundProps>(
  ({ className, intensity = 'medium', colors, children, ...props }, ref) => {
    const defaultColors = [
      '#00ff88', // neon-green
      '#7c3aed', // deep-purple
      '#06b6d4', // cyan
      '#8b5cf6', // violet
    ]

    const auroraColors = colors || defaultColors
    
    const intensityConfig = {
      low: {
        opacity: 'opacity-20',
        blur: 'blur-3xl',
        scale: 'scale-150',
        duration: 'duration-[40s]'
      },
      medium: {
        opacity: 'opacity-30',
        blur: 'blur-2xl',
        scale: 'scale-125',
        duration: 'duration-[30s]'
      },
      high: {
        opacity: 'opacity-40',
        blur: 'blur-xl',
        scale: 'scale-110',
        duration: 'duration-[20s]'
      }
    }

    const config = intensityConfig[intensity]

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          className
        )}
        {...props}
      >
        {/* Aurora gradient layers */}
        <div className="absolute inset-0 gpu-accelerated">
          {auroraColors.map((color, index) => (
            <div
              key={index}
              className={cn(
                "absolute rounded-full mix-blend-screen filter",
                config.opacity,
                config.blur,
                config.scale,
                index % 2 === 0 ? "animate-aurora" : "animate-aurora-slow",
                config.duration
              )}
              style={{
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                width: '40%',
                height: '40%',
                left: `${(index * 25) % 80}%`,
                top: `${(index * 30) % 70}%`,
                animationDelay: `${index * 2}s`,
              }}
            />
          ))}
        </div>
        
        {/* Content overlay */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    )
  }
)

AuroraBackground.displayName = "AuroraBackground"

export { AuroraBackground }