/**
 * HR Personnel Route Configuration
 * Version: 1.0.0
 * 
 * Implements secure route configuration for HR personnel with role-based access control,
 * performance optimization through code splitting, and comprehensive monitoring.
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import PrivateRoute from './PrivateRoute';
import MainLayout from '../layouts/MainLayout';
import Loading from '../components/common/Loading';
import { UserRole } from '../types/auth.types';
import { HR } from '../constants/routes.constants';

// Lazy load HR components for code splitting
const HRDashboard = React.lazy(() => import('../pages/hr/Dashboard'));
const EmployeeList = React.lazy(() => import('../pages/hr/Employees'));
const EmployeeDetails = React.lazy(() => import('../pages/hr/EmployeeDetails'));
const BulkEnrollment = React.lazy(() => import('../pages/hr/BulkEnrollment'));
const Reports = React.lazy(() => import('../pages/hr/Reports'));
const CompanyProfile = React.lazy(() => import('../pages/hr/CompanyProfile'));
const PlanManagement = React.lazy(() => import('../pages/hr/PlanManagement'));

// Error fallback component for route loading failures
const RouteErrorFallback = () => (
  <div role="alert" aria-live="assertive">
    <h2>Erro ao carregar página</h2>
    <p>Não foi possível carregar a página solicitada. Por favor, tente novamente.</p>
  </div>
);

// Loading component for route transitions
const RouteLoadingFallback = () => (
  <Loading 
    size="lg" 
    overlay 
    text="Carregando..." 
    testId="hr-route-loading"
  />
);

/**
 * HR Routes component implementing role-based access control and performance optimization
 */
const HRRoutes: React.FC = React.memo(() => {
  return (
    <ErrorBoundary FallbackComponent={RouteErrorFallback}>
      <Routes>
        <Route
          element={
            <PrivateRoute
              allowedRoles={[UserRole.HR_PERSONNEL]}
              requiresAuth={true}
            />
          }
        >
          <Route element={<MainLayout />}>
            {/* Dashboard Route */}
            <Route
              path={HR.DASHBOARD}
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <HRDashboard />
                </Suspense>
              }
            />

            {/* Employee Management Routes */}
            <Route
              path={HR.EMPLOYEES}
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <EmployeeList />
                </Suspense>
              }
            />
            <Route
              path={HR.EMPLOYEE_DETAILS}
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <EmployeeDetails />
                </Suspense>
              }
            />

            {/* Bulk Enrollment Route */}
            <Route
              path={HR.BULK_ENROLLMENT}
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <BulkEnrollment />
                </Suspense>
              }
            />

            {/* Reports Route */}
            <Route
              path={HR.REPORTS}
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Reports />
                </Suspense>
              }
            />

            {/* Company Profile Route */}
            <Route
              path={HR.COMPANY_PROFILE}
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <CompanyProfile />
                </Suspense>
              }
            />

            {/* Plan Management Route */}
            <Route
              path={HR.PLAN_MANAGEMENT}
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <PlanManagement />
                </Suspense>
              }
            />

            {/* Default Route - Redirect to Dashboard */}
            <Route
              path={HR.ROOT}
              element={<Navigate to={HR.DASHBOARD} replace />}
            />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
});

// Display name for debugging
HRRoutes.displayName = 'HRRoutes';

export default HRRoutes;