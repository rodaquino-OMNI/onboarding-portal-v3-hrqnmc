import React from 'react';

const mockNotificationContext = {
  showNotification: jest.fn().mockReturnValue('mock-notification-id'),
  removeNotification: jest.fn(),
  clearAll: jest.fn(),
  notifications: [],
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-notification-provider">{children}</div>;
};

export const useNotificationContext = jest.fn(() => mockNotificationContext);

export default {
  NotificationProvider,
  useNotificationContext,
};
