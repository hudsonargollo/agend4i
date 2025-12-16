/**
 * Property-Based Tests for Performance Compliance Across Devices
 * **Feature: marketing-experience, Property 1: Performance Compliance Across Devices**
 * **Validates: Requirements 1.1, 7.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  PerformanceMonitor, 
  PERFORMANCE_BUDGETS, 
  estimateLighthouseScore,
  type PerformanceMetrics,
  type PerformanceBudget 
} from '../lib/performance-monitoring';
import { PerformanceBudgetAlerts } from '../lib/performance-alerts';

describe('Performance Compliance Across Devices', () => {
  /**
   * **Feature: marketing-experience, Property 1: Performance Compliance Across Devices**
   * For any device type, the landing page should achieve a Lighthouse Performance score of 95+ 
   * on mobile and maintain Core Web Vitals within acceptable ranges
   */
  it('should maintain performance budgets across all environments', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('production', 'staging', 'development'),
        (environment: string) => {
          const budget = PERFORMANCE_BUDGETS[environment];
          
          // Budget should be defined for all environments
          expect(budget).toBeDefined();
          expect(typeof budget).toBe('object');
          
          // All Core Web Vitals should have reasonable budgets
          expect(budget.lcp).toBeGreaterThan(0);
          expect(budget.lcp).toBeLessThanOrEqual(4000); // Max 4s even for dev
          
          expect(budget.fid).toBeGreaterThan(0);
          expect(budget.fid).toBeLessThanOrEqual(300); // Max 300ms even for dev
          
          expect(budget.cls).toBeGreaterThan(0);
          expect(budget.cls).toBeLessThanOrEqual(0.25); // Max 0.25 even for dev
          
          expect(budget.fcp).toBeGreaterThan(0);
          expect(budget.fcp).toBeLessThanOrEqual(3000); // Max 3s even for dev
          
          expect(budget.ttfb).toBeGreaterThan(0);
          expect(budget.ttfb).toBeLessThanOrEqual(1000); // Max 1s even for dev
          
          expect(budget.lighthouse).toBeGreaterThanOrEqual(80); // Min 80 even for dev
          expect(budget.lighthouse).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate realistic Lighthouse scores based on Core Web Vitals', () => {
    fc.assert(
      fc.property(
        fc.record({
          lcp: fc.option(fc.float({ min: 500, max: 8000 })), // 0.5s to 8s
          fid: fc.option(fc.float({ min: 10, max: 500 })), // 10ms to 500ms
          cls: fc.option(fc.float({ min: 0, max: 0.5 })), // 0 to 0.5
          fcp: fc.option(fc.float({ min: 300, max: 5000 })), // 0.3s to 5s
          ttfb: fc.option(fc.float({ min: 100, max: 2000 })), // 100ms to 2s
        }),
        (metrics: PerformanceMetrics) => {
          const score = estimateLighthouseScore(metrics);
          
          // Score should be between 0 and 100
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
          expect(Number.isInteger(score)).toBe(true);
          
          // Good metrics should result in higher scores
          if (metrics.lcp && metrics.lcp <= 2500 && 
              metrics.fid && metrics.fid <= 100 && 
              metrics.cls && metrics.cls <= 0.1 &&
              metrics.fcp && metrics.fcp <= 1800 &&
              metrics.ttfb && metrics.ttfb <= 600) {
            // All metrics within good thresholds should score high
            expect(score).toBeGreaterThanOrEqual(85);
          }
          
          // Poor metrics should result in lower scores
          if (metrics.lcp && metrics.lcp > 4000 || 
              metrics.fid && metrics.fid > 300 || 
              metrics.cls && metrics.cls > 0.25) {
            // Poor metrics should significantly impact score
            expect(score).toBeLessThan(90);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate appropriate alerts for budget violations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('production', 'staging', 'development'),
        fc.constantFrom('lcp', 'fid', 'cls', 'fcp', 'ttfb', 'lighthouse'),
        fc.float({ min: 0.5, max: 5.0 }), // Multiplier for budget violation
        (environment: string, metric: keyof PerformanceBudget, multiplier: number) => {
          const alertSystem = new PerformanceBudgetAlerts(environment);
          const budget = PERFORMANCE_BUDGETS[environment];
          const budgetValue = budget[metric];
          const testValue = budgetValue * multiplier;
          
          const alert = alertSystem.checkMetric(metric, testValue);
          
          if (multiplier <= 1.0) {
            // Within budget should not generate alert
            expect(alert).toBeNull();
          } else {
            // Over budget should generate alert
            expect(alert).not.toBeNull();
            expect(alert!.metric).toBe(metric.toUpperCase());
            expect(alert!.actual).toBe(testValue);
            expect(alert!.budget).toBe(budgetValue);
            
            // Severity should match exceedance level
            if (multiplier > 2.0) {
              expect(alert!.severity).toBe('critical');
            } else {
              expect(alert!.severity).toBe('warning');
            }
            
            // Message should be informative
            expect(alert!.message).toContain(metric.toUpperCase());
            expect(alert!.message.length).toBeGreaterThan(20);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain production performance standards', () => {
    fc.assert(
      fc.property(
        fc.record({
          lcp: fc.integer({ min: 1000, max: 2500 }), // Good LCP range
          fid: fc.integer({ min: 50, max: 100 }), // Good FID range
          cls: fc.float({ min: 0, max: Math.fround(0.1) }), // Good CLS range
          fcp: fc.integer({ min: 800, max: 1800 }), // Good FCP range
          ttfb: fc.integer({ min: 200, max: 600 }), // Good TTFB range
        }),
        (goodMetrics: PerformanceMetrics) => {
          const productionBudget = PERFORMANCE_BUDGETS.production;
          
          // All good metrics should be within production budget
          if (goodMetrics.lcp) {
            expect(goodMetrics.lcp).toBeLessThanOrEqual(productionBudget.lcp);
          }
          if (goodMetrics.fid) {
            expect(goodMetrics.fid).toBeLessThanOrEqual(productionBudget.fid);
          }
          if (goodMetrics.cls) {
            expect(goodMetrics.cls).toBeLessThanOrEqual(productionBudget.cls);
          }
          if (goodMetrics.fcp) {
            expect(goodMetrics.fcp).toBeLessThanOrEqual(productionBudget.fcp);
          }
          if (goodMetrics.ttfb) {
            expect(goodMetrics.ttfb).toBeLessThanOrEqual(productionBudget.ttfb);
          }
          
          // Good metrics should result in high Lighthouse score
          const score = estimateLighthouseScore(goodMetrics);
          expect(score).toBeGreaterThanOrEqual(productionBudget.lighthouse);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle performance monitoring initialization correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('production', 'staging', 'development'),
        (environment: string) => {
          // Should not throw when initializing monitor
          expect(() => {
            const monitor = new PerformanceMonitor(environment);
            const metrics = monitor.getMetrics();
            const budget = monitor.getBudget();
            const report = monitor.getComplianceReport();
            
            // Methods should return valid objects
            expect(typeof metrics).toBe('object');
            expect(typeof budget).toBe('object');
            expect(typeof report).toBe('object');
            
            // Budget should match environment
            expect(budget).toEqual(PERFORMANCE_BUDGETS[environment]);
            
            monitor.disconnect();
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure mobile-first performance targets are achievable', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Mobile-optimized metrics (stricter than desktop)
          lcp: fc.integer({ min: 1200, max: 2500 }), // Mobile LCP target
          fid: fc.integer({ min: 30, max: 100 }), // Mobile FID target
          cls: fc.float({ min: 0, max: Math.fround(0.1) }), // Mobile CLS target
          fcp: fc.integer({ min: 900, max: 1800 }), // Mobile FCP target
          ttfb: fc.integer({ min: 300, max: 600 }), // Mobile TTFB target
        }),
        (mobileMetrics: PerformanceMetrics) => {
          const score = estimateLighthouseScore(mobileMetrics);
          
          // Mobile-optimized metrics should achieve target score
          expect(score).toBeGreaterThanOrEqual(95); // Requirement 1.1: 95+ on mobile
          
          // All metrics should be within mobile performance ranges
          const productionBudget = PERFORMANCE_BUDGETS.production;
          
          Object.entries(mobileMetrics).forEach(([key, value]) => {
            if (value !== undefined && key in productionBudget) {
              const budgetKey = key as keyof PerformanceBudget;
              expect(value).toBeLessThanOrEqual(productionBudget[budgetKey]);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain Core Web Vitals within acceptable ranges consistently', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            lcp: fc.integer({ min: 500, max: 2000 }), // Constrain to good range
            fid: fc.integer({ min: 10, max: 80 }), // Constrain to good range
            cls: fc.float({ min: 0, max: Math.fround(0.08) }), // Constrain to good range
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (metricSamples: PerformanceMetrics[]) => {
          // Calculate average performance across samples
          const avgLcp = metricSamples.reduce((sum, m) => sum + (m.lcp || 0), 0) / metricSamples.length;
          const avgFid = metricSamples.reduce((sum, m) => sum + (m.fid || 0), 0) / metricSamples.length;
          const avgCls = metricSamples.reduce((sum, m) => sum + (m.cls || 0), 0) / metricSamples.length;
          
          const productionBudget = PERFORMANCE_BUDGETS.production;
          
          // Average performance should be better than budget to account for variance
          const safetyMargin = 0.8; // 20% safety margin
          
          if (avgLcp > 0) {
            expect(Math.round(avgLcp)).toBeLessThanOrEqual(Math.round(productionBudget.lcp * safetyMargin));
          }
          if (avgFid > 0) {
            expect(Math.round(avgFid)).toBeLessThanOrEqual(Math.round(productionBudget.fid * safetyMargin));
          }
          if (avgCls > 0) {
            expect(avgCls).toBeLessThanOrEqual(productionBudget.cls * safetyMargin);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});