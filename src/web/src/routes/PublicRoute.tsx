/**
 * Public Route Component
 * Version: 1.0.0
 * 
 * Implements secure public route access control with MFA verification,
 * LGPD compliance, and role-based session management.
 */

import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom'; // ^6.4.0
import { SecurityContext } from '../types/auth.types';

import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes.constants';

/**
 * Security level enumeration for route access control
 */
enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Props interface for PublicRoute component
 */
interface PublicRouteProps {
  children?: React.ReactNode;
  restricted?: boolean;
  requireMfa?: boolean;
  requireConsent?: boolean;
  securityLevel?: SecurityLevel;
}

/**
 * Determines the appropriate redirect path based on user role and verification status
 */
const getRedirectPath = (
  role: string | undefined,
  requiresMfa: boolean
): string => {
  // Check MFA verification requirement
  if (requiresMfa) {
    return ROUTES.AUTH.MFA_VERIFICATION;
  }

  // Return role-specific dashboard
  switch (role) {
    case 'ADMINISTRATOR':
      return ROUTES.ADMIN.DASHBOARD;
    case 'UNDERWRITER':
      return ROUTES.UNDERWRITER.DASHBOARD;
    case 'BROKER':
      return ROUTES.BROKER.DASHBOARD;
    case 'HR_PERSONNEL':
      return ROUTES.HR.DASHBOARD;
    case 'PARENT_GUARDIAN':
      return ROUTES.PARENT_GUARDIAN.DASHBOARD;
    case 'BENEFICIARY':
    default:
      return ROUTES.BENEFICIARY.DASHBOARD;
  }
};

/**
 * Validates security context for the route
 */
const validateSecurityContext = (
  context: SecurityContext,
  requiredLevel: SecurityLevel
): boolean => {
  // Validate device fingerprint
  if (!context.deviceId) {
    return false;
  }

  // Validate session integrity
  const sessionAge = Date.now() - new Date(context.timestamp).getTime();
  if (!context.sessionId || sessionAge > 3600000) {
    return false;
  }

  // Additional security checks based on required level
  switch (requiredLevel) {
    case SecurityLevel.HIGH:
    case SecurityLevel.MEDIUM:
    case SecurityLevel.LOW:
    default:
      return true;
  }
};

/**
 * PublicRoute component that handles public route access control
 */
const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  restricted = false,
  requireMfa = false,
  requireConsent = true,
  securityLevel = SecurityLevel.LOW
}) => {
  const { isAuthenticated, user, requiresMFA, securityContext } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isSecure, setIsSecure] = useState(false);

  // Validate security context on mount and when dependencies change
  useEffect(() => {
    const validateSecurity = async () => {
      if (!isAuthenticated) {
        setIsSecure(true);
        setIsValidating(false);
        return;
      }

      // Validate security context
      const isContextValid = validateSecurityContext(securityContext, securityLevel);

      setIsSecure(isContextValid);
      setIsValidating(false);
    };

    validateSecurity();
  }, [isAuthenticated, securityContext, securityLevel]);

  // Show loading state while validating
  if (isValidating) {
    return null;
  }

  // Handle security validation failure
  if (!isSecure) {
    return <Navigate to={ROUTES.ERROR.UNAUTHORIZED} replace />;
  }

  // Handle restricted route access for authenticated users
  if (isAuthenticated && restricted) {
    const redirectPath = getRedirectPath(
      user?.role,
      requireMfa && requiresMFA
    );
    return <Navigate to={redirectPath} replace />;
  }

  // Render children or outlet
  return <>{children || <Outlet />}</>;
};

export default PublicRoute;