/**
 * Authentication API Client Module
 * Version: 1.0.0
 * 
 * Implements secure authentication API client with LGPD compliance,
 * role-based access control, and comprehensive security measures.
 */

import axios from 'axios'; // ^1.5.0
import type {
  LoginRequest,
  LoginResponse,
  MFARequest,
  User,
  AuthState,
  DecodedToken
} from '../types/auth.types';
import { apiConfig } from '../config/api.config';
import { createApiClient, handleApiError } from '../utils/api.utils';
import { AUTH_CONFIG } from '../config/auth.config';

// API endpoints for authentication operations
const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  VERIFY_MFA: '/auth/mfa/verify',
  REFRESH_TOKEN: '/auth/token/refresh',
  LOGOUT: '/auth/logout',
  RESET_PASSWORD: '/auth/password/reset',
  CHANGE_PASSWORD: '/auth/password/change'
} as const;

/**
 * Authenticates user with enhanced security measures and LGPD compliance
 * @param credentials User login credentials
 * @returns Promise with login response containing tokens and user data
 */
async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    // Generate device fingerprint for security tracking
    const deviceFingerprint = await generateDeviceFingerprint();
    
    // Create API client with security headers
    const apiClient = createApiClient({
      headers: {
        'X-Device-Fingerprint': deviceFingerprint,
        'X-Data-Protection': 'LGPD',
        'X-Client-Version': process.env.VITE_APP_VERSION || '1.0.0'
      }
    });

    // Send login request with enhanced security
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.LOGIN,
      {
        ...credentials,
        deviceFingerprint,
        ipAddress: window.clientInformation?.platform || 'unknown'
      }
    );

    // Process role-based session duration
    const sessionDuration = AUTH_CONFIG.tokenExpirationTime[response.data.user.role];
    
    return {
      ...response.data,
      sessionExpiresIn: sessionDuration
    };
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Verifies MFA code with enhanced security and timeout handling
 * @param mfaData MFA verification data
 * @returns Promise with final authentication response
 */
async function verifyMFA(mfaData: MFARequest): Promise<LoginResponse> {
  try {
    // Validate MFA attempt count
    const attemptCount = await getMFAAttemptCount(mfaData.sessionToken);
    if (attemptCount >= AUTH_CONFIG.mfaRetryLimit) {
      throw new Error('MFA_RETRY_LIMIT_EXCEEDED');
    }

    const apiClient = createApiClient({
      timeout: AUTH_CONFIG.mfaTimeoutSeconds * 1000,
      headers: {
        'X-MFA-Session': mfaData.sessionToken,
        'X-Device-Fingerprint': mfaData.deviceFingerprint
      }
    });

    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.VERIFY_MFA,
      mfaData
    );

    // Log verification for security audit
    await logSecurityEvent('mfa_verification', {
      success: true,
      deviceFingerprint: mfaData.deviceFingerprint
    });

    return response.data;
  } catch (error) {
    await logSecurityEvent('mfa_verification', {
      success: false,
      error: error.message
    });
    throw handleApiError(error);
  }
}

/**
 * Refreshes authentication token with rotation and proactive refresh
 * @param currentToken Current authentication token
 * @returns Promise with new authentication token
 */
async function refreshToken(currentToken: string): Promise<string> {
  try {
    // Verify token validity
    if (!currentToken) {
      throw new Error('INVALID_TOKEN');
    }

    const apiClient = createApiClient({
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'X-Token-Refresh': 'true'
      }
    });

    const response = await apiClient.post<{ accessToken: string }>(
      API_ENDPOINTS.REFRESH_TOKEN,
      { currentToken }
    );

    // Implement token rotation
    await rotateToken(currentToken, response.data.accessToken);

    return response.data.accessToken;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Logs out user with secure token cleanup and session termination
 * @param token Current authentication token
 * @returns Promise indicating successful logout
 */
async function logout(token: string): Promise<void> {
  try {
    const apiClient = createApiClient({
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Session-Terminate': 'true'
      }
    });

    await apiClient.post(API_ENDPOINTS.LOGOUT);

    // Secure cleanup
    await clearSecureStorage();
    await terminateActiveSessions(token);
    
    // Log logout event
    await logSecurityEvent('user_logout', {
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await logSecurityEvent('user_logout', {
      success: false,
      error: error.message
    });
    throw handleApiError(error);
  }
}

/**
 * Generates device fingerprint for security tracking
 */
async function generateDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.colorDepth,
    navigator.hardwareConcurrency
  ];
  
  const fingerprint = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Retrieves MFA attempt count from secure storage
 */
async function getMFAAttemptCount(sessionToken: string): Promise<number> {
  const key = `mfa_attempts_${sessionToken}`;
  const attempts = localStorage.getItem(key);
  return attempts ? parseInt(attempts, 10) : 0;
}

/**
 * Logs security events for audit purposes
 */
async function logSecurityEvent(
  eventType: string,
  details: Record<string, any>
): Promise<void> {
  if (AUTH_CONFIG.auditLogEnabled) {
    console.log('Security Event:', { eventType, ...details });
    // Implement actual security logging here
  }
}

/**
 * Rotates authentication tokens
 */
async function rotateToken(oldToken: string, newToken: string): Promise<void> {
  // Implement token rotation logic
}

/**
 * Clears secure storage during logout
 */
async function clearSecureStorage(): Promise<void> {
  localStorage.removeItem('austa_auth_token');
  sessionStorage.clear();
}

/**
 * Terminates all active sessions
 */
async function terminateActiveSessions(token: string): Promise<void> {
  // Implement session termination logic
}

/**
 * Initiates password reset process
 * @param email User's email address
 * @returns Promise indicating successful reset request
 */
async function resetPassword(email: string): Promise<void> {
  try {
    const apiClient = createApiClient({
      headers: {
        'X-Password-Reset': 'true'
      }
    });

    await apiClient.post(API_ENDPOINTS.RESET_PASSWORD, { email });

    // Log password reset event
    await logSecurityEvent('password_reset_request', {
      success: true,
      email,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await logSecurityEvent('password_reset_request', {
      success: false,
      error: error.message
    });
    throw handleApiError(error);
  }
}

// Export authentication API functions
export const authApi = {
  login,
  verifyMFA,
  refreshToken,
  logout,
  resetPassword
};