/**
 * Performance Budget Alert System
 * Provides real-time alerts when performance budgets are exceeded
 */

import { PerformanceMetrics, PerformanceBudget, PERFORMANCE_BUDGETS } from './performance-monitoring';

export interface PerformanceAlert {
  metric: string;
  actual: number;
  budget: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
}

export class PerformanceBudgetAlerts {
  private static instance: PerformanceBudgetAlerts;
  private alerts: PerformanceAlert[] = [];
  private listeners: ((alert: PerformanceAlert) => void)[] = [];
  private budget: PerformanceBudget;

  constructor(environment: string = 'production') {
    this.budget = PERFORMANCE_BUDGETS[environment] || PERFORMANCE_BUDGETS.production;
  }

  static getInstance(environment?: string): PerformanceBudgetAlerts {
    if (!PerformanceBudgetAlerts.instance) {
      PerformanceBudgetAlerts.instance = new PerformanceBudgetAlerts(environment);
    }
    return PerformanceBudgetAlerts.instance;
  }

  public checkMetric(metric: keyof PerformanceBudget, value: number): PerformanceAlert | null {
    const budget = this.budget[metric];
    
    if (value <= budget) {
      return null; // Within budget
    }

    const exceedanceRatio = value / budget;
    const severity: 'warning' | 'critical' = exceedanceRatio > 2 ? 'critical' : 'warning';
    
    const alert: PerformanceAlert = {
      metric: metric.toUpperCase(),
      actual: value,
      budget,
      severity,
      message: this.generateAlertMessage(metric, value, budget, severity),
      timestamp: Date.now(),
    };

    this.addAlert(alert);
    return alert;
  }

  private generateAlertMessage(
    metric: keyof PerformanceBudget, 
    actual: number, 
    budget: number, 
    severity: 'warning' | 'critical'
  ): string {
    const exceedance = actual - budget;
    const percentage = Math.round((actual / budget) * 100);

    // Use metric abbreviations for consistency with tests
    const description = metric.toUpperCase();
    
    if (severity === 'critical') {
      return `🚨 CRITICAL: ${description} is severely degraded (${percentage}% of budget). ` +
             `Actual: ${Math.round(actual)}${this.getUnit(metric)}, ` +
             `Budget: ${budget}${this.getUnit(metric)}, ` +
             `Exceeded by: ${Math.round(exceedance)}${this.getUnit(metric)}`;
    } else {
      return `⚠️ WARNING: ${description} exceeds performance budget (${percentage}% of budget). ` +
             `Actual: ${Math.round(actual)}${this.getUnit(metric)}, ` +
             `Budget: ${budget}${this.getUnit(metric)}`;
    }
  }

  private getUnit(metric: keyof PerformanceBudget): string {
    switch (metric) {
      case 'cls':
        return '';
      case 'lighthouse':
        return '/100';
      default:
        return 'ms';
    }
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Keep only last 20 alerts
    if (this.alerts.length > 20) {
      this.alerts = this.alerts.slice(-20);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(alert));

    // Log to console
    if (alert.severity === 'critical') {
      console.error(alert.message);
    } else {
      console.warn(alert.message);
    }

    // Store in localStorage for debugging
    this.persistAlert(alert);
  }

  private persistAlert(alert: PerformanceAlert): void {
    try {
      const storedAlerts = JSON.parse(localStorage.getItem('performance-alerts') || '[]');
      storedAlerts.push(alert);
      
      // Keep only last 50 alerts in storage
      const recentAlerts = storedAlerts.slice(-50);
      localStorage.setItem('performance-alerts', JSON.stringify(recentAlerts));
    } catch (error) {
      console.warn('Failed to persist performance alert:', error);
    }
  }

  public onAlert(listener: (alert: PerformanceAlert) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  public getCriticalAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.severity === 'critical');
  }

  public getAlertsForMetric(metric: string): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.metric === metric.toUpperCase());
  }

  public clearAlerts(): void {
    this.alerts = [];
    localStorage.removeItem('performance-alerts');
  }

  public generateReport(): {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    alertsByMetric: Record<string, number>;
    recentAlerts: PerformanceAlert[];
  } {
    const criticalCount = this.alerts.filter(a => a.severity === 'critical').length;
    const warningCount = this.alerts.filter(a => a.severity === 'warning').length;
    
    const alertsByMetric: Record<string, number> = {};
    this.alerts.forEach(alert => {
      alertsByMetric[alert.metric] = (alertsByMetric[alert.metric] || 0) + 1;
    });

    return {
      totalAlerts: this.alerts.length,
      criticalAlerts: criticalCount,
      warningAlerts: warningCount,
      alertsByMetric,
      recentAlerts: this.alerts.slice(-10), // Last 10 alerts
    };
  }
}

/**
 * Performance monitoring hook for React components
 */
export function usePerformanceAlerts() {
  const alertSystem = PerformanceBudgetAlerts.getInstance();
  
  return {
    alerts: alertSystem.getAlerts(),
    criticalAlerts: alertSystem.getCriticalAlerts(),
    onAlert: alertSystem.onAlert.bind(alertSystem),
    clearAlerts: alertSystem.clearAlerts.bind(alertSystem),
    generateReport: alertSystem.generateReport.bind(alertSystem),
  };
}

/**
 * Initialize performance budget monitoring with alerts
 */
export function initializePerformanceBudgetAlerts(environment?: string): PerformanceBudgetAlerts {
  const alertSystem = PerformanceBudgetAlerts.getInstance(environment);
  
  // Set up global error handler for performance issues
  window.addEventListener('error', (event) => {
    console.warn('Performance-related error detected:', event.error);
  });

  // Monitor for long tasks that could affect performance
  if ('PerformanceObserver' in window) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(`Long task detected: ${Math.round(entry.duration)}ms`);
          }
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task observer not supported:', error);
    }
  }

  return alertSystem;
}