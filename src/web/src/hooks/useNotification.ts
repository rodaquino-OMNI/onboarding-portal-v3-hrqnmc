import { useCallback } from 'react'; // v18.0.0
import { useNotificationContext, NotificationConfig } from '../contexts/NotificationContext';
import { THEME, ACCESSIBILITY } from '../constants/app.constants';

// Default configurations aligned with AUSTA's design system
const DEFAULT_SUCCESS_CONFIG: NotificationConfig = {
  severity: 'success',
  duration: 5000,
  position: 'top-right',
  ariaLive: 'polite',
  role: 'status',
  rtl: false,
  zIndex: THEME.Z_INDEX.TOOLTIP,
  preserveOnRouteChange: false,
  preventDuplicates: true,
  groupSimilar: true,
};

const DEFAULT_ERROR_CONFIG: NotificationConfig = {
  severity: 'error',
  duration: 0, // Errors require manual dismissal
  position: 'top-right',
  ariaLive: 'assertive',
  role: 'alert',
  rtl: false,
  zIndex: THEME.Z_INDEX.TOOLTIP,
  preserveOnRouteChange: true,
  preventDuplicates: false,
  groupSimilar: false,
};

const DEFAULT_WARNING_CONFIG: NotificationConfig = {
  severity: 'warning',
  duration: 7000,
  position: 'top-right',
  ariaLive: 'polite',
  role: 'alert',
  rtl: false,
  zIndex: THEME.Z_INDEX.TOOLTIP,
  preserveOnRouteChange: true,
  preventDuplicates: true,
  groupSimilar: true,
};

const DEFAULT_INFO_CONFIG: NotificationConfig = {
  severity: 'info',
  duration: 5000,
  position: 'top-right',
  ariaLive: 'polite',
  role: 'status',
  rtl: false,
  zIndex: THEME.Z_INDEX.TOOLTIP,
  preserveOnRouteChange: false,
  preventDuplicates: true,
  groupSimilar: true,
};

/**
 * Custom hook for managing application-wide notifications with accessibility support
 * @returns Object containing notification utility functions
 */
export const useNotification = () => {
  const { showNotification, removeNotification, clearAll, notifications } = useNotificationContext();

  /**
   * Shows a success notification with accessibility support
   * @param message - The notification message
   * @param config - Optional configuration overrides
   * @returns The notification ID
   */
  const showSuccess = useCallback((message: string, config?: Partial<NotificationConfig>): string => {
    if (!message?.trim()) {
      console.warn('Success notification message cannot be empty');
      return '';
    }

    return showNotification(message, {
      ...DEFAULT_SUCCESS_CONFIG,
      ...config,
      style: {
        ...ACCESSIBILITY.SCREEN_READER_ONLY,
        position: 'static',
        width: 'auto',
        height: 'auto',
        clip: 'auto',
      },
    });
  }, [showNotification]);

  /**
   * Shows an error notification with enhanced accessibility
   * @param message - The error message
   * @param config - Optional configuration overrides
   * @returns The notification ID
   */
  const showError = useCallback((message: string, config?: Partial<NotificationConfig>): string => {
    if (!message?.trim()) {
      console.error('Error notification message cannot be empty');
      return '';
    }

    return showNotification(message, {
      ...DEFAULT_ERROR_CONFIG,
      ...config,
      style: {
        ...ACCESSIBILITY.SCREEN_READER_ONLY,
        position: 'static',
        width: 'auto',
        height: 'auto',
        clip: 'auto',
      },
    });
  }, [showNotification]);

  /**
   * Shows a warning notification with accessibility support
   * @param message - The warning message
   * @param config - Optional configuration overrides
   * @returns The notification ID
   */
  const showWarning = useCallback((message: string, config?: Partial<NotificationConfig>): string => {
    if (!message?.trim()) {
      console.warn('Warning notification message cannot be empty');
      return '';
    }

    return showNotification(message, {
      ...DEFAULT_WARNING_CONFIG,
      ...config,
      style: {
        ...ACCESSIBILITY.SCREEN_READER_ONLY,
        position: 'static',
        width: 'auto',
        height: 'auto',
        clip: 'auto',
      },
    });
  }, [showNotification]);

  /**
   * Shows an info notification with accessibility support
   * @param message - The info message
   * @param config - Optional configuration overrides
   * @returns The notification ID
   */
  const showInfo = useCallback((message: string, config?: Partial<NotificationConfig>): string => {
    if (!message?.trim()) {
      console.warn('Info notification message cannot be empty');
      return '';
    }

    return showNotification(message, {
      ...DEFAULT_INFO_CONFIG,
      ...config,
      style: {
        ...ACCESSIBILITY.SCREEN_READER_ONLY,
        position: 'static',
        width: 'auto',
        height: 'auto',
        clip: 'auto',
      },
    });
  }, [showNotification]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAll,
    notifications,
  };
};

export type { NotificationConfig };