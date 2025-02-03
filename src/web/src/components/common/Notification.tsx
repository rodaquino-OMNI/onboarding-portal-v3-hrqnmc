import React, { useEffect, useCallback } from 'react';
import { captureException } from '@sentry/react'; // v7.0.0
import Toast, { ToastProps } from './Toast';
import { useNotificationContext } from '../../contexts/NotificationContext';

// Constants for notification configuration
const SEVERITY_MAP = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info'
} as const;

const ANIMATION_DURATION = 300;
const AUTO_FOCUS_DELAY = 100;

// Interface for component props
interface NotificationProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  onClose?: () => void;
  rtl?: boolean;
  locale?: 'pt-BR' | 'en';
  autoFocus?: boolean;
  role?: 'alert' | 'status';
}

/**
 * Custom hook to manage notification lifecycle including animations,
 * auto-dismiss, and focus management
 */
const useNotificationLifecycle = ({
  id,
  duration,
  autoFocus,
  onClose
}: Pick<NotificationProps, 'id' | 'duration' | 'autoFocus' | 'onClose'>) => {
  const { removeNotification } = useNotificationContext();
  
  useEffect(() => {
    let animationFrame: number;
    let dismissTimeout: number;
    let focusTimeout: number;
    const previousFocus = document.activeElement as HTMLElement;

    try {
      // Handle auto-focus
      if (autoFocus) {
        focusTimeout = window.setTimeout(() => {
          const notificationElement = document.getElementById(`notification-${id}`);
          if (notificationElement) {
            notificationElement.focus();
          }
        }, AUTO_FOCUS_DELAY);
      }

      // Set up auto-dismiss
      if (duration && duration > 0) {
        dismissTimeout = window.setTimeout(() => {
          animationFrame = requestAnimationFrame(() => {
            removeNotification(id);
          });
        }, duration);
      }

      return () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        if (dismissTimeout) clearTimeout(dismissTimeout);
        if (focusTimeout) clearTimeout(focusTimeout);
        
        // Return focus to previous element
        if (autoFocus && previousFocus && document.body.contains(previousFocus)) {
          previousFocus.focus();
        }
      };
    } catch (error) {
      captureException(error, {
        extra: {
          componentName: 'Notification',
          notificationId: id,
          lifecycle: 'useNotificationLifecycle'
        }
      });
    }
  }, [id, duration, autoFocus, removeNotification]);
};

/**
 * Notification component that renders a single notification using Toast
 * with enhanced accessibility and RTL support
 */
const Notification: React.FC<NotificationProps> = React.memo(({
  id,
  message,
  type = 'info',
  duration,
  position = 'top-right',
  onClose,
  rtl = false,
  locale = 'pt-BR',
  autoFocus = true,
  role = 'alert'
}) => {
  const { removeNotification } = useNotificationContext();

  // Handle notification close with analytics tracking
  const handleClose = useCallback(() => {
    try {
      removeNotification(id);
      onClose?.();
    } catch (error) {
      captureException(error, {
        extra: {
          componentName: 'Notification',
          notificationId: id,
          action: 'handleClose'
        }
      });
    }
  }, [id, removeNotification, onClose]);

  // Manage notification lifecycle
  useNotificationLifecycle({
    id,
    duration,
    autoFocus,
    onClose
  });

  // Map notification type to Toast severity
  const severity = SEVERITY_MAP[type];

  return (
    <Toast
      message={message}
      severity={severity}
      duration={duration}
      position={position}
      onClose={handleClose}
      isRTL={rtl}
      id={`notification-${id}`}
      role={role}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-testid={`notification-${type}`}
      tabIndex={0}
      style={{
        animation: `notification-${rtl ? 'rtl' : 'ltr'}-${position} ${ANIMATION_DURATION}ms ease-in-out`
      }}
    />
  );
});

// Display name for debugging
Notification.displayName = 'Notification';

export type { NotificationProps };
export default Notification;