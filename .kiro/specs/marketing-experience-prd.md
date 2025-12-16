# Product Requirements Document: Marketing Experience & Design System

**Module:** `marketing-experience`  
**Version:** 2.0 (Mobile-First & Scrollytelling)  
**Status:** Approved for Implementation

---

## 1. Executive Summary

The goal of this initiative is to transform the AgendAi public landing page (`/`) from a generic SaaS template into a high-performance, immersive brand experience. By adopting a **Mobile-First** strategy enhanced with **"QClay-style" Scrollytelling** on desktop, we aim to increase visitor engagement and perceived brand value. Simultaneously, we will establish the **"AgendAi Neon" Design System** to ensure consistency across the application.

## 2. Problem Statement

- **Low Engagement:** The current "fade-in" animation is perceived as generic and fails to capture user attention.
- **Generic Visuals:** The interface lacks a distinct identity, resembling standard bootstrap templates.
- **Desktop-Centric Legacy:** Previous animations were not optimized for the majority of traffic coming from mobile devices.

## 3. Goals & Success Metrics

- **Brand Perception:** Establish AgendAi as a premium, high-tech solution through "Glassmorphism" and "Neon" aesthetics.
- **Mobile Performance:** Achieve 95+ Lighthouse Performance score on mobile (using lightweight assets).
- **Engagement:** Increase "Time on Page" by 40% via interactive storytelling elements.
- **Conversion:** Increase "Start Free Trial" click-through rate (CTR) by 15%.

---

## 4. Functional Requirements

### 4.1 Design System ("AgendAi Neon")

**User Story:** As a Developer, I need a standardized set of design tokens so that I can build consistent UIs without guessing values.

* **REQ-4.1.1:** The system SHALL define a semantic color palette:
  * `brand-dark` (#02040a): The "Void" background.
  * `neon-green` (#00ff88): Primary actions and highlights.
  * `glass-surface`: White with 3-5% opacity and background blur.
* **REQ-4.1.2:** The system SHALL define "Glassmorphism" utility classes (or components) that combine `backdrop-filter`, `bg-opacity`, and `border-gradient`.
* **REQ-4.1.3:** The system SHALL use **Lucide React** for all iconography, styled with a distinct "Neon Glow" drop-shadow.

### 4.2 Mobile-First Hero Experience

**User Story:** As a Mobile User, I want a fluid, vertical scrolling experience so that I can quickly understand the product without layout shifts.

* **REQ-4.2.1:** On devices < 768px, the Hero Section SHALL render as a vertical Flex/Grid stack.
* **REQ-4.2.2:** The "Dashboard" visual SHALL be a static, high-quality image (WebP) with a subtle CSS perspective tilt (no heavy 3D canvas).
* **REQ-4.2.3:** The Background SHALL use CSS Radial Gradients to simulate the "Aurora" effect (no heavy WebGL).
* **REQ-4.2.4:** Touch targets (Buttons) SHALL be minimum 44px height with active state feedback (`scale-95`).

### 4.3 Desktop "Scrollytelling" Experience

**User Story:** As a Desktop User, I want to explore the dashboard's features interactively so that I am compelled to learn more.

* **REQ-4.3.1:** On devices >= 768px, the Hero Section SHALL "Pin" (sticky position) for a scroll distance of roughly 200vh.
* **REQ-4.3.2:** As the user scrolls, the Dashboard SHALL transition from a 2D "Flat" view to a 3D "Exploded" view.
* **REQ-4.3.3:** The "Exploded View" SHALL separate the feature layers (WhatsApp Notification, Pix Receipt, Calendar) from the main dashboard body.
* **REQ-4.3.4:** The animation SHALL be scrubbable (linked to scrollbar) and reversible.

### 4.4 Feature Gating & Performance

**User Story:** As a System, I need to respect user preferences and device capabilities.

* **REQ-4.4.1:** The system SHALL verify `prefers-reduced-motion`. If true, all scroll-jacking and 3D effects are disabled.
* **REQ-4.4.2:** Heavy assets (3D libraries, huge images) SHALL be lazy-loaded or conditionally loaded only on Desktop breakpoints.

---

## 5. Visual Direction & Content Strategy

### 5.1 The "Neon Glass" Theme

We are moving away from flat SaaS styles to a depth-based dark mode.

| Element | Specification | Tailwind Class Equivalent (Approx) |
| :--- | :--- | :--- |
| **Background** | Deep Void | `bg-[#02040a]` |
| **Primary Text** | White | `text-white` |
| **Secondary Text** | Muted Blue-Grey | `text-slate-400` |
| **Accent** | Neon Green | `text-[#00ff88] drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]` |
| **Glass Card** | Translucent Blur | `bg-white/5 backdrop-blur-xl border border-white/10` |

### 5.2 Asset Manifest (The "To-Make" List)

#### Asset A: `hero-dashboard-base.png` (The Mothership)
* **Description:** A high-fidelity mockup of the AgendAi "Calendar View".
* **Style:** Dark Mode UI. Clean. No clutter.
* **Key Details:** Background of the app interface must be slightly transparent (90% opacity) to let the "Aurora" bleed through.

#### Asset B: `float-card-whatsapp.png` (Left Wing)
* **Description:** A floating "Glass" notification bubble.
* **Content:**
  * *Icon:* WhatsApp Green Logo.
  * *Text:* "Olá! Gostaria de agendar para hoje às 19h?"
  * *Status:* "Respondido pela IA 🤖" (Green checkmark).

#### Asset C: `float-card-pix.png` (Right Wing)
* **Description:** A floating "Glass" payment receipt.
* **Content:**
  * *Icon:* Pix Logo (Teal/Cyan).
  * *Amount:* "+ R$ 150,00".
  * *Label:* "Pagamento Confirmado".

### 5.3 Copywriting (The "Voice")

* **Headline (H1):** "Sua Agenda Cheia. Zero Esforço."
* **Sub-headline (H2):** "O AgendAi é a sua secretária virtual 24h. Agendamento, Lembretes no WhatsApp e Pagamentos via Pix — tudo no piloto automático."
* **CTA Button:** "Começar Grátis" (Hover: "Criar Minha Agenda ->")

---

## 6. Technical Architecture

### 6.1 Component Composition

We will split the Hero into two distinct render paths to ensure mobile performance.

```tsx
// src/components/landing/HeroSection.tsx
export const HeroSection = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  return (
    <section className="relative w-full overflow-hidden bg-[#02040a]">
      <AuroraBackground /> {/* Shared CSS Background */}
      {isDesktop ? (
        <Suspense fallback={<HeroSkeleton />}>
          <DesktopStage /> {/* Heavy GSAP + 3D Logic */}
        </Suspense>
      ) : (
        <MobileHero /> {/* Lightweight Flex Layout */}
      )}
    </section>
  );
};
```

### 6.2 GSAP Integration (Desktop Only)

We will use `gsap.matchMedia()` within the `DesktopStage` to ensure animations are strictly scoped.

**Timeline Logic:**
- **Trigger:** `.hero-container` hits top of viewport.
- **Pin:** Hold container for 2000px.
- **Anim 1 (0-50%):** `scale: 1 -> scale: 1.1`, `rotateX: 0 -> rotateX: 25deg`.
- **Anim 2 (40-100%):** Translate Floating Layers x, y, z outwards ("Explosion").

### 6.3 Correctness Properties

**Property 1 (Responsive Isolation):** The `DesktopStage` component must NEVER mount on screens < 768px to prevent "Scroll Jacking" on phones.

**Property 2 (Asset Fallback):** If GSAP fails to load or crash, the CSS layout must remain readable (Progressive Enhancement).

## 7. Implementation Plan (Tasks)

### Phase 1: Design System Setup
- [ ] 1.1 Update `tailwind.config.ts` with "Neon" colors and "Glow" drop-shadows.
- [ ] 1.2 Create `src/components/design-system/GlassCard.tsx` (Standard container).
- [ ] 1.3 Create `src/components/design-system/NeonButton.tsx` (Standard CTA).

### Phase 2: Mobile-First Implementation
- [ ] 2.1 Create `src/components/landing/AuroraBackground.tsx` (CSS-only version).
- [ ] 2.2 Create `src/components/landing/MobileHero.tsx` using the new Design System components.
- [ ] 2.3 Verify 95+ Lighthouse Score on Mobile simulation.

### Phase 3: Desktop "Scrollytelling" Implementation
- [ ] 3.1 Install GSAP: `npm install gsap @gsap/react`.
- [ ] 3.2 Create `src/components/landing/DesktopStage.tsx`.
- [ ] 3.3 Implement the `useGsap` hook to Pin and Scrub the 3D layers.
- [ ] 3.4 Wire up the "Explosion" animation timeline.

### Phase 4: Integration & QA
- [ ] 4.1 Create the parent `HeroSection.tsx` with conditional rendering logic.
- [ ] 4.2 Replace the existing hero in `src/pages/Index.tsx`.
- [ ] 4.3 Add `will-change-transform` CSS properties to optimized layers.
- [ ] 4.4 Test resize behavior (Mobile <-> Desktop) and "Reduced Motion" compliance.

---

## 8. Authentication Enhancement Summary

### Google OAuth Integration
- ✅ Added Google OAuth buttons to both login and signup tabs
- ✅ Implemented `handleGoogleAuth` function with proper error handling
- ✅ Created OAuth callback handler at `/auth/callback`
- ✅ Added visual separators between OAuth and email/password options
- ✅ Maintained consistent UI/UX with existing design system

### Zeroum Barbearia Account
- ✅ Created setup script for specific account: `zeroum@barbearia.com` / `rods1773#`
- ✅ Configured as Pro Plan tenant with slug `zeroumbarbearia`
- ✅ Includes default services (Corte Masculino, Barba, Corte + Barba)
- ✅ Pre-configured with WhatsApp and payment features enabled
- ✅ Ready for immediate use at `/zeroumbarbearia` URL

### Technical Implementation
- ✅ OAuth callback route added to router
- ✅ Proper session handling and user redirection
- ✅ Error handling for authentication failures
- ✅ Backward compatibility maintained

---

*This PRD serves as the complete specification for transforming AgendAi's marketing experience while maintaining the robust multi-tenant SaaS platform functionality.*