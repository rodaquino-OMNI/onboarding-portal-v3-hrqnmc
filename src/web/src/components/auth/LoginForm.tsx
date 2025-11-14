import React, { useState, useCallback, useEffect } from 'react';
import { z } from 'zod'; // v3.22.0
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // v3.4.0
import classNames from 'classnames'; // v2.3.2
import { useButton } from 'react-aria'; // v3.22.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { Analytics } from '@segment/analytics-next'; // v1.51.0

import Form from '../common/Form';
import { useAuth } from '../../contexts/AuthContext';
import type { LoginRequest } from '../../types/auth.types';

// Initialize analytics
const analytics = new Analytics({
  writeKey: process.env.VITE_SEGMENT_WRITE_KEY || ''
});

// Validation schema with Brazilian Portuguese messages
const validationSchema = z.object({
  email: z.string()
    .email('E-mail inválido')
    .min(1, 'E-mail é obrigatório'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
      'Senha deve conter maiúsculas, minúsculas, números e caracteres especiais'
    )
});

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 300000; // 5 minutes in milliseconds

// Error messages in Brazilian Portuguese
const ERROR_MESSAGES = {
  rateLimited: 'Muitas tentativas. Tente novamente em 5 minutos.',
  invalidCredentials: 'E-mail ou senha inválidos.',
  networkError: 'Erro de conexão. Verifique sua internet.',
  serverError: 'Erro no servidor. Tente novamente mais tarde.',
  mfaRequired: 'Verificação em duas etapas necessária.'
};

interface LoginFormProps {
  onSuccess: () => void;
  onMFARequired: () => void;
  onError?: (error: Error) => void;
  className?: string;
  maxAttempts?: number;
  isLoading?: boolean;
  deviceFingerprint?: string;
  theme?: 'light' | 'dark' | 'high-contrast';
  locale?: string;
}

interface DeviceInfo {
  visitorId: string;
  confidence: number;
  components: Record<string, any>;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onMFARequired,
  className,
  maxAttempts = MAX_LOGIN_ATTEMPTS,
  theme = 'light',
  locale = 'pt-BR'
}) => {
  const { login } = useAuth();
  const [attempts, setAttempts] = useState(0);
  const [lastAttempt, setLastAttempt] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize device fingerprint
  useEffect(() => {
    const initializeFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setDeviceInfo({
        visitorId: result.visitorId,
        confidence: result.confidence.score,
        components: result.components
      });
    };

    initializeFingerprint();
  }, []);

  // Rate limiting check
  const isRateLimited = useCallback(() => {
    if (attempts >= maxAttempts) {
      const timeElapsed = Date.now() - lastAttempt;
      return timeElapsed < RATE_LIMIT_WINDOW;
    }
    return false;
  }, [attempts, lastAttempt, maxAttempts]);

  // Form submission handler
  const handleSubmit = useCallback(async (values: LoginRequest) => {
    if (isRateLimited()) {
      setError(ERROR_MESSAGES.rateLimited);
      return;
    }

    if (!deviceInfo) {
      setError('Erro de segurança. Recarregue a página.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Track login attempt
      analytics.track('login_attempt', {
        deviceId: deviceInfo.visitorId,
        timestamp: new Date().toISOString()
      });

      // Attempt login
      const response = await login({
        ...values,
        deviceFingerprint: deviceInfo.visitorId,
        ipAddress: window.location.hostname
      });

      if (response.requiresMFA) {
        onMFARequired();
        return;
      }

      // Track successful login
      analytics.track('login_success', {
        deviceId: deviceInfo.visitorId,
        timestamp: new Date().toISOString()
      });

      onSuccess();
    } catch (error: any) {
      setAttempts(prev => prev + 1);
      setLastAttempt(Date.now());

      // Track failed login
      analytics.track('login_failure', {
        deviceId: deviceInfo.visitorId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      if (error.code === 'INVALID_CREDENTIALS') {
        setError(ERROR_MESSAGES.invalidCredentials);
      } else if (error.code === 'NETWORK_ERROR') {
        setError(ERROR_MESSAGES.networkError);
      } else {
        setError(ERROR_MESSAGES.serverError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [deviceInfo, isRateLimited, login, onMFARequired, onSuccess]);

  // Error boundary fallback
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <div role="alert" className="login-error-boundary">
      <p>Ocorreu um erro inesperado.</p>
      <button onClick={resetErrorBoundary}>Tentar novamente</button>
    </div>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Form
        validationSchema={validationSchema}
        initialValues={{ email: '', password: '' }}
        onSubmit={handleSubmit}
        loading={isLoading}
        submitLabel="Entrar"
        className={classNames(
          'login-form',
          `theme-${theme}`,
          { 'high-contrast': theme === 'high-contrast' },
          className
        )}
        a11yConfig={{
          ariaLive: 'polite',
          highContrast: theme === 'high-contrast',
          screenReaderInstructions: 'Formulário de login. Preencha seu e-mail e senha.'
        }}
        securityConfig={{
          encryptFields: ['password'],
          auditLog: true,
          lgpdCompliance: true
        }}
      >
        <div className="form-field">
          <label htmlFor="email" className="form-label">
            E-mail
            <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={!!error}
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label htmlFor="password" className="form-label">
            Senha
            <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            aria-required="true"
            aria-invalid={!!error}
            className="form-input"
          />
        </div>

        {error && (
          <div 
            role="alert" 
            className="form-error"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        {isRateLimited() && (
          <div 
            role="alert" 
            className="rate-limit-warning"
            aria-live="polite"
          >
            {ERROR_MESSAGES.rateLimited}
          </div>
        )}
      </Form>
    </ErrorBoundary>
  );
};

export default LoginForm;