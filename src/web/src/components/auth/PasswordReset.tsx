import React, { useState, useCallback } from 'react';
import { z } from 'zod'; // v3.22.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import winston from 'winston'; // v3.10.0

import { authService } from '../../services/auth.service';
import Form from '../common/Form';
import Button from '../common/Button';

// Security logger configuration
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'password-reset' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'security.log' })
  ]
});

// Validation schema with Brazilian Portuguese messages
const passwordResetSchema = z.object({
  email: z
    .string()
    .email('Por favor, insira um email válido')
    .min(5, 'Email deve ter no mínimo 5 caracteres')
    .max(255, 'Email deve ter no máximo 255 caracteres')
});

// Interface for form data
interface PasswordResetFormData {
  email: string;
}

// Props interface
interface PasswordResetProps {
  onSuccess: (email: string) => void;
  onError: (error: Error) => void;
}

/**
 * Password Reset Component with LGPD compliance and security features
 */
export const PasswordReset: React.FC<PasswordResetProps> = ({
  onSuccess,
  onError
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial form values
  const initialValues: PasswordResetFormData = {
    email: ''
  };

  /**
   * Handles password reset request with rate limiting and security logging
   */
  const handlePasswordReset = useCallback(async (formData: PasswordResetFormData) => {
    try {
      setIsSubmitting(true);

      // Log reset attempt for security audit
      securityLogger.info('Password reset attempt', {
        email: formData.email,
        timestamp: new Date().toISOString(),
        ipAddress: window.clientInformation?.platform || 'unknown'
      });

      // Check rate limiting
      const rateLimitCheck = await authService.checkResetAttempts(formData.email);
      if (!rateLimitCheck.allowed) {
        throw new Error(t('auth.errors.tooManyAttempts'));
      }

      // Attempt password reset
      await authService.resetPassword(formData.email);

      // Log successful attempt
      securityLogger.info('Password reset email sent', {
        email: formData.email,
        timestamp: new Date().toISOString()
      });

      onSuccess(formData.email);
    } catch (error) {
      // Log failed attempt
      securityLogger.error('Password reset failed', {
        email: formData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      onError(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess, onError, t]);

  return (
    <div className="password-reset-container">
      <h2 className="password-reset-title">
        {t('auth.passwordReset.title')}
      </h2>

      <Form
        validationSchema={passwordResetSchema}
        initialValues={initialValues}
        onSubmit={handlePasswordReset}
        loading={isSubmitting}
        submitLabel={t('auth.passwordReset.submit')}
        formId="password-reset-form"
        a11yConfig={{
          ariaLive: 'polite',
          screenReaderInstructions: t('auth.passwordReset.instructions')
        }}
        securityConfig={{
          auditLog: true,
          lgpdCompliance: true
        }}
      >
        <div className="password-reset-form">
          <div className="form-field">
            <label htmlFor="email" className="form-label">
              {t('auth.passwordReset.emailLabel')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              aria-required="true"
              aria-describedby="email-description"
              autoComplete="email"
              data-testid="password-reset-email"
            />
            <div id="email-description" className="form-field-description">
              {t('auth.passwordReset.emailDescription')}
            </div>
          </div>

          <div className="password-reset-actions">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              fullWidth
              ariaLabel={t('auth.passwordReset.submitAriaLabel')}
              data-testid="password-reset-submit"
            >
              {t('auth.passwordReset.submit')}
            </Button>
          </div>
        </div>
      </Form>

      <div className="password-reset-info">
        <p className="info-text">
          {t('auth.passwordReset.infoText')}
        </p>
        <p className="lgpd-notice">
          {t('auth.passwordReset.lgpdNotice')}
        </p>
      </div>
    </div>
  );
};

export default PasswordReset;