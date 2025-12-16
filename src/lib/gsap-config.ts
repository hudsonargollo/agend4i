/**
 * GSAP Animation Configuration and Utilities
 * Implements dynamic import for performance optimization as per Requirements 7.2
 */

export interface AnimationStep {
  target: string;
  properties: Record<string, any>;
  duration: number;
  ease: string;
}

export interface ScrollAnimation {
  trigger: string;
  start: string;
  end: string;
  scrub: boolean;
  pin?: boolean;
  timeline: AnimationStep[];
}

export interface GSAPInstance {
  gsap: any;
  ScrollTrigger: any;
}

/**
 * Dynamically imports GSAP and ScrollTrigger plugin for performance optimization
 * Only loads when DesktopStage component mounts
 */
export const loadGSAP = async (): Promise<GSAPInstance> => {
  const { gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  
  // Register ScrollTrigger plugin
  gsap.registerPlugin(ScrollTrigger);
  
  return { gsap, ScrollTrigger };
};

/**
 * Default animation configurations for desktop scrollytelling
 */
export const DESKTOP_ANIMATIONS = {
  HERO_PIN_DISTANCE: '200vh',
  DASHBOARD_TRANSITION: {
    duration: 1,
    ease: 'power2.inOut',
  },
  FLOATING_CARDS: {
    duration: 0.8,
    ease: 'back.out(1.7)',
  },
} as const;

/**
 * Animation presets for different scroll sections
 */
export const createScrollAnimations = (gsap: any): ScrollAnimation[] => [
  {
    trigger: '.desktop-stage',
    start: 'top top',
    end: '+=200vh',
    scrub: true,
    pin: true,
    timeline: [
      {
        target: '.dashboard-base',
        properties: {
          rotateX: 15,
          rotateY: -10,
          scale: 0.9,
          z: -100,
        },
        duration: 1,
        ease: 'power2.inOut',
      },
      {
        target: '.floating-whatsapp',
        properties: {
          x: -200,
          y: -150,
          z: 50,
          rotateZ: -15,
        },
        duration: 0.8,
        ease: 'back.out(1.7)',
      },
      {
        target: '.floating-pix',
        properties: {
          x: 200,
          y: -100,
          z: 30,
          rotateZ: 10,
        },
        duration: 0.8,
        ease: 'back.out(1.7)',
      },
      {
        target: '.floating-calendar',
        properties: {
          x: 0,
          y: -200,
          z: 80,
          rotateX: 20,
        },
        duration: 0.8,
        ease: 'back.out(1.7)',
      },
    ],
  },
];

/**
 * Accessibility-aware animation setup
 * Respects prefers-reduced-motion setting
 */
export const setupAccessibleAnimations = (gsap: any, ScrollTrigger: any) => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    // Disable all scroll-triggered animations
    ScrollTrigger.config({ 
      autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
      ignoreMobileResize: true 
    });
    
    // Set all animations to instant completion
    gsap.globalTimeline.timeScale(1000);
    
    return false; // Indicates animations are disabled
  }
  
  return true; // Indicates animations are enabled
};