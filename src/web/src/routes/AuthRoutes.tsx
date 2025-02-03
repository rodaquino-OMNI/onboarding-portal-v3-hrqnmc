/**
 * Authentication Routes Component
 * Version: 1.0.0
 * 
 * Implements secure authentication routes with role-based access control,
 * MFA verification, and LGPD compliance for the Pre-paid Health Plan Onboarding Portal.
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // ^6.15.0
import { useAuth } from '../hooks/useAuth';
import PublicRoute from './PublicRoute';

// Constants for localized route paths
const AUTH_ROUTES = {
  LOGIN: '/entrar',
  REGISTER: '/cadastro',
  RESET_PASSWORD: '/redefinir-senha',
  MFA_VERIFICATION: '/verificacao-dois-fatores',
  SECURITY_CHECK: '/verificacao-seguranca',
  LGPD_CONSENT: '/termos-privacidade'
} as const;

// Security configuration for auth routes
const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 3,
  MFA_TIMEOUT_MINUTES: 5,
  SESSION_TIMEOUT_MINUTES: 30,
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW_MINUTES: 60
} as const;

/**
 * Enhanced authentication routes component with security features and LGPD compliance
 */
const AuthRoutes: React.FC = React.memo(() => {
  const { 
    isAuthenticated, 
    user, 
    requiresMFA,
    securityContext,
    checkSessionValidity 
  } = useAuth();

  // Monitor session validity
  useEffect(() => {
    if (isAuthenticated) {
      const sessionCheck = setInterval(() => {
        if (!checkSessionValidity()) {
          window.location.href = AUTH_ROUTES.LOGIN;
        }
      }, 60000); // Check every minute

      return () => clearInterval(sessionCheck);
    }
  }, [isAuthenticated, checkSessionValidity]);

  // Determine MFA requirement based on user role
  const requiresMFAVerification = React.useMemo(() => {
    if (!user) return false;
    return ['ADMINISTRATOR', 'UNDERWRITER', 'BROKER', 'HR_PERSONNEL'].includes(user.role);
  }, [user]);

  return (
    <Routes>
      {/* Login Route */}
      <Route
        path={AUTH_ROUTES.LOGIN}
        element={
          <PublicRoute
            restricted={true}
            requireMfa={false}
            requireConsent={false}
          >
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Registration Route */}
      <Route
        path={AUTH_ROUTES.REGISTER}
        element={
          <PublicRoute
            restricted={true}
            requireMfa={false}
            requireConsent={true}
          >
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Password Reset Route */}
      <Route
        path={AUTH_ROUTES.RESET_PASSWORD}
        element={
          <PublicRoute
            restricted={true}
            requireMfa={false}
            requireConsent={false}
          >
            <ResetPasswordPage />
          </PublicRoute>
        }
      />

      {/* MFA Verification Route */}
      <Route
        path={AUTH_ROUTES.MFA_VERIFICATION}
        element={
          <PublicRoute
            restricted={false}
            requireMfa={true}
            requireConsent={true}
          >
            <MFAVerificationPage />
          </PublicRoute>
        }
      />

      {/* Security Check Route */}
      <Route
        path={AUTH_ROUTES.SECURITY_CHECK}
        element={
          <PublicRoute
            restricted={false}
            requireMfa={requiresMFAVerification}
            requireConsent={true}
          >
            <SecurityCheckPage />
          </PublicRoute>
        }
      />

      {/* LGPD Consent Route */}
      <Route
        path={AUTH_ROUTES.LGPD_CONSENT}
        element={
          <PublicRoute
            restricted={false}
            requireMfa={false}
            requireConsent={false}
          >
            <LGPDConsentPage />
          </PublicRoute>
        }
      />

      {/* Redirect unmatched auth routes to login */}
      <Route
        path="*"
        element={<Navigate to={AUTH_ROUTES.LOGIN} replace />}
      />
    </Routes>
  );
});

// Component display name for debugging
AuthRoutes.displayName = 'AuthRoutes';

// Export the enhanced auth routes component
export default AuthRoutes;