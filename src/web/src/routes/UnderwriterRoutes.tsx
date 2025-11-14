/**
 * Underwriter Routes Configuration
 * Version: 1.0.0
 * 
 * Implements protected routes for underwriter role with enhanced security,
 * granular permissions, and audit logging.
 */

import React, { useCallback, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import PrivateRoute from './PrivateRoute';
import UnderwriterDashboard from '../pages/underwriter/Dashboard';
import RiskAssessment from '../pages/underwriter/RiskAssessment';
import Policies from '../pages/underwriter/Policies';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { UserRole } from '../types/auth.types';

// Constants for route configuration
const ROUTE_PERMISSIONS = {
  dashboard: ['view_dashboard'],
  risk_assessment: ['view_health_data', 'manage_risk'],
  policies: ['view_policies', 'manage_policies']
} as const;

// Route audit configuration
const ROUTE_AUDIT_CONFIG = {
  enabled: true,
  logLevel: 'info',
  includeMetadata: true
} as const;

// Props interface with enhanced security options
interface UnderwriterRoutesProps {
  auditEnabled?: boolean;
  permissionLevel?: string;
}

/**
 * UnderwriterRoutes component implementing protected routes with
 * role-based access control and security monitoring
 */
const UnderwriterRoutes: React.FC<UnderwriterRoutesProps> = ({
  auditEnabled = ROUTE_AUDIT_CONFIG.enabled,
  permissionLevel = 'standard'
}) => {
  const location = useLocation();
  const { user, checkSessionTimeout } = useAuth();
  const { showError } = useNotification();

  // Validate session and permissions on route change
  useEffect(() => {
    const validateAccess = async () => {
      if (checkSessionTimeout()) {
        showError('Your session has expired. Please log in again.');
        return;
      }

      if (user?.role !== UserRole.UNDERWRITER) {
        showError('Unauthorized access attempt detected');
        // Additional security logging could be added here
      }
    };

    validateAccess();
  }, [location.pathname, user, checkSessionValidity, showError]);

  // Handle route errors with audit logging
  const handleRouteError = useCallback((error: Error) => {
    console.error('Route error:', error);
    showError('An error occurred while accessing this page');
  }, [showError]);

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
        <div role="alert">
          <h2>Error accessing page</h2>
          <pre>{error.message}</pre>
        </div>
      )}
      onError={handleRouteError}
    >
      <Routes>
        {/* Dashboard Route */}
        <Route
          path="dashboard"
          element={
            <PrivateRoute
              allowedRoles={[UserRole.UNDERWRITER]}
              requiresAuth={true}
            >
              <UnderwriterDashboard />
            </PrivateRoute>
          }
        />

        {/* Risk Assessment Route */}
        <Route
          path="risk-assessment/:enrollmentId"
          element={
            <PrivateRoute
              allowedRoles={[UserRole.UNDERWRITER]}
              requiresAuth={true}
            >
              <RiskAssessment />
            </PrivateRoute>
          }
        />

        {/* Policies Management Route */}
        <Route
          path="policies"
          element={
            <PrivateRoute
              allowedRoles={[UserRole.UNDERWRITER]}
              requiresAuth={true}
            >
              <Policies />
            </PrivateRoute>
          }
        />

        {/* Catch-all route for unmatched paths */}
        <Route
          path="*"
          element={
            <div role="alert">
              <h2>Page Not Found</h2>
              <p>The requested page does not exist.</p>
            </div>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
};

export default UnderwriterRoutes;