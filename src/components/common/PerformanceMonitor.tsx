import { useEffect } from 'react';

interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
}

export const PerformanceMonitor = () => {
  useEffect(() => {
    const metrics: PerformanceMetrics = {};

    // First Contentful Paint
    const observeFCP = () => {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.fcp = entry.startTime;
          }
        }
      }).observe({ entryTypes: ['paint'] });
    };

    // Largest Contentful Paint
    const observeLCP = () => {
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.lcp = lastEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    };

    // First Input Delay
    const observeFID = () => {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          metrics.fid = entry.processingStart - entry.startTime;
        }
      }).observe({ entryTypes: ['first-input'] });
    };

    // Cumulative Layout Shift
    const observeCLS = () => {
      let clsValue = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        metrics.cls = clsValue;
      }).observe({ entryTypes: ['layout-shift'] });
    };

    // Time to First Byte
    const observeTTFB = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.ttfb = navigation.responseStart - navigation.requestStart;
      }
    };

    // Initialize observers
    if ('PerformanceObserver' in window) {
      observeFCP();
      observeLCP();
      observeFID();
      observeCLS();
    }
    observeTTFB();

    // Report metrics after page load
    const reportMetrics = () => {
      setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Performance Metrics:', metrics);
        }
        
        // Send to analytics in production
        if (process.env.NODE_ENV === 'production' && window.gtag) {
          Object.entries(metrics).forEach(([key, value]) => {
            if (value !== undefined) {
              window.gtag('event', 'performance_metric', {
                metric_name: key,
                metric_value: Math.round(value),
                custom_parameter: 'web_vitals'
              });
            }
          });
        }
      }, 1000);
    };

    window.addEventListener('load', reportMetrics);

    return () => {
      window.removeEventListener('load', reportMetrics);
    };
  }, []);

  return null;
};