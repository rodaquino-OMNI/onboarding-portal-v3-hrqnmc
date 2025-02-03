import React, { useCallback, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { withErrorBoundary } from 'react-error-boundary';

// Internal imports
import PrivateRoute from './PrivateRoute';
import { useAuth } from '../contexts/AuthContext';
import { ADMIN } from '../constants/routes.constants';
import { UserRole } from '../types/auth.types';

// Lazy loaded admin components
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const Settings = React.lazy(() => import('../pages/admin/Settings'));
const Users = React.lazy(() => import('../pages/admin/Users'));

// Constants for route configuration
const ADMIN_ROLE = [UserRole.ADMINISTRATOR];

// Route titles in Brazilian Portuguese
const ROUTE_TITLES = {
  dashboard: 'Painel de Controle',
  settings: 'Configurações',
  users: 'Gerenciamento de Usuários'
};

// Error messages in Brazilian Portuguese
const ERROR_MESSAGES = {
  accessDenied: 'Acesso negado. Permissões insuficientes.',
  routeError: 'Erro ao carregar a página. Tente novamente.'
};

/**
 * AdminRoutes component that defines protected routes for administrator access
 * with security monitoring and localization support.
 */
const AdminRoutes: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();

  // Monitor route transitions for security audit
  useEffect(() => {
    if (user) {
      const auditData = {
        userId: user.id,
        path: location.pathname,
        timestamp: new Date().toISOString()
      };

      // Log route access to audit trail
      console.info('Admin route access:', auditData);
    }
  }, [location, user]);

  // Error boundary fallback component
  const ErrorFallback = useCallback(({ error }: { error: Error }) => (
    <div role="alert" className="error-container">
      <h2>{t('error.title')}</h2>
      <p>{ERROR_MESSAGES.routeError}</p>
      <pre>{error.message}</pre>
    </div>
  ), [t]);

  return (
    <Routes>
      <Route
        path={ADMIN.ROOT}
        element={
          <PrivateRoute
            allowedRoles={ADMIN_ROLE}
            requiresAuth={true}
          />
        }
      >
        {/* Dashboard Route */}
        <Route
          path={ADMIN.DASHBOARD}
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <AdminDashboard />
            </React.Suspense>
          }
        />

        {/* Users Management Route */}
        <Route
          path={ADMIN.USERS}
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <Users />
            </React.Suspense>
          }
        />

        {/* Settings Route */}
        <Route
          path={ADMIN.SETTINGS}
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <Settings />
            </React.Suspense>
          }
        />

        {/* Default redirect to dashboard */}
        <Route
          index
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <AdminDashboard />
            </React.Suspense>
          }
        />
      </Route>
    </Routes>
  );
};

// Wrap component with error boundary
const AdminRoutesWithErrorBoundary = withErrorBoundary(AdminRoutes, {
  FallbackComponent: ({ error }) => (
    <div role="alert" className="error-container">
      <h2>Error</h2>
      <p>{ERROR_MESSAGES.routeError}</p>
      <pre>{error.message}</pre>
    </div>
  ),
  onError: (error, info) => {
    // Log error to monitoring service
    console.error('Admin routes error:', error, info);
  }
});

AdminRoutesWithErrorBoundary.displayName = 'AdminRoutes';

export default AdminRoutesWithErrorBoundary;