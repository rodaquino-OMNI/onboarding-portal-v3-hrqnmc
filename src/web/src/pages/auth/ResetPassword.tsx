import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import { useTranslation } from 'react-i18next'; // ^13.0.0
import { auditLog } from '../../hooks/useAuditLog';

import PasswordReset from '../../components/auth/PasswordReset';
import { useNotification } from '../../hooks/useNotification';
import AuthLayout from '../../layouts/AuthLayout';

/**
 * Password Reset Page Component
 * Implements secure password reset with LGPD compliance and accessibility
 */
const ResetPassword: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  /**
   * Handles successful password reset with audit logging and session cleanup
   * @param email - User's email address
   */
  const handlePasswordResetSuccess = useCallback(async (email: string) => {
    try {
      // Log successful password reset for LGPD compliance
      auditLog.log('password-reset-success', {
        email,
        timestamp: new Date().toISOString(),
        ipAddress: window.clientInformation?.platform || 'unknown'
      });

      // Show localized success notification
      showSuccess(t('auth.passwordReset.successMessage'), {
        duration: 5000,
        preserveOnRouteChange: true
      });

      // Navigate to login with success state
      navigate('/login', {
        state: {
          email,
          resetSuccess: true
        },
        replace: true
      });
    } catch (error) {
      console.error('Password reset success handling error:', error);
    }
  }, [navigate, showSuccess, t]);

  /**
   * Handles password reset errors with security logging
   * @param error - Error object from reset attempt
   */
  const handlePasswordResetError = useCallback(async (error: Error) => {
    try {
      // Log error for security monitoring
      auditLog.log('password-reset-error', {
        error: error.message,
        timestamp: new Date().toISOString(),
        ipAddress: window.clientInformation?.platform || 'unknown'
      });

      // Show localized error notification
      showError(t('auth.passwordReset.errorMessage', {
        error: error.message
      }), {
        duration: 7000,
        preserveOnRouteChange: false
      });
    } catch (logError) {
      console.error('Password reset error handling error:', logError);
    }
  }, [showError, t]);

  return (
    <AuthLayout>
      <div 
        className="reset-password-container"
        role="main"
        aria-labelledby="reset-password-title"
      >
        <h1 
          id="reset-password-title"
          className="reset-password-title"
        >
          {t('auth.passwordReset.pageTitle')}
        </h1>

        <div className="reset-password-content">
          <p className="reset-password-description">
            {t('auth.passwordReset.description')}
          </p>

          <PasswordReset
            onSuccess={handlePasswordResetSuccess}
            onError={handlePasswordResetError}
          />

          <div 
            className="reset-password-info"
            aria-live="polite"
          >
            <p className="info-text">
              {t('auth.passwordReset.infoText')}
            </p>
            <p className="lgpd-notice">
              {t('auth.passwordReset.lgpdNotice')}
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;