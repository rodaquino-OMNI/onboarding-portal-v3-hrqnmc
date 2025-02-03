/**
 * Root Application Component
 * Version: 1.0.0
 * 
 * Implements the core application structure with comprehensive error handling,
 * role-based access control, localization support, and multi-factor authentication.
 */

import React, { useCallback, useEffect } from 'react'; // ^18.2.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.11
import AppRouter from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { THEME } from './constants/app.constants';

/**
 * Error fallback component with LGPD-compliant error messaging
 */
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => {
  useEffect(() => {
    // Log error to monitoring system
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        padding: THEME.SPACING.LARGE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: THEME.COLORS.BACKGROUND,
      }}
    >
      <h2 style={{ color: THEME.COLORS.ERROR }}>
        Desculpe, ocorreu um erro inesperado
      </h2>
      <p style={{ marginBottom: THEME.SPACING.MEDIUM }}>
        Por favor, tente novamente. Se o problema persistir, entre em contato com o suporte.
      </p>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: `${THEME.SPACING.SMALL} ${THEME.SPACING.MEDIUM}`,
          backgroundColor: THEME.COLORS.PRIMARY,
          color: THEME.COLORS.CONTRAST.PRIMARY,
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          minHeight: '44px', // WCAG touch target size
        }}
      >
        Tentar Novamente
      </button>
    </div>
  );
};

/**
 * Root application component implementing provider hierarchy and error boundaries
 */
const App: React.FC = React.memo(() => {
  /**
   * Error boundary reset handler
   */
  const handleErrorReset = useCallback(() => {
    // Clear any error-related state and reload essential data
    window.location.href = '/';
  }, []);

  /**
   * Error boundary error handler
   */
  const handleError = useCallback((error: Error) => {
    // Log error to monitoring service
    console.error('Critical Application Error:', error);
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={handleErrorReset}
      onError={handleError}
    >
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <React.Suspense
              fallback={
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    backgroundColor: THEME.COLORS.BACKGROUND,
                  }}
                >
                  <span
                    style={{
                      color: THEME.COLORS.TEXT,
                      fontSize: THEME.TYPOGRAPHY.FONT_SIZES.MEDIUM,
                    }}
                  >
                    Carregando...
                  </span>
                </div>
              }
            >
              <AppRouter />
            </React.Suspense>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
});

// Display name for debugging
App.displayName = 'App';

export default App;