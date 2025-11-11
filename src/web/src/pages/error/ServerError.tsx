/**
 * Server Error Page (500)
 * Version: 1.0.0
 *
 * Internal server error page with retry and support options
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  Grid,
  Link,
  Collapse,
  IconButton,
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

const ServerError: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { showSuccess } = useNotification();

  // State management
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [errorId] = useState(() => {
    // Generate a unique error ID for tracking
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  });

  // Set page title
  useEffect(() => {
    document.title = `500 - ${t('error.serverError.title')} | ${t('app.name')}`;

    // Log error to monitoring service (e.g., Sentry)
    console.error('Server Error 500', {
      errorId,
      path: location.pathname,
      user: user?.email,
      timestamp: new Date().toISOString()
    });
  }, [t, errorId, location.pathname, user]);

  // Handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    // Attempt to reload the page
    window.location.reload();
  };

  // Handle go home
  const handleGoHome = () => {
    if (isAuthenticated && user) {
      // Navigate to role-specific dashboard
      const dashboards: Record<string, string> = {
        ADMINISTRATOR: '/admin/dashboard',
        BROKER: '/broker/dashboard',
        BENEFICIARY: '/beneficiary/dashboard',
        HR_PERSONNEL: '/hr/dashboard',
        UNDERWRITER: '/underwriter/dashboard'
      };
      navigate(dashboards[user.role] || '/');
    } else {
      navigate('/');
    }
  };

  // Handle contact support
  const handleContactSupport = () => {
    navigate('/support', {
      state: {
        errorId,
        errorType: 'server_error',
        errorPath: location.pathname
      }
    });
  };

  // Handle copy error ID
  const handleCopyErrorId = () => {
    navigator.clipboard.writeText(errorId);
    showSuccess(t('error.serverError.errorIdCopied'));
  };

  // Error details for debugging
  const errorDetails = {
    errorId,
    timestamp: new Date().toISOString(),
    path: location.pathname,
    userAgent: navigator.userAgent,
    retryCount
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center' }}>
          {/* Error Icon */}
          <ReportProblemIcon
            sx={{
              fontSize: 120,
              color: 'error.main',
              mb: 2
            }}
          />

          {/* Error Code */}
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '4rem', sm: '6rem' },
              fontWeight: 'bold',
              color: 'text.primary',
              mb: 2
            }}
          >
            500
          </Typography>

          {/* Error Title */}
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 2,
              color: 'text.primary'
            }}
          >
            {t('error.serverError.title')}
          </Typography>

          {/* Error Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            {t('error.serverError.description')}
          </Typography>

          {/* Error ID Card */}
          <Paper
            sx={{
              p: 2,
              mb: 4,
              bgcolor: 'grey.50',
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Typography variant="body2" color="text.secondary">
                  {t('error.serverError.errorIdLabel')}
                </Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                  {errorId}
                </Typography>
              </Grid>
              <Grid item>
                <IconButton
                  size="small"
                  onClick={handleCopyErrorId}
                  aria-label={t('error.serverError.copyErrorId')}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('error.serverError.errorIdHelp')}
            </Typography>
          </Paper>

          {/* Retry Warning */}
          {retryCount > 2 && (
            <Alert severity="warning" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              {t('error.serverError.multipleRetries')}
            </Alert>
          )}

          {/* Action Buttons */}
          <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            <Grid item>
              <Button
                variant="contained"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={handleRetry}
              >
                {t('error.serverError.retry')}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                size="large"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
              >
                {t('error.serverError.goHome')}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                size="large"
                color="secondary"
                startIcon={<SupportAgentIcon />}
                onClick={handleContactSupport}
              >
                {t('error.serverError.contactSupport')}
              </Button>
            </Grid>
          </Grid>

          {/* Technical Details (Expandable) */}
          <Box sx={{ mt: 4 }}>
            <Button
              variant="text"
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {t('error.serverError.technicalDetails')}
            </Button>
            <Collapse in={showDetails}>
              <Paper
                sx={{
                  p: 2,
                  mt: 2,
                  bgcolor: 'grey.100',
                  maxWidth: 600,
                  mx: 'auto',
                  textAlign: 'left'
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    overflow: 'auto'
                  }}
                >
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </Paper>
            </Collapse>
          </Box>

          {/* Additional Help */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {t('error.serverError.additionalHelp')}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/help')}
                sx={{ mr: 2 }}
              >
                {t('error.serverError.helpCenter')}
              </Link>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/status')}
              >
                {t('error.serverError.systemStatus')}
              </Link>
            </Box>
          </Box>

          {/* Apology Message */}
          <Alert
            severity="info"
            sx={{
              mt: 4,
              maxWidth: 600,
              mx: 'auto',
              textAlign: 'left'
            }}
          >
            <Typography variant="body2">
              {t('error.serverError.apology')}
            </Typography>
          </Alert>
        </Box>
      </Container>
    </Box>
  );
};

export default ServerError;
