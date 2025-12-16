/**
 * Conversion Tracking System for AgendAi
 * Tracks CTA interactions and user engagement events
 */

export interface ConversionEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  timestamp: number;
  page: string;
  userAgent: string;
}

export interface CTAInteractionData {
  ctaType: 'primary' | 'secondary';
  ctaText: string;
  ctaLocation: string;
  targetUrl?: string;
  conversionFunnel: string;
}

class ConversionTracker {
  private events: ConversionEvent[] = [];
  private sessionId: string;
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking(): void {
    // Initialize Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        session_id: this.sessionId,
        custom_map: {
          custom_parameter_1: 'cta_type',
          custom_parameter_2: 'conversion_funnel'
        }
      });
    }
  }

  /**
   * Track CTA interactions with smooth feedback
   */
  trackCTAInteraction(data: CTAInteractionData): Promise<void> {
    return new Promise((resolve) => {
      const event: ConversionEvent = {
        event: 'cta_interaction',
        category: 'engagement',
        action: 'click',
        label: `${data.ctaType}_${data.ctaLocation}`,
        timestamp: Date.now(),
        page: window.location.pathname,
        userAgent: navigator.userAgent
      };

      // Store event locally
      this.events.push(event);

      // Send to Google Analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'cta_click', {
          event_category: 'engagement',
          event_label: data.ctaText,
          cta_type: data.ctaType,
          cta_location: data.ctaLocation,
          conversion_funnel: data.conversionFunnel,
          value: data.ctaType === 'primary' ? 10 : 5
        });
      }

      // Send to custom analytics endpoint
      this.sendToAnalytics(event);

      // Resolve immediately for smooth UX
      resolve();
    });
  }

  /**
   * Track conversion funnel progression
   */
  trackFunnelStep(step: string, funnelName: string, additionalData?: Record<string, any>): void {
    const event: ConversionEvent = {
      event: 'funnel_progression',
      category: 'conversion',
      action: step,
      label: funnelName,
      timestamp: Date.now(),
      page: window.location.pathname,
      userAgent: navigator.userAgent
    };

    this.events.push(event);

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'funnel_step', {
        event_category: 'conversion',
        event_label: funnelName,
        funnel_step: step,
        ...additionalData
      });
    }

    this.sendToAnalytics(event);
  }

  /**
   * Track page views with performance metrics
   */
  trackPageView(page: string, performanceMetrics?: Record<string, number>): void {
    const event: ConversionEvent = {
      event: 'page_view',
      category: 'navigation',
      action: 'view',
      label: page,
      timestamp: Date.now(),
      page: window.location.pathname,
      userAgent: navigator.userAgent
    };

    this.events.push(event);

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        ...performanceMetrics
      });
    }

    this.sendToAnalytics(event);
  }

  /**
   * Track user engagement events
   */
  trackEngagement(action: string, category: string = 'engagement', value?: number): void {
    const event: ConversionEvent = {
      event: 'user_engagement',
      category,
      action,
      value,
      timestamp: Date.now(),
      page: window.location.pathname,
      userAgent: navigator.userAgent
    };

    this.events.push(event);

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', action, {
        event_category: category,
        value: value || 1
      });
    }

    this.sendToAnalytics(event);
  }

  /**
   * Send events to analytics endpoint
   */
  private async sendToAnalytics(event: ConversionEvent): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Send to custom analytics endpoint (could be Supabase function)
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          sessionId: this.sessionId
        })
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  /**
   * Get conversion metrics for analysis
   */
  getConversionMetrics(): {
    totalEvents: number;
    ctaClicks: number;
    funnelProgression: Record<string, number>;
    topCTAs: Array<{ label: string; count: number }>;
  } {
    const ctaEvents = this.events.filter(e => e.event === 'cta_interaction');
    const funnelEvents = this.events.filter(e => e.event === 'funnel_progression');

    const funnelProgression = funnelEvents.reduce((acc, event) => {
      const key = `${event.label}_${event.action}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const ctaCounts = ctaEvents.reduce((acc, event) => {
      const label = event.label || 'unknown';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCTAs = Object.entries(ctaCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEvents: this.events.length,
      ctaClicks: ctaEvents.length,
      funnelProgression,
      topCTAs
    };
  }

  /**
   * Enable or disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear stored events (for privacy compliance)
   */
  clearEvents(): void {
    this.events = [];
  }
}

// Singleton instance
export const conversionTracker = new ConversionTracker();

/**
 * Hook for React components to track CTA interactions
 */
export const useCTATracking = () => {
  const trackCTA = async (data: CTAInteractionData) => {
    await conversionTracker.trackCTAInteraction(data);
  };

  const trackFunnel = (step: string, funnelName: string, additionalData?: Record<string, any>) => {
    conversionTracker.trackFunnelStep(step, funnelName, additionalData);
  };

  const trackEngagement = (action: string, category?: string, value?: number) => {
    conversionTracker.trackEngagement(action, category, value);
  };

  return {
    trackCTA,
    trackFunnel,
    trackEngagement
  };
};

/**
 * Initialize Google Analytics
 */
export const initializeGoogleAnalytics = (measurementId: string) => {
  if (typeof window === 'undefined') return;

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    page_title: document.title,
    page_location: window.location.href
  });
};