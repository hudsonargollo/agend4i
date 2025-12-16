# Requirements Document

## Introduction

The AgendAi marketing experience transformation aims to replace the current generic SaaS landing page with a high-performance, conversion-optimized experience that positions AgendAi as a premium solution for beauty and service professionals. The new design will implement a "Dark Mode & Neon" aesthetic with mobile-first performance and desktop scrollytelling features.

## Glossary

- **AgendAi System**: The complete SaaS platform for appointment scheduling and business management
- **Landing Page**: The public-facing homepage at route `/` 
- **Design System**: The "AgendAi Neon" standardized design tokens and components
- **Scrollytelling**: Interactive narrative experience driven by scroll position
- **Glassmorphism**: Visual design technique using translucent surfaces with backdrop blur
- **Aurora Background**: Animated gradient mesh background effect
- **Mobile-First**: Design approach prioritizing mobile device experience and performance

## Requirements

### Requirement 1

**User Story:** As a mobile visitor, I want a fast-loading, vertically-optimized landing page, so that I can quickly understand AgendAi's value proposition without performance issues.

#### Acceptance Criteria

1. WHEN a user visits the landing page on mobile devices THEN the system SHALL achieve a Lighthouse Performance score of 95 or higher
2. WHEN the page loads on devices under 768px width THEN the system SHALL render content in a vertical flex stack layout
3. WHEN images are displayed THEN the system SHALL serve WebP format images at appropriate dimensions for the device
4. WHEN content appears below the fold THEN the system SHALL lazy load those assets
5. WHEN touch targets are presented THEN the system SHALL ensure minimum 44px height with active state feedback

### Requirement 2

**User Story:** As a developer, I want a standardized design system, so that I can build consistent UI components without guessing design values.

#### Acceptance Criteria

1. WHEN implementing UI components THEN the system SHALL use the defined semantic color palette including brand-dark (#02040a), neon-green (#00ff88), and glass-surface (white with 3-5% opacity)
2. WHEN creating glassmorphism effects THEN the system SHALL provide utility classes combining backdrop-filter, bg-opacity, and border-gradient
3. WHEN displaying icons THEN the system SHALL use Lucide React icons styled with neon glow drop-shadow
4. WHEN defining typography THEN the system SHALL use Inter font family with bold tracking-tight for headings and relaxed for body text
5. WHEN ensuring accessibility THEN the system SHALL meet WCAG AA color contrast ratios for all text elements

### Requirement 3

**User Story:** As a desktop visitor, I want an immersive scrollytelling experience, so that I can explore AgendAi's features interactively and feel compelled to learn more.

#### Acceptance Criteria

1. WHEN viewing on devices 768px or wider THEN the system SHALL implement a pinned hero section for approximately 200vh scroll distance
2. WHEN scrolling through the hero section THEN the system SHALL transition the dashboard from 2D flat view to 3D exploded view
3. WHEN the exploded view activates THEN the system SHALL separate feature layers (WhatsApp notifications, Pix receipts, calendar) from the main dashboard
4. WHEN users scroll THEN the system SHALL make animations scrubbable and reversible based on scroll position
5. WHEN prefers-reduced-motion is enabled THEN the system SHALL disable all scroll-jacking and 3D effects

### Requirement 4

**User Story:** As a visitor, I want to see social proof and understand the three-step process, so that I can trust the platform and understand how it works.

#### Acceptance Criteria

1. WHEN displaying social proof THEN the system SHALL show "Simplificando a vida de +500 profissionais" with monochrome logos
2. WHEN showing company logos THEN the system SHALL implement infinite horizontal marquee scroll with GPU acceleration
3. WHEN explaining features THEN the system SHALL present three key capabilities: AI Scheduling, No-Show Protection, and Client Loyalty
4. WHEN displaying features on mobile THEN the system SHALL use vertical card stack layout
5. WHEN displaying features on desktop THEN the system SHALL use alternating zig-zag layout with scroll trigger reveals

### Requirement 5

**User Story:** As a potential customer, I want clear pricing information and answers to common questions, so that I can make an informed decision about using AgendAi.

#### Acceptance Criteria

1. WHEN viewing pricing THEN the system SHALL display two tiers: Free and Pro with clear feature differentiation
2. WHEN the Pro tier is displayed THEN the system SHALL highlight it with neon green border glow and "Popular" badge
3. WHEN pricing options are shown THEN the system SHALL include a toggle for monthly vs yearly billing with discount indication
4. WHEN FAQ section is accessed THEN the system SHALL display accordion-style questions with only one item open at a time
5. WHEN FAQ items are opened THEN the system SHALL change background to faint glass effect

### Requirement 6

**User Story:** As a user with accessibility needs, I want the interface to be fully accessible, so that I can navigate and use the landing page regardless of my abilities.

#### Acceptance Criteria

1. WHEN structuring content THEN the system SHALL use semantic HTML tags (header, main, section, article)
2. WHEN organizing headings THEN the system SHALL follow strict H1, H2, H3 hierarchy
3. WHEN interactive elements receive focus THEN the system SHALL display distinct focus-visible rings styled with neon green
4. WHEN content is presented THEN the system SHALL ensure no horizontal scrolling on mobile devices
5. WHEN text is displayed THEN the system SHALL use minimum 16px base font size on mobile for readability

### Requirement 7

**User Story:** As a system administrator, I want the landing page to be SEO optimized and performant, so that it ranks well in search results and loads quickly for all users.

#### Acceptance Criteria

1. WHEN serving images THEN the system SHALL use WebP format at correct dimensions for mobile vs desktop
2. WHEN loading heavy libraries THEN the system SHALL dynamically import GSAP only when DesktopStage component mounts
3. WHEN the page loads THEN the system SHALL implement proper meta tags and structured data for SEO
4. WHEN assets are requested THEN the system SHALL implement appropriate caching strategies
5. WHEN measuring performance THEN the system SHALL maintain Core Web Vitals within acceptable ranges

### Requirement 8

**User Story:** As a business owner, I want the landing page to effectively convert visitors to trial users, so that I can grow the AgendAi user base and revenue.

#### Acceptance Criteria

1. WHEN displaying the main headline THEN the system SHALL show "Sua Agenda Cheia. Zero Esforço."
2. WHEN presenting the call-to-action THEN the system SHALL use "Começar Grátis" with hover state "Criar Minha Agenda ->"
3. WHEN showing the value proposition THEN the system SHALL display "O AgendAi é a sua secretária virtual 24h"
4. WHEN users interact with CTAs THEN the system SHALL provide clear visual feedback and smooth transitions
5. WHEN measuring success THEN the system SHALL enable tracking of conversion metrics and user engagement