/**
 * Broker Routes Component
 * Version: 1.0.0
 * 
 * Implements protected routes for broker users with comprehensive security,
 * session validation, and audit logging features.
 */

import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth.types';

// Lazy-loaded broker components for better performance
const Dashboard = React.lazy(() => import('../pages/broker/Dashboard'));
const NewEnrollment = React.lazy(() => import('../pages/broker/NewEnrollment'));
const Reports = React.lazy(() => import('../pages/broker/Reports'));
// const BrokerDashboard = React.lazy(() => import('../pages/broker/BrokerDashboard'));
// const EnrollmentList = React.lazy(() => import('../pages/broker/EnrollmentList'));
// const EnrollmentDetails = React.lazy(() => import('../pages/broker/EnrollmentDetails'));
// const CommissionReports = React.lazy(() => import('../pages/broker/CommissionReports'));
// const BrokerProfile = React.lazy(() => import('../pages/broker/BrokerProfile'));

// Constants for route configuration
const BROKER_ROLE = UserRole.BROKER;
const SESSION_TIMEOUT = 28800000; // 8 hours in milliseconds
const ROUTE_TRANSITION_TIMEOUT = 300;

// Error fallback component for route errors
const RouteErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" className="route-error">
    <h2>Route Error</h2>
    <pre>{error.message}</pre>
  </div>
);

// Loading component for Suspense fallback
const RouteLoadingFallback: React.FC = () => (
  <div role="progressbar" className="route-loading">
    Loading...
  </div>
);

/**
 * Protected broker routes component with enhanced security features
 * and comprehensive session management
 */
const BrokerRoutes: React.FC = React.memo(() => {
  const location = useLocation();
  const { 
    user, 
    isAuthenticated, 
    checkSessionValidity,
    logout 
  } = useAuth();

  // Validate broker role and session status
  useEffect(() => {
    const validateSession = async () => {
      if (!isAuthenticated || user?.role !== BROKER_ROLE || !checkSessionValidity()) {
        await logout();
        return;
      }
    };

    validateSession();
  }, [isAuthenticated, user, checkSessionValidity, logout]);

  // Route transition logging
  useEffect(() => {
    const logRouteTransition = () => {
      if (user?.role === BROKER_ROLE) {
        console.info('Broker route transition:', {
          path: location.pathname,
          timestamp: new Date().toISOString(),
          userId: user.id
        });
      }
    };

    const transitionTimeout = setTimeout(logRouteTransition, ROUTE_TRANSITION_TIMEOUT);
    return () => clearTimeout(transitionTimeout);
  }, [location, user]);

  // Redirect if not authenticated or not a broker
  if (!isAuthenticated || user?.role !== BROKER_ROLE) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <ErrorBoundary FallbackComponent={RouteErrorFallback}>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Broker dashboard route */}
          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          {/* New enrollment route */}
          <Route
            path="enrollments/new"
            element={<NewEnrollment />}
          />

          {/* Reports route */}
          <Route
            path="reports"
            element={<Reports />}
          />

          {/* Enrollment list route - TODO: Implement */}
          {/* <Route
            path="enrollments"
            element={<EnrollmentList />}
          /> */}

          {/* Enrollment details route - TODO: Implement */}
          {/* <Route
            path="enrollments/:id"
            element={<EnrollmentDetails />}
          /> */}

          {/* Commission reports route - TODO: Implement */}
          {/* <Route
            path="reports/commission"
            element={<CommissionReports />}
          /> */}

          {/* Broker profile route - TODO: Implement */}
          {/* <Route
            path="profile"
            element={<BrokerProfile />}
          /> */}

          {/* Default redirect to dashboard */}
          <Route 
            path="*" 
            element={<Navigate to="dashboard" replace />} 
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
});

// Set display name for debugging
BrokerRoutes.displayName = 'BrokerRoutes';

export default BrokerRoutes;