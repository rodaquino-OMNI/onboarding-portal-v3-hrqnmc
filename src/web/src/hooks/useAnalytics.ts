/**
 * Local analytics hook to replace @austa/analytics
 */
import { useCallback } from 'react';

export const useAnalytics = () => {
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    console.log('[ANALYTICS]', eventName, properties);
  }, []);

  const trackPageView = useCallback((pageName: string, properties?: Record<string, any>) => {
    console.log('[ANALYTICS] Page View:', pageName, properties);
  }, []);

  const identifyUser = useCallback((userId: string, traits?: Record<string, any>) => {
    console.log('[ANALYTICS] Identify User:', userId, traits);
  }, []);

  return {
    trackEvent,
    trackPageView,
    identifyUser,
  };
};
