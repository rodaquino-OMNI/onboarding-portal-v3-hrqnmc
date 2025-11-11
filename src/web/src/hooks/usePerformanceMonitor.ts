/**
 * Local performance monitoring hook to replace @performance-monitor/react
 */
import { useEffect, useCallback } from 'react';

export const usePerformanceMonitor = (componentName?: string) => {
  const startMeasure = useCallback((measureName: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${measureName}-start`);
    }
  }, []);

  const endMeasure = useCallback((measureName: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${measureName}-end`);
      try {
        performance.measure(
          measureName,
          `${measureName}-start`,
          `${measureName}-end`
        );
      } catch (error) {
        console.debug('Performance measure error:', error);
      }
    }
  }, []);

  const recordMetric = useCallback((metricName: string, value: number) => {
    console.debug(`[PERF] ${metricName}:`, value);
  }, []);

  useEffect(() => {
    if (componentName) {
      startMeasure(componentName);
      return () => {
        endMeasure(componentName);
      };
    }
  }, [componentName, startMeasure, endMeasure]);

  return {
    startMeasure,
    endMeasure,
    recordMetric,
  };
};
