import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import Toast, { ToastProps } from '../components/common/Toast';
import { THEME } from '../constants/app.constants';

// Constants
const DEFAULT_DURATION = 5000;
const DEFAULT_POSITION = 'top-right';
const MAX_NOTIFICATIONS = 3;
const ANIMATION_DURATION = 300;

// Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationConfig extends Partial<Omit<ToastProps, 'message' | 'onClose'>> {
  duration?: number | null;
  preserveOnRouteChange?: boolean;
  preventDuplicates?: boolean;
  groupSimilar?: boolean;
}

interface Notification extends Required<NotificationConfig> {
  id: string;
  message: string;
  timestamp: number;
  isExiting?: boolean;
}

interface NotificationContextValue {
  showNotification: (message: string, config?: NotificationConfig) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  notifications: Notification[];
}

interface NotificationProviderProps {
  children: React.ReactNode;
  defaultConfig?: NotificationConfig;
}

// Context Creation
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Default configuration aligned with AUSTA's design system
const defaultNotificationConfig: Required<NotificationConfig> = {
  severity: 'info',
  duration: DEFAULT_DURATION,
  position: DEFAULT_POSITION as ToastProps['position'],
  preserveOnRouteChange: false,
  preventDuplicates: true,
  groupSimilar: true,
  isRTL: false,
  zIndex: THEME.Z_INDEX.TOOLTIP,
  id: undefined as any,
  role: 'alert',
  style: undefined,
  'aria-live': 'polite',
  'aria-atomic': false,
  'data-testid': undefined,
  tabIndex: 0,
};

// Custom hook for accessing notification context
export const useNotificationContext = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

// Provider Component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  defaultConfig = {},
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationQueue = useRef<Notification[]>([]);
  const activeTimeouts = useRef<Map<string, number>>(new Map());

  // Process notification queue
  const processQueue = useCallback(() => {
    if (notifications.length < MAX_NOTIFICATIONS && notificationQueue.current.length > 0) {
      const nextNotification = notificationQueue.current.shift();
      if (nextNotification) {
        setNotifications(prev => [...prev, nextNotification]);
      }
    }
  }, [notifications.length]);

  // Remove notification with cleanup
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (!notification) return prev;

      // Clear any existing timeout
      const timeoutId = activeTimeouts.current.get(id);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        activeTimeouts.current.delete(id);
      }

      // Mark notification for exit animation
      return prev.map(n => 
        n.id === id ? { ...n, isExiting: true } : n
      );
    });

    // Remove notification after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      processQueue();
    }, ANIMATION_DURATION);
  }, [processQueue]);

  // Show notification with enhanced features
  const showNotification = useCallback((message: string, config: NotificationConfig = {}) => {
    if (!message.trim()) {
      console.warn('Notification message cannot be empty');
      return '';
    }

    const id = uuidv4();
    const notification: Notification = {
      ...defaultNotificationConfig,
      ...defaultConfig,
      ...config,
      id,
      message,
      timestamp: Date.now(),
    };

    // Check for duplicates if enabled
    if (notification.preventDuplicates) {
      const isDuplicate = [...notifications, ...notificationQueue.current].some(
        n => n.message === message && n.severity === notification.severity
      );
      if (isDuplicate) return '';
    }

    // Group similar notifications if enabled
    if (notification.groupSimilar) {
      const similar = notifications.find(
        n => n.message === message && n.severity === notification.severity
      );
      if (similar) {
        removeNotification(similar.id);
      }
    }

    // Add to queue or show immediately
    if (notifications.length >= MAX_NOTIFICATIONS) {
      notificationQueue.current.push(notification);
    } else {
      setNotifications(prev => [...prev, notification]);
    }

    // Set up auto-dismiss
    if (notification.duration) {
      const timeoutId = window.setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
      activeTimeouts.current.set(id, timeoutId);
    }

    return id;
  }, [notifications, defaultConfig, removeNotification]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    notifications.forEach(n => removeNotification(n.id));
    notificationQueue.current = [];
  }, [notifications, removeNotification]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      activeTimeouts.current.forEach(timeoutId => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  // Route change handler
  useEffect(() => {
    const handleRouteChange = () => {
      notifications
        .filter(n => !n.preserveOnRouteChange)
        .forEach(n => removeNotification(n.id));
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [notifications, removeNotification]);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        removeNotification,
        clearAll,
        notifications,
      }}
    >
      {children}
      <div
        role="region"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          zIndex: THEME.Z_INDEX.TOOLTIP,
          pointerEvents: 'none',
        }}
      >
        {notifications.map(notification => (
          <Toast
            key={notification.id}
            message={notification.message}
            severity={notification.severity}
            duration={notification.duration || undefined}
            position={notification.position}
            isRTL={notification.isRTL}
            zIndex={notification.zIndex}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};