/**
 * Main Router Configuration
 * Version: 1.0.0
 * 
 * Implements secure routing with role-based access control, lazy loading,
 * error boundaries, and comprehensive security measures for the Pre-paid
 * Health Plan Onboarding Portal.
 */

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { CircularProgress } from '@mui/material';

import PublicRoute from './PublicRoute';
import PrivateRoute from './PrivateRoute';
import { ROUTES } from '../constants/routes.constants';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/common/Loading';

// Lazy-loaded components for better performance
const Login = React.lazy(() => import('../pages/auth/Login'));
const Register = React.lazy(() => import('../pages/auth/Register'));
const MFAVerification = React.lazy(() => import('../pages/auth/MFAVerification'));

// Admin routes
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const SystemLogs = React.lazy(() => import('../pages/admin/SystemLogs'));
const UserManagement = React.lazy(() => import('../pages/admin/UserManagement'));

// Broker routes
const BrokerDashboard = React.lazy(() => import('../pages/broker/Dashboard'));
const Enrollments = React.lazy(() => import('../pages/broker/Enrollments'));
const NewEnrollment = React.lazy(() => import('../pages/broker/NewEnrollment'));

// Beneficiary routes
const BeneficiaryDashboard = React.lazy(() => import('../pages/beneficiary/Dashboard'));
const HealthAssessment = React.lazy(() => import('../pages/beneficiary/HealthAssessment'));
const Documents = React.lazy(() => import('../pages/beneficiary/Documents'));

// HR routes
const HRDashboard = React.lazy(() => import('../pages/hr/Dashboard'));
const EmployeeManagement = React.lazy(() => import('../pages/hr/EmployeeManagement'));
const BulkEnrollment = React.lazy(() => import('../pages/hr/BulkEnrollment'));

// Underwriter routes
const UnderwriterDashboard = React.lazy(() => import('../pages/underwriter/Dashboard'));
const RiskAssessment = React.lazy(() => import('../pages/underwriter/RiskAssessment'));
const PolicyManagement = React.lazy(() => import('../pages/underwriter/PolicyManagement'));

// Parent/Guardian routes
const GuardianDashboard = React.lazy(() => import('../pages/guardian/Dashboard'));
const DependentManagement = React.lazy(() => import('../pages/guardian/DependentManagement'));

// Error pages
const NotFound = React.lazy(() => import('../pages/error/NotFound'));
const ServerError = React.lazy(() => import('../pages/error/ServerError'));
const Unauthorized = React.lazy(() => import('../pages/error/Unauthorized'));

/**
 * Error fallback component for route error boundary
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert">
    <h2>Algo deu errado</h2>
    <pre>{error.message}</pre>
    <button onClick={() => window.location.reload()}>Tentar novamente</button>
  </div>
);

/**
 * Loading fallback component for lazy-loaded routes
 */
const SuspenseFallback: React.FC = () => (
  <Loading 
    size="lg"
    overlay
    text="Carregando..."
    testId="route-loading"
  />
);

/**
 * Main router component implementing comprehensive routing configuration
 */
const AppRouter: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicRoute />}>
              <Route path={ROUTES.AUTH.LOGIN} element={<Login />} />
              <Route path={ROUTES.AUTH.REGISTER} element={<Register />} />
              <Route path={ROUTES.AUTH.MFA_VERIFICATION} element={<MFAVerification />} />
            </Route>

            {/* Admin Routes */}
            <Route 
              element={
                <PrivateRoute 
                  allowedRoles={['ADMINISTRATOR']} 
                  requiresAuth={true}
                  sessionTimeout={4 * 60 * 60 * 1000} // 4 hours
                />
              }
            >
              <Route path={ROUTES.ADMIN.ROOT} element={<Navigate to={ROUTES.ADMIN.DASHBOARD} />} />
              <Route path={ROUTES.ADMIN.DASHBOARD} element={<AdminDashboard />} />
              <Route path={ROUTES.ADMIN.SYSTEM_LOGS} element={<SystemLogs />} />
              <Route path={ROUTES.ADMIN.USERS} element={<UserManagement />} />
            </Route>

            {/* Broker Routes */}
            <Route 
              element={
                <PrivateRoute 
                  allowedRoles={['BROKER']} 
                  requiresAuth={true}
                  sessionTimeout={8 * 60 * 60 * 1000} // 8 hours
                />
              }
            >
              <Route path={ROUTES.BROKER.ROOT} element={<Navigate to={ROUTES.BROKER.DASHBOARD} />} />
              <Route path={ROUTES.BROKER.DASHBOARD} element={<BrokerDashboard />} />
              <Route path={ROUTES.BROKER.ENROLLMENTS} element={<Enrollments />} />
              <Route path={ROUTES.BROKER.NEW_ENROLLMENT} element={<NewEnrollment />} />
            </Route>

            {/* Beneficiary Routes */}
            <Route 
              element={
                <PrivateRoute 
                  allowedRoles={['BENEFICIARY']} 
                  requiresAuth={true}
                  sessionTimeout={30 * 60 * 1000} // 30 minutes
                />
              }
            >
              <Route path={ROUTES.BENEFICIARY.ROOT} element={<Navigate to={ROUTES.BENEFICIARY.DASHBOARD} />} />
              <Route path={ROUTES.BENEFICIARY.DASHBOARD} element={<BeneficiaryDashboard />} />
              <Route path={ROUTES.BENEFICIARY.HEALTH_ASSESSMENT} element={<HealthAssessment />} />
              <Route path={ROUTES.BENEFICIARY.DOCUMENTS} element={<Documents />} />
            </Route>

            {/* HR Personnel Routes */}
            <Route 
              element={
                <PrivateRoute 
                  allowedRoles={['HR_PERSONNEL']} 
                  requiresAuth={true}
                  sessionTimeout={8 * 60 * 60 * 1000} // 8 hours
                />
              }
            >
              <Route path={ROUTES.HR.ROOT} element={<Navigate to={ROUTES.HR.DASHBOARD} />} />
              <Route path={ROUTES.HR.DASHBOARD} element={<HRDashboard />} />
              <Route path={ROUTES.HR.EMPLOYEES} element={<EmployeeManagement />} />
              <Route path={ROUTES.HR.BULK_ENROLLMENT} element={<BulkEnrollment />} />
            </Route>

            {/* Underwriter Routes */}
            <Route 
              element={
                <PrivateRoute 
                  allowedRoles={['UNDERWRITER']} 
                  requiresAuth={true}
                  sessionTimeout={4 * 60 * 60 * 1000} // 4 hours
                />
              }
            >
              <Route path={ROUTES.UNDERWRITER.ROOT} element={<Navigate to={ROUTES.UNDERWRITER.DASHBOARD} />} />
              <Route path={ROUTES.UNDERWRITER.DASHBOARD} element={<UnderwriterDashboard />} />
              <Route path={ROUTES.UNDERWRITER.RISK_ASSESSMENT} element={<RiskAssessment />} />
              <Route path={ROUTES.UNDERWRITER.POLICIES} element={<PolicyManagement />} />
            </Route>

            {/* Parent/Guardian Routes */}
            <Route 
              element={
                <PrivateRoute 
                  allowedRoles={['PARENT_GUARDIAN']} 
                  requiresAuth={true}
                  sessionTimeout={30 * 60 * 1000} // 30 minutes
                />
              }
            >
              <Route path={ROUTES.PARENT_GUARDIAN.ROOT} element={<Navigate to={ROUTES.PARENT_GUARDIAN.DASHBOARD} />} />
              <Route path={ROUTES.PARENT_GUARDIAN.DASHBOARD} element={<GuardianDashboard />} />
              <Route path={ROUTES.PARENT_GUARDIAN.DEPENDENTS} element={<DependentManagement />} />
            </Route>

            {/* Error Routes */}
            <Route path={ROUTES.ERROR.NOT_FOUND} element={<NotFound />} />
            <Route path={ROUTES.ERROR.SERVER_ERROR} element={<ServerError />} />
            <Route path={ROUTES.ERROR.UNAUTHORIZED} element={<Unauthorized />} />

            {/* Default Route */}
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <Navigate to={`/${user?.role.toLowerCase()}/dashboard`} replace />
                ) : (
                  <Navigate to={ROUTES.AUTH.LOGIN} replace />
                )
              } 
            />

            {/* Catch-all Route */}
            <Route path="*" element={<Navigate to={ROUTES.ERROR.NOT_FOUND} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default AppRouter;