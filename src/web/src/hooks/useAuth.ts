/**
 * Enhanced Authentication Hook
 * Version: 1.0.0
 * 
 * Provides secure authentication state management with role-based access control,
 * multi-factor authentication, and LGPD compliance features.
 */

import { useContext, useCallback, useEffect, useMemo } from 'react'; // ^18.0.0
import { AuthContext } from '../contexts/AuthContext';
import { 
  User, 
  AuthState, 
  LoginRequest, 
  SessionConfig,
  UserRole 
} from '../types/auth.types';

/**
 * Custom hook for managing authentication state and operations
 * Implements role-based authentication with MFA support and session management
 */
export function useAuth() {
  // Access authentication context
  const context = useContext(AuthContext);

  // Validate context availability
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const {
    user,
    isAuthenticated,
    isLoading,
    requiresMFA,
    mfaType,
    retryCount,
    refreshToken,
    userRole,
    securityContext,
    deviceInfo,
    sessionExpiry,
    login: contextLogin,
    verifyMFA: contextVerifyMFA,
    logout: contextLogout,
    refreshSession: contextRefreshSession,
    resetPassword,
    checkResetAttempts,
    checkSessionTimeout,
    checkPermission,
    checkRole,
    validateAdminRole,
    getCurrentUser,
    validateAdminAccess,
    validateDevice,
    register,
    setupMFA,
    updateUserStatus
  } = context;

  /**
   * Enhanced login handler with role-based validation and security tracking
   */
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      await contextLogin({
        ...credentials,
        deviceFingerprint: deviceInfo.fingerprint,
        ipAddress: window.location.hostname
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [contextLogin, deviceInfo.fingerprint]);

  /**
   * MFA verification with retry handling and security tracking
   */
  const verifyMFA = useCallback(async (code: string) => {
    try {
      await contextVerifyMFA(code, deviceInfo);
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  }, [contextVerifyMFA, deviceInfo]);

  /**
   * Secure logout with session cleanup
   */
  const logout = useCallback(async () => {
    try {
      await contextLogout();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, [contextLogout]);

  /**
   * Session refresh with token rotation
   */
  const refreshSession = useCallback(async () => {
    try {
      await contextRefreshSession();
    } catch (error) {
      console.error('Session refresh error:', error);
      await logout();
    }
  }, [contextRefreshSession, logout]);

  /**
   * Session validity check with inactivity monitoring
   */
  const checkSessionValidity = useCallback(() => {
    if (!isAuthenticated || !sessionExpiry) return false;
    return new Date() < sessionExpiry;
  }, [isAuthenticated, sessionExpiry]);

  /**
   * Determine if MFA is required based on user role
   */
  const getMFARequirement = useCallback((userRole?: UserRole) => {
    if (!userRole) return false;
    return [
      UserRole.ADMINISTRATOR,
      UserRole.UNDERWRITER,
      UserRole.BROKER,
      UserRole.HR_PERSONNEL
    ].includes(userRole);
  }, []);

  /**
   * Get MFA type based on user role
   */
  const getMFAType = useCallback((userRole?: UserRole) => {
    if (!userRole) return null;
    return [UserRole.ADMINISTRATOR, UserRole.UNDERWRITER].includes(userRole)
      ? 'hardware_token'
      : 'sms';
  }, []);

  /**
   * Monitor session expiration
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      if (!checkSessionValidity()) {
        logout();
      }
    };

    const sessionCheck = setInterval(checkSession, 60000); // Check every minute

    return () => {
      clearInterval(sessionCheck);
    };
  }, [isAuthenticated, checkSessionValidity, logout]);

  /**
   * Memoized authentication state and functions
   */
  const authState = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    requiresMFA,
    mfaType,
    retryCount,
    refreshToken,
    userRole,
    sessionExpiry,
    login,
    logout,
    verifyMFA,
    refreshSession,
    checkSessionValidity,
    resetPassword,
    checkResetAttempts,
    checkSessionTimeout,
    checkPermission,
    checkRole,
    validateAdminRole,
    getCurrentUser,
    validateAdminAccess,
    validateDevice,
    register,
    setupMFA,
    updateUserStatus,
    securityContext
  }), [
    user,
    isAuthenticated,
    isLoading,
    requiresMFA,
    mfaType,
    retryCount,
    refreshToken,
    userRole,
    sessionExpiry,
    login,
    logout,
    verifyMFA,
    refreshSession,
    checkSessionValidity,
    resetPassword,
    checkResetAttempts,
    checkSessionTimeout,
    checkPermission,
    checkRole,
    validateAdminRole,
    getCurrentUser,
    validateAdminAccess,
    validateDevice,
    register,
    setupMFA,
    updateUserStatus,
    securityContext
  ]);

  return authState;
}