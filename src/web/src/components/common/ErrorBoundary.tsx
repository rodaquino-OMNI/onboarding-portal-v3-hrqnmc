import React, { Component } from 'react';
import type { ErrorInfo } from 'react';
import styled from '@mui/material/styles/styled';
import { Card, Typography, Button } from '@mui/material';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { THEME } from '../../constants/app.constants';

// Styled components with AUSTA design system specifications
const ErrorContainer = styled(Card)({
  padding: THEME.SPACING.XXLARGE,
  margin: '2rem auto',
  textAlign: 'center',
  backgroundColor: '#FFF5F5',
  border: `1px solid ${THEME.COLORS.ERROR}`,
  maxWidth: '600px',
});

const ErrorMessage = styled(Typography)({
  color: THEME.COLORS.ERROR,
  marginBottom: THEME.SPACING.LARGE,
  fontWeight: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
  fontSize: THEME.TYPOGRAPHY.FONT_SIZES.LARGE,
});

const RetryButton = styled(Button)({
  marginTop: THEME.SPACING.LARGE,
  backgroundColor: THEME.COLORS.PRIMARY,
  color: THEME.COLORS.CONTRAST.PRIMARY,
  minHeight: '44px', // WCAG touch target size
  '&:focus-visible': {
    outline: THEME.COLORS.PRIMARY,
    outlineOffset: '2px',
  },
  '&:hover': {
    backgroundColor: '#003D91', // Darker shade for hover state
  },
});

// Interfaces
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private notificationContext: ReturnType<typeof useNotificationContext> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };

    // Bind methods
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Sanitize error message to remove sensitive data
    const sanitizedError = new Error(error.message.replace(/([A-Z0-9]){24,}/g, '[REDACTED]'));
    
    return {
      hasError: true,
      error: sanitizedError,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    console.error('Error Boundary caught an error:', {
      error: error.message,
      stack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Show error notification in Brazilian Portuguese
    if (this.notificationContext) {
      this.notificationContext.showNotification(
        'Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando na solução.',
        {
          severity: 'error',
          duration: 8000
        }
      );
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry(): void {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Return custom fallback UI if provided
      if (fallback) {
        return fallback;
      }

      // Return default error UI with accessibility features
      return (
        <ErrorContainer role="alert" aria-live="polite">
          <ErrorMessage
            variant="h5"
            as="h2"
            role="alert"
            aria-live="assertive"
          >
            Desculpe, ocorreu um erro
          </ErrorMessage>
          <Typography
            color="textSecondary"
            gutterBottom
            aria-describedby="error-description"
          >
            Por favor, tente novamente ou entre em contato com o suporte se o problema persistir.
          </Typography>
          {error && (
            <Typography
              id="error-description"
              variant="body2"
              color="error"
              sx={{ mt: 2, mb: 2 }}
            >
              Código do erro: {error.name}
            </Typography>
          )}
          <RetryButton
            onClick={this.handleRetry}
            variant="contained"
            aria-label="Tentar novamente"
            tabIndex={0}
          >
            Tentar novamente
          </RetryButton>
        </ErrorContainer>
      );
    }

    return children;
  }
}

export default ErrorBoundary;