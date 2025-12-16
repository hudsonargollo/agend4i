# Design Document

## Overview

The AgendAi Marketing Experience represents a complete transformation of the landing page from a generic SaaS template to a premium, high-performance brand experience. The design implements a mobile-first strategy with "AgendAi Neon" design system, featuring glassmorphism aesthetics and desktop scrollytelling capabilities.

The system prioritizes performance (95+ Lighthouse score on mobile) while delivering an immersive narrative experience on desktop through scroll-driven animations. The design positions AgendAi as a premium solution for beauty and service professionals through sophisticated visual design and clear value proposition communication.

## Architecture

### Component Hierarchy

```
LandingPage
├── GlobalNavigation
├── HeroSection
│   ├── AuroraBackground (CSS-only)
│   ├── MobileHero (< 768px)
│   └── DesktopStage (>= 768px, lazy-loaded)
│       ├── PinnedContainer
│       ├── DashboardBase
│       └── FloatingLayers
│           ├── WhatsAppCard
│           ├── PixCard
│           └── CalendarOverlay
├── SocialProofSection
├── FeaturesSection
│   ├── FeatureCard (AI Scheduling)
│   ├── FeatureCard (No-Show Protection)
│   └── FeatureCard (Client Loyalty)
├── BentoGrid
├── PricingSection
├── FAQSection
└── Footer
```

### Responsive Strategy

The architecture implements a dual-rendering approach:

- **Mobile (< 768px)**: Lightweight, vertical-stack layout with CSS-only animations
- **Desktop (>= 768px)**: Enhanced experience with GSAP-powered scrollytelling

### Performance Architecture

- **Code Splitting**: GSAP and desktop components loaded only when needed
- **Asset Optimization**: WebP images with responsive sizing
- **Lazy Loading**: Below-fold content loaded on demand
- **GPU Acceleration**: CSS transforms and animations use `will-change` properties

## Components and Interfaces

### Design System Components

#### GlassCard Component
```typescript
interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'highlighted' | 'pricing';
  className?: string;
}
```

**Styling**: Implements glassmorphism with `bg-white/5`, `backdrop-blur-xl`, and gradient borders.

#### NeonButton Component
```typescript
interface NeonButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  href?: string;
}
```

**Styling**: Neon green glow effects with hover animations and accessibility-compliant focus states.

#### AuroraBackground Component
```typescript
interface AuroraBackgroundProps {
  intensity?: 'low' | 'medium' | 'high';
  colors?: string[];
}
```

**Implementation**: CSS-only radial gradients with keyframe animations for performance.

### Layout Components

#### HeroSection Component
```typescript
interface HeroSectionProps {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHoverText: string;
}
```

**Conditional Rendering**: Uses `useMediaQuery` to render appropriate experience based on screen size.

#### DesktopStage Component
```typescript
interface DesktopStageProps {
  dashboardImage: string;
  floatingCards: FloatingCard[];
  scrollDistance: number;
}

interface FloatingCard {
  id: string;
  image: string;
  position: { x: number; y: number; z: number };
  animation: AnimationConfig;
}
```

**GSAP Integration**: Implements ScrollTrigger for pinned animations and 3D transforms.

### Feature Components

#### FeatureCard Component
```typescript
interface FeatureCardProps {
  title: string;
  description: string;
  visual: React.ReactNode;
  layout?: 'left' | 'right';
  animationDelay?: number;
}
```

#### BentoGrid Component
```typescript
interface BentoGridProps {
  tiles: BentoTile[];
}

interface BentoTile {
  id: string;
  title: string;
  content: React.ReactNode;
  size: 'small' | 'medium' | 'large';
  glowColor?: string;
}
```

**Mouse Interaction**: Implements cursor-following glow border effect on desktop.

## Data Models

### Design Tokens
```typescript
interface DesignTokens {
  colors: {
    brandDark: '#02040a';
    neonGreen: '#00ff88';
    deepPurple: '#7c3aed';
    glassSurface: 'rgba(255, 255, 255, 0.05)';
    textPrimary: '#ffffff';
    textSecondary: '#94a3b8';
  };
  typography: {
    fontFamily: 'Inter, sans-serif';
    headingWeight: 700;
    bodyWeight: 400;
    baseSizeMobile: '16px';
    baseSizeDesktop: '18px';
  };
  spacing: {
    sectionPaddingMobile: '3rem 0';
    sectionPaddingDesktop: '6rem 0';
    containerPadding: '1rem';
  };
  effects: {
    neonGlow: '0 0 10px rgba(0, 255, 136, 0.5)';
    glassBlur: '12px';
    borderRadius: '12px';
  };
}
```

### Animation Configuration
```typescript
interface ScrollAnimation {
  trigger: string;
  start: string;
  end: string;
  scrub: boolean;
  pin?: boolean;
  timeline: AnimationStep[];
}

interface AnimationStep {
  target: string;
  properties: Record<string, any>;
  duration: number;
  ease: string;
}
```

### Content Model
```typescript
interface LandingPageContent {
  hero: {
    headline: string;
    subheadline: string;
    ctaPrimary: string;
    ctaHover: string;
  };
  socialProof: {
    statement: string;
    logos: CompanyLogo[];
  };
  features: Feature[];
  pricing: PricingTier[];
  faq: FAQItem[];
}

interface Feature {
  id: string;
  title: string;
  description: string;
  visual: string;
  benefits: string[];
}

interface PricingTier {
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: string[];
  highlighted: boolean;
  ctaText: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Performance Compliance Across Devices
*For any* device type, the landing page should achieve a Lighthouse Performance score of 95+ on mobile and maintain Core Web Vitals within acceptable ranges (LCP < 2.5s, FID < 100ms, CLS < 0.1).
**Validates: Requirements 1.1, 7.5**

### Property 2: Mobile Layout Consistency
*For any* device with screen width < 768px, content should render in vertical flex stack layout without horizontal scrolling and use minimum 16px base font size.
**Validates: Requirements 1.2, 6.4, 6.5**

### Property 3: Asset Optimization Compliance
*For any* image asset, the system should serve WebP format at appropriate dimensions for the requesting device and lazy load content below the fold.
**Validates: Requirements 1.3, 7.1, 1.4**

### Property 4: Design System Compliance
*For any* UI component, colors should match the defined semantic palette (brand-dark: #02040a, neon-green: #00ff88, glass-surface: rgba(255,255,255,0.05)) and meet WCAG AA contrast ratios.
**Validates: Requirements 2.1, 2.5**

### Property 5: Typography Consistency
*For any* text element, the system should use Inter font family with bold tracking-tight for headings, relaxed for body text, and appropriate sizing for device type.
**Validates: Requirements 2.4, 6.5**

### Property 6: Glassmorphism Implementation
*For any* glassmorphism component, the element should combine backdrop-filter, bg-opacity, and border-gradient properties correctly.
**Validates: Requirements 2.2**

### Property 7: Icon System Compliance
*For any* icon element, the system should use Lucide React icons styled with neon glow drop-shadow effects.
**Validates: Requirements 2.3**

### Property 8: Responsive Component Isolation
*For any* screen size transition, the DesktopStage component should never mount on devices < 768px, and MobileHero should never mount on devices >= 768px.
**Validates: Requirements 3.1**

### Property 9: Desktop Scroll Animation Behavior
*For any* desktop device >= 768px, the hero section should implement pinned scrolling for 200vh distance with dashboard transitioning from 2D to 3D exploded view.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 10: Scroll Animation Reversibility
*For any* scroll position within the desktop hero section, animations should be scrubbable and reversible, maintaining consistent visual state when scrolling up or down to the same position.
**Validates: Requirements 3.4**

### Property 11: Accessibility Motion Compliance
*For any* user with prefers-reduced-motion enabled, all scroll-jacking, 3D effects, and auto-playing animations should be disabled while maintaining full content accessibility.
**Validates: Requirements 3.5**

### Property 12: Touch Target Accessibility
*For any* interactive element, touch targets should have minimum 44px height with active state feedback and focus-visible rings styled with neon green.
**Validates: Requirements 1.5, 6.3**

### Property 13: Marquee Animation Performance
*For any* logo marquee display, the system should implement infinite horizontal scroll with GPU acceleration and proper performance optimization.
**Validates: Requirements 4.2**

### Property 14: Feature Layout Responsiveness
*For any* feature display, mobile devices should use vertical card stack layout while desktop should use alternating zig-zag layout with scroll trigger reveals.
**Validates: Requirements 4.4, 4.5**

### Property 15: FAQ Accordion Behavior
*For any* FAQ interaction, only one accordion item should be open at a time with faint glass background effect when opened.
**Validates: Requirements 5.4, 5.5**

### Property 16: Semantic HTML Structure
*For any* page section, content should use semantic HTML tags (header, main, section, article) and follow strict H1, H2, H3 heading hierarchy.
**Validates: Requirements 6.1, 6.2**

### Property 17: Code Splitting Optimization
*For any* heavy library loading, GSAP should be dynamically imported only when DesktopStage component mounts to optimize performance.
**Validates: Requirements 7.2**

### Property 18: Caching Strategy Implementation
*For any* asset request, the system should implement appropriate caching strategies based on asset type and update frequency.
**Validates: Requirements 7.4**

### Property 19: CTA Interaction Feedback
*For any* call-to-action interaction, the system should provide clear visual feedback, smooth transitions, and enable proper conversion metric tracking.
**Validates: Requirements 8.4, 8.5**

## Error Handling

### Performance Degradation
- **GSAP Loading Failure**: Fallback to CSS-only animations with progressive enhancement
- **Image Loading Failure**: Display placeholder with retry mechanism
- **Network Timeout**: Show cached content with offline indicator

### Responsive Breakpoint Issues
- **Viewport Changes**: Debounced resize handlers prevent layout thrashing
- **Orientation Changes**: Recalculate animations and layouts appropriately
- **Browser Compatibility**: Feature detection for advanced CSS properties

### Animation Performance
- **Low-End Devices**: Automatic animation reduction based on device capabilities
- **Reduced Motion**: Complete animation disabling with accessible alternatives
- **Scroll Performance**: Throttled scroll handlers with requestAnimationFrame

### Accessibility Failures
- **Color Contrast**: Automatic fallback to high-contrast alternatives
- **Focus Management**: Keyboard navigation with visible focus indicators
- **Screen Reader**: Proper ARIA labels and semantic structure

## Testing Strategy

### Unit Testing Approach
Unit tests will verify specific component behaviors, responsive breakpoints, and design system compliance. Key areas include:

- Component rendering with correct props
- Design token application and color compliance
- Responsive layout switching at breakpoints
- Accessibility attribute presence
- Error boundary functionality

### Property-Based Testing Approach
Property-based tests will verify universal behaviors across different inputs and device configurations using **fast-check** library with minimum 100 iterations per test.

**Library Selection**: fast-check for TypeScript/React applications
**Configuration**: Minimum 100 iterations per property test
**Tagging Format**: Each test tagged with `**Feature: marketing-experience, Property {number}: {property_text}**`

Key property tests include:
- Performance consistency across device types
- Color compliance across all components  
- Animation reversibility across scroll positions
- Accessibility compliance across interaction states
- Asset optimization across different network conditions

**Integration with Design Properties**: Each correctness property will be implemented as a single property-based test, ensuring comprehensive validation of system behaviors rather than specific examples.

The dual testing approach ensures both concrete functionality (unit tests) and universal correctness (property tests), providing comprehensive coverage for this complex, multi-device experience.