/**
 * Authentication Context Provider
 * Version: 1.0.0
 * 
 * Implements secure authentication state management with role-based access control,
 * MFA verification, and LGPD compliance for the Pre-paid Health Plan Onboarding Portal.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'; // ^18.2.0
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // ^3.4.0
import { validateSecurityContext } from '@auth0/security-utils'; // ^1.0.0

import { AuthState, LoginRequest, User, UserRole, SecurityContext, DeviceInfo } from '../types/auth.types';
import { authService } from '../services/auth.service';
import { setSecureItem, getSecureItem, removeItem } from '../utils/storage.utils';

// Session duration constants based on user roles (in milliseconds)
const SESSION_DURATION = {
  ADMIN: 4 * 60 * 60 * 1000,      // 4 hours
  BROKER: 8 * 60 * 60 * 1000,     // 8 hours
  BENEFICIARY: 30 * 60 * 1000     // 30 minutes
};

// Security settings for authentication
const SECURITY_SETTINGS = {
  TOKEN_REFRESH_INTERVAL: 5 * 60 * 1000,  // 5 minutes
  MFA_TIMEOUT: 5 * 60 * 1000,            // 5 minutes
  MAX_RETRY_ATTEMPTS: 3,
  SECURITY_CHECK_INTERVAL: 60 * 1000      // 1 minute
};

// Interface for authentication context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresMFA: boolean;
  securityContext: SecurityContext;
  deviceInfo: DeviceInfo;
  sessionExpiry: Date | null;
  login: (credentials: LoginRequest) => Promise<void>;
  verifyMFA: (code: string, deviceInfo: DeviceInfo) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Create authentication context
const AuthContext = createContext<AuthContextType | null>(null);

// Initialize FingerprintJS instance
const fpPromise = FingerprintJS.load();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State management
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    accessToken: null,
    refreshToken: null,
    requiresMFA: false,
    error: null,
    isSessionExpired: false,
    sessionExpiresAt: 0
  });

  const [securityContext, setSecurityContext] = useState<SecurityContext>({
    deviceId: '',
    sessionId: '',
    timestamp: Date.now()
  });

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    fingerprint: '',
    userAgent: navigator.userAgent,
    platform: navigator.platform
  });

  // Refs for intervals
  const refreshTokenInterval = useRef<NodeJS.Timeout>();
  const securityCheckInterval = useRef<NodeJS.Timeout>();

  // Initialize device fingerprint
  useEffect(() => {
    const initializeFingerprint = async () => {
      const fp = await fpPromise;
      const result = await fp.get();
      setDeviceInfo(prev => ({
        ...prev,
        fingerprint: result.visitorId
      }));
    };

    initializeFingerprint();
  }, []);

  // Initialize authentication state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedAuth = await getSecureItem<AuthState>('auth_state', { type: 'session' });
      const storedContext = await getSecureItem<SecurityContext>('security_context', { type: 'session' });

      if (storedAuth.success && storedAuth.data && storedContext.success && storedContext.data) {
        const isContextValid = await validateSecurityContext(storedContext.data);
        if (isContextValid) {
          setAuthState(storedAuth.data);
          setSecurityContext(storedContext.data);
        } else {
          await logout();
        }
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
    };

    initializeAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (authState.isAuthenticated && authState.accessToken) {
      refreshTokenInterval.current = setInterval(
        refreshSession,
        SECURITY_SETTINGS.TOKEN_REFRESH_INTERVAL
      );
    }

    return () => {
      if (refreshTokenInterval.current) {
        clearInterval(refreshTokenInterval.current);
      }
    };
  }, [authState.isAuthenticated, authState.accessToken]);

  // Set up security check interval
  useEffect(() => {
    if (authState.isAuthenticated) {
      securityCheckInterval.current = setInterval(
        validateSession,
        SECURITY_SETTINGS.SECURITY_CHECK_INTERVAL
      );
    }

    return () => {
      if (securityCheckInterval.current) {
        clearInterval(securityCheckInterval.current);
      }
    };
  }, [authState.isAuthenticated]);

  // Login handler
  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      const loginResult = await authService.login({
        ...credentials,
        deviceFingerprint: deviceInfo.fingerprint,
        ipAddress: window.location.hostname
      });

      setAuthState(loginResult);

      if (loginResult.isAuthenticated) {
        await setSecureItem('auth_state', loginResult, { type: 'session' });
        await setSecureItem('security_context', securityContext, { type: 'session' });
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error as Error,
        isAuthenticated: false,
        isLoading: false
      }));
    }
  };

  // MFA verification handler
  const verifyMFA = async (code: string, deviceInfo: DeviceInfo): Promise<void> => {
    try {
      const verificationResult = await authService.verifyMFA(code, {
        ...securityContext,
        deviceId: deviceInfo.fingerprint
      });

      setAuthState(verificationResult);

      if (verificationResult.isAuthenticated) {
        await setSecureItem('auth_state', verificationResult, { type: 'session' });
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error as Error,
        requiresMFA: true
      }));
    }
  };

  // Logout handler
  const logout = async (): Promise<void> => {
    try {
      if (authState.accessToken) {
        await authService.logout();
      }

      await removeItem('auth_state', { type: 'session' });
      await removeItem('security_context', { type: 'session' });

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        accessToken: null,
        refreshToken: null,
        requiresMFA: false,
        error: null,
        isSessionExpired: false,
        sessionExpiresAt: 0
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Session refresh handler
  const refreshSession = async (): Promise<void> => {
    if (!authState.accessToken) return;

    try {
      const newToken = await authService.refreshToken(authState.accessToken);
      if (newToken) {
        setAuthState(prev => ({
          ...prev,
          accessToken: newToken,
          isSessionExpired: false
        }));
        await setSecureItem('auth_state', authState, { type: 'session' });
      }
    } catch (error) {
      await logout();
    }
  };

  // Session validation handler
  const validateSession = useCallback(async () => {
    if (!authState.isAuthenticated) return;

    const isExpired = authState.sessionExpiresAt < Date.now();
    if (isExpired) {
      await logout();
      return;
    }

    const isContextValid = await validateSecurityContext(securityContext);
    if (!isContextValid) {
      await logout();
    }
  }, [authState.isAuthenticated, authState.sessionExpiresAt, securityContext]);

  const contextValue: AuthContextType = {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    requiresMFA: authState.requiresMFA,
    securityContext,
    deviceInfo,
    sessionExpiry: authState.sessionExpiresAt ? new Date(authState.sessionExpiresAt) : null,
    login,
    verifyMFA,
    logout,
    refreshSession
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};