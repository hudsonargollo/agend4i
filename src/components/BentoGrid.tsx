import * as React from "react"
import { cn } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Users, BarChart3, Smartphone, Calendar, MessageCircle, CreditCard } from "lucide-react"

export interface BentoTile {
  id: string
  title: string
  content: React.ReactNode
  size: 'small' | 'medium' | 'large'
  glowColor?: string
}

export interface BentoGridProps {
  tiles: BentoTile[]
  className?: string
}

const BentoGrid = React.forwardRef<HTMLDivElement, BentoGridProps>(
  ({ tiles, className, ...props }, ref) => {
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
    const gridRef = React.useRef<HTMLDivElement>(null)

    // Handle mouse movement for glow effect on desktop
    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (gridRef.current) {
          const rect = gridRef.current.getBoundingClientRect()
          setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          })
        }
      }

      const grid = gridRef.current
      if (grid && window.innerWidth >= 768) {
        grid.addEventListener('mousemove', handleMouseMove)
        return () => grid.removeEventListener('mousemove', handleMouseMove)
      }
    }, [])

    const getSizeClasses = (size: BentoTile['size']) => {
      switch (size) {
        case 'small':
          return 'col-span-1 row-span-1'
        case 'medium':
          return 'col-span-2 row-span-1 md:col-span-1 md:row-span-2'
        case 'large':
          return 'col-span-2 row-span-2'
        default:
          return 'col-span-1 row-span-1'
      }
    }

    return (
      <section className="section-padding-mobile md:section-padding-desktop">
        <div className="container mx-auto container-padding">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-heading text-text-primary mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Descubra todas as funcionalidades que fazem do AgendAi a escolha perfeita para profissionais modernos
            </p>
          </div>
          
          <div
            ref={gridRef}
            className={cn(
              "grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[180px] relative",
              className
            )}
            {...props}
          >
            {tiles.map((tile) => (
              <BentoTile
                key={tile.id}
                tile={tile}
                mousePosition={mousePosition}
                className={getSizeClasses(tile.size)}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }
)

interface BentoTileProps {
  tile: BentoTile
  mousePosition: { x: number; y: number }
  className?: string
}

const BentoTile: React.FC<BentoTileProps> = ({ tile, mousePosition, className }) => {
  const tileRef = React.useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)

  // Calculate glow position relative to tile
  const getGlowStyle = () => {
    if (!tileRef.current || !isHovered || window.innerWidth < 768) {
      return {}
    }

    const rect = tileRef.current.getBoundingClientRect()
    const parentRect = tileRef.current.offsetParent?.getBoundingClientRect()
    
    if (!parentRect) return {}

    const relativeX = mousePosition.x - (rect.left - parentRect.left)
    const relativeY = mousePosition.y - (rect.top - parentRect.top)

    return {
      background: `radial-gradient(circle at ${relativeX}px ${relativeY}px, ${tile.glowColor || 'rgba(0, 255, 136, 0.15)'} 0%, transparent 50%)`,
    }
  }

  return (
    <div
      ref={tileRef}
      className={cn("relative group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow overlay */}
      <div
        className="absolute inset-0 rounded-glass opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"
        style={getGlowStyle()}
      />
      
      {/* Tile content */}
      <GlassCard className="h-full p-4 md:p-6 flex flex-col justify-between relative z-20 group-hover:border-neon-green/30 transition-all duration-300">
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-lg md:text-xl font-semibold text-text-primary mb-2 text-heading">
            {tile.title}
          </h3>
          <div className="text-text-secondary">
            {tile.content}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

// Default tiles for AgendAi capabilities
export const defaultBentoTiles: BentoTile[] = [
  {
    id: 'multi-professional',
    title: 'Múltiplos Profissionais',
    size: 'medium',
    glowColor: 'rgba(0, 255, 136, 0.15)',
    content: (
      <div className="flex flex-col items-center text-center">
        <Users className="w-8 h-8 md:w-12 md:h-12 text-neon-green mb-3 drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]" />
        <p className="text-sm md:text-base">
          Gerencie toda sua equipe em uma única plataforma
        </p>
      </div>
    )
  },
  {
    id: 'financial-reports',
    title: 'Relatórios Financeiros',
    size: 'large',
    glowColor: 'rgba(124, 58, 237, 0.15)',
    content: (
      <div className="flex flex-col items-center text-center">
        <BarChart3 className="w-10 h-10 md:w-16 md:h-16 text-deep-purple mb-4 drop-shadow-[0_0_8px_rgba(124,58,237,0.4)]" />
        <p className="text-sm md:text-base mb-2">
          Acompanhe seu faturamento em tempo real
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs md:text-sm opacity-80">
          <div>• Receita mensal</div>
          <div>• Comissões</div>
          <div>• Produtos vendidos</div>
          <div>• Análise de crescimento</div>
        </div>
      </div>
    )
  },
  {
    id: 'mobile-app',
    title: 'App Mobile',
    size: 'small',
    glowColor: 'rgba(0, 255, 136, 0.15)',
    content: (
      <div className="flex flex-col items-center text-center">
        <Smartphone className="w-6 h-6 md:w-8 md:h-8 text-neon-green mb-2 drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]" />
        <p className="text-xs md:text-sm">
          Acesse de qualquer lugar
        </p>
      </div>
    )
  },
  {
    id: 'smart-calendar',
    title: 'Agenda Inteligente',
    size: 'small',
    glowColor: 'rgba(0, 255, 136, 0.15)',
    content: (
      <div className="flex flex-col items-center text-center">
        <Calendar className="w-6 h-6 md:w-8 md:h-8 text-neon-green mb-2 drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]" />
        <p className="text-xs md:text-sm">
          IA otimiza seus horários
        </p>
      </div>
    )
  },
  {
    id: 'whatsapp-integration',
    title: 'WhatsApp Integrado',
    size: 'medium',
    glowColor: 'rgba(0, 255, 136, 0.15)',
    content: (
      <div className="flex flex-col items-center text-center">
        <MessageCircle className="w-8 h-8 md:w-12 md:h-12 text-neon-green mb-3 drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]" />
        <p className="text-sm md:text-base mb-2">
          Confirmações automáticas via WhatsApp
        </p>
        <div className="text-xs md:text-sm opacity-80">
          • Lembretes de consulta
          <br />
          • Confirmação de agendamento
        </div>
      </div>
    )
  },
  {
    id: 'payment-integration',
    title: 'Pagamentos Pix',
    size: 'small',
    glowColor: 'rgba(124, 58, 237, 0.15)',
    content: (
      <div className="flex flex-col items-center text-center">
        <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-deep-purple mb-2 drop-shadow-[0_0_8px_rgba(124,58,237,0.4)]" />
        <p className="text-xs md:text-sm">
          Receba na hora
        </p>
      </div>
    )
  }
]

BentoGrid.displayName = "BentoGrid"

export { BentoGrid }