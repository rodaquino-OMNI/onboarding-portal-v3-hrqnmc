import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      role: 'BENEFICIARY',
    },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    verifyMFA: jest.fn(),
    refreshToken: jest.fn(),
  }),
}));

describe('useAuth Hook', () => {
  it('should return auth context', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
    expect(result.current.user?.email).toBe('test@example.com');
  });

  it('should have login function', () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.login).toBe('function');
  });

  it('should have logout function', () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.logout).toBe('function');
  });

  it('should have verifyMFA function', () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.verifyMFA).toBe('function');
  });

  it('should have refreshToken function', () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.refreshToken).toBe('function');
  });

  it('should indicate authenticated state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should not be in loading state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  it('should provide user information', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeDefined();
    expect(result.current.user?.id).toBe('user-123');
    expect(result.current.user?.email).toBe('test@example.com');
    expect(result.current.user?.role).toBe('BENEFICIARY');
  });
});
