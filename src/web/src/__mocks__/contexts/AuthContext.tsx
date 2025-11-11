import React from 'react';

// Mock AuthContext
const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  requiresMFA: false,
  retryCount: 0,
  securityContext: {
    deviceId: 'mock-device-id',
    sessionId: 'mock-session-id',
    deviceFingerprint: 'mock-fingerprint',
    ipAddress: '127.0.0.1',
    userAgent: 'mock-user-agent',
    timestamp: new Date(),
  },
  deviceInfo: {
    fingerprint: 'mock-fingerprint',
    browser: 'Chrome',
    os: 'Linux',
    device: 'Desktop',
    isMobile: false,
    screenResolution: '1920x1080',
  },
  sessionExpiry: null,
  login: jest.fn().mockResolvedValue(undefined),
  verifyMFA: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
  refreshSession: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
  checkResetAttempts: jest.fn().mockResolvedValue(true),
  checkSessionTimeout: jest.fn().mockReturnValue(false),
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-auth-provider">{children}</div>;
};

export const useAuth = jest.fn(() => mockAuthContext);

export default {
  AuthProvider,
  useAuth,
};
