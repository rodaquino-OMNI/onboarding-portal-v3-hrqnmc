import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthContext } from '../../contexts/AuthContext';

// Mock context value
const mockContextValue = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    role: 'BENEFICIARY',
    name: 'Test User',
    permissions: [],
    mfaEnabled: false,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  isAuthenticated: true,
  isLoading: false,
  requiresMFA: false,
  mfaType: null,
  retryCount: 0,
  refreshToken: 'mock-refresh-token',
  userRole: 'BENEFICIARY' as any,
  securityContext: {
    sessionId: 'session-123',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    lastActivity: new Date(),
    createdAt: new Date()
  },
  deviceInfo: {
    fingerprint: 'device-fingerprint',
    userAgent: 'test-agent',
    platform: 'test',
    screenResolution: '1920x1080',
    timezone: 'UTC',
    language: 'en-US'
  },
  sessionExpiry: new Date(Date.now() + 3600000),
  login: jest.fn(),
  logout: jest.fn(),
  verifyMFA: jest.fn(),
  refreshSession: jest.fn(),
  resetPassword: jest.fn(),
  checkResetAttempts: jest.fn(),
  checkSessionTimeout: jest.fn(),
  checkPermission: jest.fn(),
  checkRole: jest.fn(),
  validateAdminRole: jest.fn(),
  getCurrentUser: jest.fn(),
  validateAdminAccess: jest.fn(),
  validateDevice: jest.fn(),
  register: jest.fn(),
  setupMFA: jest.fn(),
  updateUserStatus: jest.fn()
};

// Create wrapper component
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthContext.Provider, { value: mockContextValue }, children);

describe('useAuth Hook', () => {
  it('should return auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
    expect(result.current.user?.email).toBe('test@example.com');
  });

  it('should have login function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.login).toBe('function');
  });

  it('should have logout function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.logout).toBe('function');
  });

  it('should have verifyMFA function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.verifyMFA).toBe('function');
  });

  it('should have refreshToken function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.refreshSession).toBe('function');
  });

  it('should indicate authenticated state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should not be in loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it('should provide user information', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeDefined();
    expect(result.current.user?.id).toBe('user-123');
    expect(result.current.user?.email).toBe('test@example.com');
    expect(result.current.user?.role).toBe('BENEFICIARY');
  });
});
