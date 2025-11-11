/**
 * Enhanced MFA Verification Component
 * Version: 1.0.0
 * 
 * Implements secure multi-factor authentication with progressive security challenges,
 * LGPD compliance, and comprehensive accessibility support.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form'; // ^7.45.0
import { useTranslation } from 'react-i18next'; // ^13.0.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0

import { useAuth } from '../../hooks/useAuth';
import type { MFARequest } from '../../types/auth.types';

// Constants for MFA configuration
const MFA_CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds
const PROGRESSIVE_DELAY = 1000; // ms between retries

// Props interface for MFA verification component
interface MFAVerificationProps {
  sessionToken: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  isHighRisk?: boolean;
  maxRetries?: number;
}

// Form data interface
interface MFAFormData {
  mfaCode: string;
  consentGiven: boolean;
  deviceFingerprint: string;
}

/**
 * Enhanced MFA Verification Component with security features and accessibility
 */
const MFAVerification: React.FC<MFAVerificationProps> = React.memo(({
  sessionToken,
  onSuccess,
  onError,
  isHighRisk = false,
  maxRetries = 3
}) => {
  // Hooks
  const { t } = useTranslation();
  const { verifyMFA, isLoading, retryCount } = useAuth();
  const [resendTimer, setResendTimer] = useState(0);
  const [progressiveDelay, setProgressiveDelay] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const attemptsRef = useRef(0);

  // Form handling with validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset
  } = useForm<MFAFormData>({
    defaultValues: {
      mfaCode: '',
      consentGiven: false,
      deviceFingerprint: ''
    }
  });

  // Initialize device fingerprint
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await import('@fingerprintjs/fingerprintjs');
        const agent = await fp.load();
        const result = await agent.get();
        return result.visitorId;
      } catch (error) {
        console.error('Fingerprint initialization error:', error);
        return '';
      }
    };

    initializeFingerprint().then(fingerprint => {
      reset({ deviceFingerprint: fingerprint });
    });
  }, [reset]);

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Handle session timeout
  useEffect(() => {
    const sessionTimeout = setTimeout(() => {
      onError(t('auth.mfa.sessionExpired'));
    }, 300000); // 5 minutes

    return () => clearTimeout(sessionTimeout);
  }, [onError, t]);

  // Progressive delay handler
  const handleProgressiveDelay = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const delay = progressiveDelay + PROGRESSIVE_DELAY;
    setProgressiveDelay(delay);

    return new Promise(resolve => {
      timeoutRef.current = setTimeout(resolve, delay);
    });
  }, [progressiveDelay]);

  // Form submission handler
  const onSubmit = async (data: MFAFormData) => {
    try {
      if (attemptsRef.current >= maxRetries) {
        onError(t('auth.mfa.maxRetriesExceeded'));
        return;
      }

      // Validate MFA code format
      if (!/^\d{6}$/.test(data.mfaCode)) {
        setError('mfaCode', {
          type: 'manual',
          message: t('auth.mfa.invalidFormat')
        });
        return;
      }

      // Progressive delay for security
      await handleProgressiveDelay();

      // Prepare MFA request with enhanced security
      const mfaRequest: MFARequest = {
        mfaCode: data.mfaCode,
        sessionToken,
        deviceFingerprint: data.deviceFingerprint
      };

      await verifyMFA(mfaRequest.mfaCode);
      onSuccess();

    } catch (error) {
      attemptsRef.current += 1;
      const remainingAttempts = maxRetries - attemptsRef.current;

      if (error instanceof Error) {
        onError(t('auth.mfa.verificationError', {
          error: error.message,
          attempts: remainingAttempts
        }));
      }

      // Reset form on error
      reset({ mfaCode: '' });
    }
  };

  // Handle resend MFA code
  const handleResend = useCallback(() => {
    if (resendTimer > 0) return;
    setResendTimer(RESEND_COOLDOWN);
    // Implement resend logic here
  }, [resendTimer]);

  return (
    <ErrorBoundary
      fallback={<div role="alert">{t('common.error.unexpected')}</div>}
      onError={(error) => console.error('MFA Error:', error)}
    >
      <div className="mfa-verification" role="main" aria-live="polite">
        <h2>{t('auth.mfa.title')}</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label htmlFor="mfaCode" className="sr-only">
              {t('auth.mfa.codeLabel')}
            </label>
            <input
              {...register('mfaCode', {
                required: t('auth.mfa.required'),
                pattern: {
                  value: /^\d{6}$/,
                  message: t('auth.mfa.invalidFormat')
                }
              })}
              type="text"
              id="mfaCode"
              inputMode="numeric"
              pattern="\d*"
              maxLength={MFA_CODE_LENGTH}
              autoComplete="one-time-code"
              aria-invalid={errors.mfaCode ? 'true' : 'false'}
              aria-describedby={errors.mfaCode ? 'mfaError' : undefined}
              disabled={isLoading || attemptsRef.current >= maxRetries}
            />
            {errors.mfaCode && (
              <span id="mfaError" role="alert" className="error-message">
                {errors.mfaCode.message}
              </span>
            )}
          </div>

          {isHighRisk && (
            <div className="form-group">
              <label className="consent-label">
                <input
                  {...register('consentGiven', {
                    required: t('auth.mfa.consentRequired')
                  })}
                  type="checkbox"
                  aria-required="true"
                />
                {t('auth.mfa.consentText')}
              </label>
              {errors.consentGiven && (
                <span role="alert" className="error-message">
                  {errors.consentGiven.message}
                </span>
              )}
            </div>
          )}

          <div className="actions">
            <button
              type="submit"
              disabled={isLoading || attemptsRef.current >= maxRetries}
              aria-busy={isLoading}
            >
              {t('auth.mfa.verify')}
            </button>
            
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0 || isLoading}
              aria-disabled={resendTimer > 0}
            >
              {resendTimer > 0
                ? t('auth.mfa.resendCountdown', { seconds: resendTimer })
                : t('auth.mfa.resend')}
            </button>
          </div>
        </form>

        <div className="help-text" aria-live="polite">
          {retryCount > 0 && (
            <p className="attempts-remaining">
              {t('auth.mfa.attemptsRemaining', {
                count: maxRetries - attemptsRef.current
              })}
            </p>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
});

MFAVerification.displayName = 'MFAVerification';

export default MFAVerification;