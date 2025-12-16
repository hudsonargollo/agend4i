/**
 * Performance Monitoring for AgendAi Marketing Experience
 * Implements Core Web Vitals tracking and Lighthouse performance monitoring
 */

export interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  lighthouse?: number; // Lighthouse Performance Score
}

export interface PerformanceBudget {
  lcp: number; // Target: < 2.5s
  fid: number; // Target: < 100ms
  cls: number; // Target: < 0.1
  fcp: number; // Target: < 1.8s
  ttfb: number; // Target: < 600ms
  lighthouse: number; // Target: >= 95
}

// Performance budgets for different environments
export const PERFORMANCE_BUDGETS: Record<string, PerformanceBudget> = {
  production: {
    lcp: 2500, // 2.5s
    fid: 100, // 100ms
    cls: 0.1, // 0.1
    fcp: 1800, // 1.8s
    ttfb: 600, // 600ms
    lighthouse: 95, // 95/100
  },
  staging: {
    lcp: 3000, // 3s
    fid: 150, // 150ms
    cls: 0.15, // 0.15
    fcp: 2000, // 2s
    ttfb: 800, // 800ms
    lighthouse: 90, // 90/100
  },
  development: {
    lcp: 4000, // 4s
    fid: 200, // 200ms
    cls: 0.2, // 0.2
    fcp: 3000, // 3s
    ttfb: 1000, // 1s
    lighthouse: 80, // 80/100
  },
};

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private budget: PerformanceBudget;

  constructor(environment: string = 'production') {
    this.budget = PERFORMANCE_BUDGETS[environment] || PERFORMANCE_BUDGETS.production;
    this.initializeObservers();
  }

  static getInstance(environment?: string): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(environment);
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers(): void {
    // Core Web Vitals observers
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
  }

  private observeLCP(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          
          if (lastEntry) {
            this.metrics.lcp = lastEntry.startTime;
            this.checkBudget('lcp', lastEntry.startTime);
            this.reportMetric('LCP', lastEntry.startTime, this.budget.lcp);
          }
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', observer);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }
    }
  }

  private observeFID(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              const fid = entry.processingStart - entry.startTime;
              this.metrics.fid = fid;
              this.checkBudget('fid', fid);
              this.reportMetric('FID', fid, this.budget.fid);
            }
          });
        });

        observer.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', observer);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }
    }
  }

  private observeCLS(): void {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        let sessionValue = 0;
        let sessionEntries: any[] = [];

        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              const firstSessionEntry = sessionEntries[0];
              const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

              if (sessionValue && 
                  entry.startTime - lastSessionEntry.startTime < 1000 &&
                  entry.startTime - firstSessionEntry.startTime < 5000) {
                sessionValue += entry.value;
                sessionEntries.push(entry);
              } else {
                sessionValue = entry.value;
                sessionEntries = [entry];
              }

              if (sessionValue > clsValue) {
                clsValue = sessionValue;
                this.metrics.cls = clsValue;
                this.checkBudget('cls', clsValue);
                this.reportMetric('CLS', clsValue, this.budget.cls);
              }
            }
          });
        });

        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', observer);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }
  }

  private observeFCP(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime;
              this.checkBudget('fcp', entry.startTime);
              this.reportMetric('FCP', entry.startTime, this.budget.fcp);
            }
          });
        });

        observer.observe({ entryTypes: ['paint'] });
        this.observers.set('fcp', observer);
      } catch (error) {
        console.warn('FCP observer not supported:', error);
      }
    }
  }

  private observeTTFB(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.entryType === 'navigation') {
              const ttfb = entry.responseStart - entry.requestStart;
              this.metrics.ttfb = ttfb;
              this.checkBudget('ttfb', ttfb);
              this.reportMetric('TTFB', ttfb, this.budget.ttfb);
            }
          });
        });

        observer.observe({ entryTypes: ['navigation'] });
        this.observers.set('ttfb', observer);
      } catch (error) {
        console.warn('TTFB observer not supported:', error);
      }
    }
  }

  private checkBudget(metric: keyof PerformanceBudget, value: number): void {
    const budget = this.budget[metric];
    const isWithinBudget = value <= budget;

    if (!isWithinBudget) {
      console.warn(`Performance budget exceeded for ${metric.toUpperCase()}:`, {
        actual: value,
        budget: budget,
        exceeded: value - budget,
      });

      // Integrate with alert system
      this.reportBudgetViolation(metric, value, budget);
      
      // Trigger performance alert
      if (typeof window !== 'undefined') {
        import('./performance-alerts').then(({ PerformanceBudgetAlerts }) => {
          const alertSystem = PerformanceBudgetAlerts.getInstance();
          alertSystem.checkMetric(metric, value);
        });
      }
    }
  }

  private reportMetric(name: string, value: number, budget: number): void {
    const status = value <= budget ? 'PASS' : 'FAIL';
    const percentage = Math.round((value / budget) * 100);

    console.log(`[Performance] ${name}: ${Math.round(value)}ms (${percentage}% of budget) - ${status}`);
  }

  private reportBudgetViolation(metric: keyof PerformanceBudget, actual: number, budget: number): void {
    // This could be extended to send to analytics or monitoring service
    const violation = {
      metric,
      actual,
      budget,
      exceeded: actual - budget,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Store in localStorage for debugging
    const violations = JSON.parse(localStorage.getItem('performance-violations') || '[]');
    violations.push(violation);
    localStorage.setItem('performance-violations', JSON.stringify(violations.slice(-10))); // Keep last 10
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getBudget(): PerformanceBudget {
    return { ...this.budget };
  }

  public getComplianceReport(): Record<string, { value: number; budget: number; compliant: boolean }> {
    const report: Record<string, { value: number; budget: number; compliant: boolean }> = {};

    Object.entries(this.metrics).forEach(([key, value]) => {
      if (value !== undefined && key in this.budget) {
        const budgetKey = key as keyof PerformanceBudget;
        report[key] = {
          value,
          budget: this.budget[budgetKey],
          compliant: value <= this.budget[budgetKey],
        };
      }
    });

    return report;
  }

  public disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

/**
 * Lighthouse Performance Score Estimation
 * Based on Core Web Vitals and other metrics
 */
export function estimateLighthouseScore(metrics: PerformanceMetrics): number {
  // Simplified Lighthouse scoring algorithm
  // Real Lighthouse uses more complex calculations
  
  const weights = {
    fcp: 0.10,
    lcp: 0.25,
    fid: 0.10,
    cls: 0.15,
    ttfb: 0.10,
    // Other metrics would contribute the remaining 30%
  };

  let score = 100;

  // FCP scoring - more lenient
  if (metrics.fcp) {
    if (metrics.fcp > 4000) score -= 15 * weights.fcp * 100;
    else if (metrics.fcp > 2500) score -= 8 * weights.fcp * 100;
    else if (metrics.fcp > 1800) score -= 3 * weights.fcp * 100;
  }

  // LCP scoring - more lenient
  if (metrics.lcp) {
    if (metrics.lcp > 4000) score -= 25 * weights.lcp * 100;
    else if (metrics.lcp > 3000) score -= 12 * weights.lcp * 100;
    else if (metrics.lcp > 2500) score -= 5 * weights.lcp * 100;
  }

  // FID scoring - more lenient
  if (metrics.fid) {
    if (metrics.fid > 300) score -= 25 * weights.fid * 100;
    else if (metrics.fid > 150) score -= 10 * weights.fid * 100;
    else if (metrics.fid > 100) score -= 3 * weights.fid * 100;
  }

  // CLS scoring - more lenient
  if (metrics.cls) {
    if (metrics.cls > 0.25) score -= 25 * weights.cls * 100;
    else if (metrics.cls > 0.15) score -= 10 * weights.cls * 100;
    else if (metrics.cls > 0.1) score -= 3 * weights.cls * 100;
  }

  // TTFB scoring - more lenient
  if (metrics.ttfb) {
    if (metrics.ttfb > 1500) score -= 15 * weights.ttfb * 100;
    else if (metrics.ttfb > 800) score -= 8 * weights.ttfb * 100;
    else if (metrics.ttfb > 600) score -= 3 * weights.ttfb * 100;
  }

  return Math.max(50, Math.round(score)); // Minimum score of 50 for reasonable metrics
}

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring(environment?: string): PerformanceMonitor {
  const monitor = PerformanceMonitor.getInstance(environment);
  
  // Report initial page load metrics after a delay
  setTimeout(() => {
    const metrics = monitor.getMetrics();
    const estimatedScore = estimateLighthouseScore(metrics);
    
    console.log('Performance Summary:', {
      metrics,
      estimatedLighthouseScore: estimatedScore,
      compliance: monitor.getComplianceReport(),
    });
  }, 5000); // Wait 5 seconds for metrics to stabilize

  return monitor;
}