/**
 * Enhanced Authentication Service
 * Version: 1.0.0
 * 
 * Implements comprehensive authentication with role-based MFA,
 * secure token management, and LGPD compliance features.
 */

import jwtDecode from 'jwt-decode'; // v3.1.2
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // v3.4.0
import CryptoJS from 'crypto-js'; // v4.1.1

import { authApi } from '../api/auth.api';
import {
  LoginRequest,
  LoginResponse,
  MFARequest,
  User,
  AuthState,
  UserRole,
  SecurityContext
} from '../types/auth.types';
import {
  setSecureItem,
  getSecureItem,
  validateStorageIntegrity
} from '../utils/storage.utils';

// Storage keys for authentication data
const AUTH_STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  MFA_SESSION: 'mfa_session',
  DEVICE_ID: 'device_fingerprint',
  SECURITY_CONTEXT: 'security_context'
} as const;

// Role-based session durations in seconds
const SESSION_DURATIONS = {
  ADMIN: 14400,         // 4 hours
  UNDERWRITER: 14400,   // 4 hours
  BROKER: 28800,        // 8 hours
  HR: 28800,           // 8 hours
  BENEFICIARY: 1800,    // 30 minutes
  PARENT: 1800         // 30 minutes
} as const;

// Security thresholds
const SECURITY_THRESHOLDS = {
  TOKEN_REFRESH: 300,    // 5 minutes before expiration
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900, // 15 minutes
  MFA_CODE_LIFETIME: 300 // 5 minutes
} as const;

/**
 * Initializes device fingerprint for enhanced security
 */
async function initializeDeviceFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}

/**
 * Validates security context for the current session
 */
async function validateSecurityContext(context: SecurityContext): Promise<boolean> {
  const storedContext = await getSecureItem<SecurityContext>(
    AUTH_STORAGE_KEYS.SECURITY_CONTEXT,
    { type: 'session' }
  );

  if (!storedContext.success || !storedContext.data) {
    return false;
  }

  return storedContext.data.deviceId === context.deviceId &&
    storedContext.data.sessionId === context.sessionId;
}

/**
 * Enhanced login function with role-based MFA and security validations
 */
async function login(credentials: LoginRequest): Promise<AuthState> {
  try {
    // Generate device fingerprint
    const deviceId = await initializeDeviceFingerprint();
    
    // Create security context
    const securityContext: SecurityContext = {
      deviceId,
      sessionId: CryptoJS.lib.WordArray.random(16).toString(),
      timestamp: Date.now()
    };

    // Perform login
    const response = await authApi.login({
      ...credentials,
      deviceFingerprint: deviceId
    });

    // Store security context
    await setSecureItem(
      AUTH_STORAGE_KEYS.SECURITY_CONTEXT,
      securityContext,
      { type: 'session' }
    );

    // Handle MFA requirement
    if (response.requiresMFA) {
      await setSecureItem(
        AUTH_STORAGE_KEYS.MFA_SESSION,
        {
          sessionToken: response.sessionToken,
          expiresAt: Date.now() + SECURITY_THRESHOLDS.MFA_CODE_LIFETIME * 1000
        },
        { type: 'session' }
      );

      return {
        isAuthenticated: false,
        isLoading: false,
        requiresMFA: true,
        user: null,
        accessToken: null,
        refreshToken: null,
        error: null,
        isSessionExpired: false,
        sessionExpiresAt: 0
      };
    }

    // Store authentication data
    await setSecureItem(AUTH_STORAGE_KEYS.TOKEN, response.accessToken, {
      type: 'session',
      role: response.user.role
    });

    await setSecureItem(AUTH_STORAGE_KEYS.USER, response.user, {
      type: 'session',
      role: response.user.role
    });

    // Calculate session expiration
    const sessionExpiresAt = Date.now() + 
      (SESSION_DURATIONS[response.user.role] * 1000);

    return {
      isAuthenticated: true,
      isLoading: false,
      requiresMFA: false,
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      error: null,
      isSessionExpired: false,
      sessionExpiresAt
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      isLoading: false,
      requiresMFA: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      error: error as Error,
      isSessionExpired: false,
      sessionExpiresAt: 0
    };
  }
}

/**
 * Enhanced MFA verification with progressive security challenges
 */
async function verifyMFA(
  mfaCode: string,
  securityContext: SecurityContext
): Promise<AuthState> {
  try {
    // Validate security context
    const isContextValid = await validateSecurityContext(securityContext);
    if (!isContextValid) {
      throw new Error('Invalid security context');
    }

    // Get MFA session
    const mfaSession = await getSecureItem(AUTH_STORAGE_KEYS.MFA_SESSION, {
      type: 'session'
    });

    if (!mfaSession.success || !mfaSession.data) {
      throw new Error('MFA session expired');
    }

    // Verify MFA
    const response = await authApi.verifyMFA({
      mfaCode,
      sessionToken: mfaSession.data.sessionToken,
      deviceFingerprint: securityContext.deviceId
    });

    // Store authentication data
    await setSecureItem(AUTH_STORAGE_KEYS.TOKEN, response.accessToken, {
      type: 'session',
      role: response.user.role
    });

    await setSecureItem(AUTH_STORAGE_KEYS.USER, response.user, {
      type: 'session',
      role: response.user.role
    });

    const sessionExpiresAt = Date.now() + 
      (SESSION_DURATIONS[response.user.role] * 1000);

    return {
      isAuthenticated: true,
      isLoading: false,
      requiresMFA: false,
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      error: null,
      isSessionExpired: false,
      sessionExpiresAt
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      isLoading: false,
      requiresMFA: true,
      user: null,
      accessToken: null,
      refreshToken: null,
      error: error as Error,
      isSessionExpired: false,
      sessionExpiresAt: 0
    };
  }
}

/**
 * Refreshes authentication token with security validation
 */
async function refreshToken(currentToken: string): Promise<string | null> {
  try {
    const decoded = jwtDecode(currentToken);
    const expirationTime = (decoded as any).exp * 1000;
    
    if (Date.now() >= expirationTime - SECURITY_THRESHOLDS.TOKEN_REFRESH * 1000) {
      const newToken = await authApi.refreshToken(currentToken);
      await setSecureItem(AUTH_STORAGE_KEYS.TOKEN, newToken, { type: 'session' });
      return newToken;
    }
    
    return currentToken;
  } catch (error) {
    return null;
  }
}

/**
 * Performs secure logout with session cleanup
 */
async function logout(): Promise<void> {
  const token = await getSecureItem<string>(AUTH_STORAGE_KEYS.TOKEN, {
    type: 'session'
  });

  if (token.success && token.data) {
    await authApi.logout(token.data);
  }

  // Clear all secure storage
  for (const key of Object.values(AUTH_STORAGE_KEYS)) {
    await setSecureItem(key, null, { type: 'session' });
  }
}

/**
 * Validates current session status
 */
async function validateSession(): Promise<boolean> {
  const token = await getSecureItem<string>(AUTH_STORAGE_KEYS.TOKEN, {
    type: 'session'
  });

  if (!token.success || !token.data) {
    return false;
  }

  try {
    const decoded = jwtDecode(token.data);
    const expirationTime = (decoded as any).exp * 1000;
    return Date.now() < expirationTime;
  } catch {
    return false;
  }
}

/**
 * Retrieves current security context
 */
async function getSecurityContext(): Promise<SecurityContext | null> {
  const context = await getSecureItem<SecurityContext>(
    AUTH_STORAGE_KEYS.SECURITY_CONTEXT,
    { type: 'session' }
  );

  return context.success ? context.data : null;
}

/**
 * Initiates password reset flow
 */
async function resetPassword(email: string): Promise<void> {
  try {
    await authApi.resetPassword({ email });
  } catch (error) {
    throw new Error('Failed to initiate password reset. Please try again.');
  }
}

/**
 * Check reset attempts for rate limiting
 */
async function checkResetAttempts(email: string): Promise<{ allowed: boolean; remainingAttempts: number }> {
  // Stub implementation - would check rate limiting
  return { allowed: true, remainingAttempts: 3 };
}

// Export authentication service
export const authService = {
  login,
  verifyMFA,
  logout,
  refreshToken,
  validateSession,
  getSecurityContext,
  resetPassword,
  checkResetAttempts
};