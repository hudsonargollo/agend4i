import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ServiceWorkerManager, preloadCriticalResources } from "./lib/caching-strategy";
import { initializePerformanceMonitoring } from "./lib/performance-monitoring";
import { initializePerformanceBudgetAlerts } from "./lib/performance-alerts";
import { initializeGoogleAnalytics, conversionTracker } from "./lib/conversion-tracking";

// Preload critical resources for performance
preloadCriticalResources();

// Initialize performance monitoring and alerts
const environment = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'production';
initializePerformanceMonitoring(environment);
initializePerformanceBudgetAlerts(environment);

// Initialize Google Analytics for conversion tracking
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
if (import.meta.env.PROD && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
  initializeGoogleAnalytics(GA_MEASUREMENT_ID);
}

// Track initial page view
conversionTracker.trackPageView(window.location.pathname);

// Register service worker for caching
if (import.meta.env.PROD) {
  ServiceWorkerManager.getInstance().register();
}

createRoot(document.getElementById("root")!).render(<App />);
