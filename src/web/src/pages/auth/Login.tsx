import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from 'react-error-boundary';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

import { LoginForm } from '../../components/auth/LoginForm';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';

// Role-specific dashboard routes
const DASHBOARD_ROUTES = {
  ADMIN: '/admin/dashboard',
  BROKER: '/broker/dashboard',
  BENEFICIARY: '/beneficiary/dashboard',
  HR: '/hr/dashboard',
  UNDERWRITER: '/underwriter/dashboard'
} as const;

// Session durations in milliseconds
const SESSION_DURATIONS = {
  ADMIN: 14400000,      // 4 hours
  BROKER: 28800000,     // 8 hours
  BENEFICIARY: 1800000, // 30 minutes
  HR: 28800000,         // 8 hours
  UNDERWRITER: 14400000 // 4 hours
} as const;

// Security thresholds
const SECURITY_THRESHOLDS = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900000, // 15 minutes
  MFA_TIMEOUT: 300000      // 5 minutes
} as const;

const LoginPage: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { login, isLoading } = useAuth();

  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number>(0);

  // Initialize device fingerprint for security tracking
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceFingerprint(result.visitorId);
      } catch (error) {
        console.error('Fingerprint initialization error:', error);
      }
    };

    initializeFingerprint();
  }, []);

  // Check and handle account lockout
  useEffect(() => {
    if (isLocked && Date.now() >= lockoutEndTime) {
      setIsLocked(false);
      setLoginAttempts(0);
    }
  }, [isLocked, lockoutEndTime]);

  // Handle successful login with role-based navigation
  const handleLoginSuccess = useCallback(async () => {
    const from = location.state?.from?.pathname || DASHBOARD_ROUTES.BENEFICIARY;
    navigate(from, { replace: true });
  }, [location.state, navigate]);

  // Handle MFA requirement based on user role
  const handleMFARequired = useCallback(() => {
    navigate('/auth/mfa', { 
      state: { 
        from: location.state?.from,
        deviceFingerprint 
      }
    });
  }, [location.state, navigate, deviceFingerprint]);

  // Handle login error with security measures
  const handleLoginError = useCallback((error: Error) => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);

    if (newAttempts >= SECURITY_THRESHOLDS.MAX_LOGIN_ATTEMPTS) {
      setIsLocked(true);
      setLockoutEndTime(Date.now() + SECURITY_THRESHOLDS.LOCKOUT_DURATION);
    }
  }, [loginAttempts]);

  // Error boundary fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <div role="alert" className="error-container">
      <Typography variant="h6" color="error">
        {t('auth.error.unexpected')}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {error.message}
      </Typography>
      <button onClick={resetErrorBoundary} className="retry-button">
        {t('common.retry')}
      </button>
    </div>
  );

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        setLoginAttempts(0);
        setIsLocked(false);
      }}
    >
      <AuthLayout>
        <div className="login-container" role="main">
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component="h1"
            align="center"
            gutterBottom
            sx={{ mb: 4 }}
          >
            {t('auth.login.welcome')}
          </Typography>

          {isLocked ? (
            <div role="alert" className="lockout-message">
              <Typography color="error" align="center">
                {t('auth.login.accountLocked', {
                  minutes: Math.ceil(
                    (lockoutEndTime - Date.now()) / 60000
                  )
                })}
              </Typography>
            </div>
          ) : (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onMFARequired={handleMFARequired}
              onError={handleLoginError}
              maxAttempts={SECURITY_THRESHOLDS.MAX_LOGIN_ATTEMPTS - loginAttempts}
              isLoading={isLoading}
              deviceFingerprint={deviceFingerprint}
            />
          )}

          <Typography
            variant="body2"
            color="textSecondary"
            align="center"
            sx={{ mt: 3 }}
          >
            {t('auth.login.needHelp')}{' '}
            <a
              href="/support"
              className="help-link"
              onClick={(e) => {
                e.preventDefault();
                navigate('/support');
              }}
            >
              {t('auth.login.contactSupport')}
            </a>
          </Typography>
        </div>
      </AuthLayout>
    </ErrorBoundary>
  );
});

LoginPage.displayName = 'LoginPage';

export default LoginPage;