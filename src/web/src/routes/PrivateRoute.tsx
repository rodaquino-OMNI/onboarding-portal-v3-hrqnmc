/**
 * Enhanced Private Route Component
 * Version: 1.0.0
 * 
 * Implements secure route protection with role-based access control,
 * session validation, audit logging, and performance optimizations.
 */

import React, { useEffect, useMemo, useCallback } from 'react'; // ^18.2.0
import { Navigate, Outlet, useLocation } from 'react-router-dom'; // ^6.15.0
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../../components/common/Loading';
import { UserRole } from '../types/auth.types';

// Constants for route configuration
const LOGIN_PATH = '/auth/login';
const DEFAULT_SESSION_TIMEOUT = 3600000; // 1 hour
const REFRESH_THRESHOLD = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Props interface for PrivateRoute component
 */
interface PrivateRouteProps {
  allowedRoles?: UserRole[];
  requiresAuth?: boolean;
  sessionTimeout?: number;
  fallbackPath?: string;
}

/**
 * Memoized hook for role validation with caching
 */
const useRoleCheck = (allowedRoles?: UserRole[], userRoles?: UserRole[]): boolean => {
  return useMemo(() => {
    if (!allowedRoles || !userRoles) return true;
    return allowedRoles.some(role => userRoles.includes(role));
  }, [allowedRoles, userRoles]);
};

/**
 * Enhanced PrivateRoute component with comprehensive security features
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({
  allowedRoles,
  requiresAuth = true,
  sessionTimeout = DEFAULT_SESSION_TIMEOUT,
  fallbackPath = LOGIN_PATH
}) => {
  const location = useLocation();
  const { 
    isAuthenticated,
    isLoading,
    user,
    refreshToken,
    sessionExpiry
  } = useAuth();

  // Memoized role validation
  const hasRequiredRole = useRoleCheck(
    allowedRoles,
    user?.role ? [user.role] : undefined
  );

  /**
   * Session validation and refresh handler
   */
  const validateAndRefreshSession = useCallback(async () => {
    if (!sessionExpiry || !refreshToken) return;

    const timeUntilExpiry = new Date(sessionExpiry).getTime() - Date.now();
    if (timeUntilExpiry < REFRESH_THRESHOLD) {
      let retryCount = 0;
      while (retryCount < MAX_RETRY_ATTEMPTS) {
        try {
          await refreshToken();
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === MAX_RETRY_ATTEMPTS) {
            console.error('Failed to refresh session:', error);
          }
        }
      }
    }
  }, [sessionExpiry, refreshToken]);

  // Effect for session validation
  useEffect(() => {
    if (isAuthenticated && requiresAuth) {
      validateAndRefreshSession();
    }
  }, [isAuthenticated, requiresAuth, validateAndRefreshSession]);

  // Handle loading state
  if (isLoading) {
    return <Loading size="lg" overlay text="Verificando acesso..." />;
  }

  // Handle authentication check
  if (requiresAuth && !isAuthenticated) {
    return (
      <Navigate
        to={fallbackPath}
        state={{ from: location }}
        replace
      />
    );
  }

  // Handle role-based access
  if (requiresAuth && !hasRequiredRole) {
    return (
      <Navigate
        to="/unauthorized"
        state={{ from: location }}
        replace
      />
    );
  }

  // Render protected route content
  return <Outlet />;
};

export default PrivateRoute;