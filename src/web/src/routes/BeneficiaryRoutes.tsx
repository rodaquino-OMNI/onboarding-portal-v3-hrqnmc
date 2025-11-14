/**
 * Beneficiary Routes Component
 * Version: 1.0.0
 * 
 * Implements protected routes for beneficiary users with role-based access control,
 * session management, and secure routing for health plan enrollment features.
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { withErrorBoundary } from '@sentry/react';

// Internal imports
import PrivateRoute from './PrivateRoute';
import { ROUTES } from '../constants/routes.constants';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { UserRole } from '../types/auth.types';

// Lazy-loaded components for better performance
const BeneficiaryDashboard = React.lazy(() => import('../pages/beneficiary/Dashboard'));
const HealthAssessment = React.lazy(() => import('../pages/beneficiary/HealthAssessment'));
const Documents = React.lazy(() => import('../pages/beneficiary/Documents'));
const Profile = React.lazy(() => import('../pages/beneficiary/Profile'));

// Constants for session management
const BENEFICIARY_ROLE = [UserRole.BENEFICIARY];
const SESSION_TIMEOUT = 1800000; // 30 minutes as per specification
const ROUTE_AUDIT_EVENTS = {
  ROUTE_ENTER: 'route_enter',
  ROUTE_EXIT: 'route_exit',
  ROUTE_ERROR: 'route_error'
} as const;

/**
 * BeneficiaryRoutes component implementing protected routing with session management
 */
const BeneficiaryRoutes: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, sessionExpiry } = useAuth();
  const { showError } = useNotification();

  // Monitor session expiration
  useEffect(() => {
    if (isAuthenticated && sessionExpiry) {
      const timeoutId = setTimeout(() => {
        showError(t('errors.session_expired'));
      }, sessionExpiry.getTime() - Date.now());

      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, sessionExpiry, showError, t]);

  // Audit route changes
  useEffect(() => {
    const logRouteChange = (path: string, event: string) => {
      console.info('Route audit:', {
        userId: user?.id,
        path,
        event,
        timestamp: new Date().toISOString()
      });
    };

    return () => {
      logRouteChange(window.location.pathname, ROUTE_AUDIT_EVENTS.ROUTE_EXIT);
    };
  }, [user?.id]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />;
  }

  return (
    <Routes>
      {/* Dashboard Route */}
      <Route
        path={ROUTES.BENEFICIARY.ROOT}
        element={
          <PrivateRoute
            allowedRoles={BENEFICIARY_ROLE}
            sessionTimeout={SESSION_TIMEOUT}
          >
            <React.Suspense fallback={<div>{t('loading.dashboard')}</div>}>
              <BeneficiaryDashboard />
            </React.Suspense>
          </PrivateRoute>
        }
      />

      {/* Health Assessment Route */}
      <Route
        path={ROUTES.BENEFICIARY.HEALTH_ASSESSMENT}
        element={
          <PrivateRoute
            allowedRoles={BENEFICIARY_ROLE}
            sessionTimeout={SESSION_TIMEOUT}
          >
            <React.Suspense fallback={<div>{t('loading.health_assessment')}</div>}>
              <HealthAssessment />
            </React.Suspense>
          </PrivateRoute>
        }
      />

      {/* Documents Route */}
      <Route
        path={ROUTES.BENEFICIARY.DOCUMENTS}
        element={
          <PrivateRoute
            allowedRoles={BENEFICIARY_ROLE}
            sessionTimeout={SESSION_TIMEOUT}
          >
            <React.Suspense fallback={<div>{t('loading.documents')}</div>}>
              <Documents />
            </React.Suspense>
          </PrivateRoute>
        }
      />

      {/* Profile Route */}
      <Route
        path={ROUTES.BENEFICIARY.PROFILE}
        element={
          <PrivateRoute
            allowedRoles={BENEFICIARY_ROLE}
            sessionTimeout={SESSION_TIMEOUT}
          >
            <React.Suspense fallback={<div>{t('loading.profile')}</div>}>
              <Profile />
            </React.Suspense>
          </PrivateRoute>
        }
      />

      {/* Payment Route */}
      <Route
        path={ROUTES.BENEFICIARY.PAYMENT}
        element={
          <PrivateRoute
            allowedRoles={BENEFICIARY_ROLE}
            sessionTimeout={SESSION_TIMEOUT}
          >
            <React.Suspense fallback={<div>{t('loading.payment')}</div>}>
              <Payment />
            </React.Suspense>
          </PrivateRoute>
        }
      />

      {/* Coverage Route */}
      <Route
        path={ROUTES.BENEFICIARY.COVERAGE}
        element={
          <PrivateRoute
            allowedRoles={BENEFICIARY_ROLE}
            sessionTimeout={SESSION_TIMEOUT}
          >
            <React.Suspense fallback={<div>{t('loading.coverage')}</div>}>
              <Coverage />
            </React.Suspense>
          </PrivateRoute>
        }
      />

      {/* Dependents Route */}
      <Route
        path={ROUTES.BENEFICIARY.DEPENDENTS}
        element={
          <PrivateRoute
            allowedRoles={BENEFICIARY_ROLE}
            sessionTimeout={SESSION_TIMEOUT}
          >
            <React.Suspense fallback={<div>{t('loading.dependents')}</div>}>
              <Dependents />
            </React.Suspense>
          </PrivateRoute>
        }
      />

      {/* Fallback for undefined routes */}
      <Route
        path="*"
        element={<Navigate to={ROUTES.ERROR.NOT_FOUND} replace />}
      />
    </Routes>
  );
};

// Export with error boundary for production monitoring
export default withErrorBoundary(BeneficiaryRoutes, {
  fallback: <div>Error loading beneficiary routes</div>,
  beforeCapture: (scope) => {
    scope.setTag('component', 'BeneficiaryRoutes');
  }
});