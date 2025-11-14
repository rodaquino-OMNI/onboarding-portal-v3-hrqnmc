/**
 * MFA Verification Page
 * Version: 1.0.0
 *
 * Multi-factor authentication verification page supporting SMS and TOTP methods
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Container
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import SecurityIcon from '@mui/icons-material/Security';

import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import AuthLayout from '../../layouts/AuthLayout';

// MFA method types
type MFAMethod = 'sms' | 'totp';

// MFA code length
const MFA_CODE_LENGTH = 6;

// Resend timeout in seconds
const RESEND_TIMEOUT = 60;

const MFAVerification: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyMFA, user, isLoading } = useAuth();
  const { showError, showSuccess } = useNotification();

  // State management
  const [mfaMethod, setMfaMethod] = useState<MFAMethod>('sms');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Maximum verification attempts
  const MAX_ATTEMPTS = 3;

  // Start resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Handle MFA method change
  const handleMethodChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMethod: MFAMethod | null) => {
      if (newMethod !== null) {
        setMfaMethod(newMethod);
        setCode('');
        setError(null);
      }
    },
    []
  );

  // Handle code input change
  const handleCodeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, MFA_CODE_LENGTH);
    setCode(value);
    setError(null);
  }, []);

  // Handle code verification
  const handleVerify = useCallback(async () => {
    if (code.length !== MFA_CODE_LENGTH) {
      setError(t('auth.mfa.invalidCodeLength'));
      return;
    }

    if (attempts >= MAX_ATTEMPTS) {
      setError(t('auth.mfa.maxAttemptsReached'));
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      await verifyMFA(code);
      showSuccess(t('auth.mfa.verificationSuccess'));

      // Navigate to intended destination or dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setAttempts(prev => prev + 1);
      const errorMessage = err.message || t('auth.mfa.verificationFailed');
      setError(errorMessage);
      showError(errorMessage);
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  }, [code, attempts, verifyMFA, showSuccess, showError, t, navigate, location]);

  // Handle resend code
  const handleResendCode = useCallback(async () => {
    setResendTimer(RESEND_TIMEOUT);
    setError(null);
    showSuccess(t('auth.mfa.codeSent'));
    // In real implementation, call API to resend code
  }, [showSuccess, t]);

  // Handle form submission
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      handleVerify();
    },
    [handleVerify]
  );

  // Handle key press for auto-submit
  useEffect(() => {
    if (code.length === MFA_CODE_LENGTH && !isVerifying) {
      handleVerify();
    }
  }, [code, isVerifying, handleVerify]);

  return (
    <AuthLayout>
      <Container maxWidth="sm">
        <Box sx={{ py: 4 }}>
          <Card sx={{ p: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              align="center"
              gutterBottom
              sx={{ mb: 2 }}
            >
              {t('auth.mfa.title')}
            </Typography>

            <Typography
              variant="body1"
              color="textSecondary"
              align="center"
              sx={{ mb: 4 }}
            >
              {t('auth.mfa.description')}
            </Typography>

            {/* MFA Method Selection */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <ToggleButtonGroup
                value={mfaMethod}
                exclusive
                onChange={handleMethodChange}
                aria-label={t('auth.mfa.methodSelection')}
                fullWidth
              >
                <ToggleButton value="sms" aria-label={t('auth.mfa.sms')}>
                  <PhoneAndroidIcon sx={{ mr: 1 }} />
                  {t('auth.mfa.sms')}
                </ToggleButton>
                <ToggleButton value="totp" aria-label={t('auth.mfa.totp')}>
                  <SecurityIcon sx={{ mr: 1 }} />
                  {t('auth.mfa.totp')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} role="alert">
                {error}
                {attempts >= MAX_ATTEMPTS && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {t('auth.mfa.contactSupport')}
                  </Typography>
                )}
              </Alert>
            )}

            {/* Verification Form */}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label={t('auth.mfa.codeLabel')}
                placeholder="000000"
                value={code}
                onChange={handleCodeChange}
                disabled={isVerifying || attempts >= MAX_ATTEMPTS}
                autoFocus
                inputProps={{
                  maxLength: MFA_CODE_LENGTH,
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  'aria-label': t('auth.mfa.codeInput'),
                  autoComplete: 'one-time-code'
                }}
                sx={{ mb: 3 }}
                helperText={t('auth.mfa.codeHelperText', { length: MFA_CODE_LENGTH })}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={
                  code.length !== MFA_CODE_LENGTH ||
                  isVerifying ||
                  attempts >= MAX_ATTEMPTS
                }
                sx={{ mb: 2 }}
              >
                {isVerifying ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    {t('auth.mfa.verifying')}
                  </>
                ) : (
                  t('auth.mfa.verify')
                )}
              </Button>
            </form>

            {/* Resend Code */}
            {mfaMethod === 'sms' && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                {resendTimer > 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    {t('auth.mfa.resendIn', { seconds: resendTimer })}
                  </Typography>
                ) : (
                  <Button
                    variant="text"
                    onClick={handleResendCode}
                    disabled={attempts >= MAX_ATTEMPTS}
                  >
                    {t('auth.mfa.resendCode')}
                  </Button>
                )}
              </Box>
            )}

            {/* Help Text */}
            <Typography
              variant="body2"
              color="textSecondary"
              align="center"
              sx={{ mt: 3 }}
            >
              {t('auth.mfa.helpText')}
            </Typography>
          </Card>
        </Box>
      </Container>
    </AuthLayout>
  );
};

export default MFAVerification;
