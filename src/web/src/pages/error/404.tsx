import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import { Box, Typography, Container } from '@mui/material'; // ^5.0.0
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next'; // ^21.0.0
import * as Sentry from '@sentry/browser'; // ^7.0.0

import MainLayout from '../../layouts/MainLayout';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes.constants';
import { THEME } from '../../constants/app.constants';

// Styled container for error content with responsive layout
const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'calc(100vh - 200px)',
  padding: theme.spacing(3),
  textAlign: 'center',
  gap: theme.spacing(2),
  margin: theme.spacing(4, 0),
}));

/**
 * 404 Error Page Component
 * Implements AUSTA's design system for error states with full accessibility support
 */
const NotFoundPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Track 404 error occurrence
  useEffect(() => {
    Sentry.captureMessage('404 Page Not Found', {
      level: 'warning',
      tags: {
        path: window.location.pathname,
        referrer: document.referrer
      }
    });

    // Set document title for screen readers
    document.title = t('error.404.title') + ' | ' + t('app.name');
  }, [t]);

  // Handle navigation back to home
  const handleNavigateHome = () => {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: 'User navigated home from 404 page',
      level: 'info'
    });
    navigate(ROUTES.BENEFICIARY.DASHBOARD);
  };

  return (
    <MainLayout>
      <Container maxWidth="sm">
        <ErrorContainer
          component="main"
          role="main"
          aria-labelledby="error-title"
        >
          {/* Error Title */}
          <Typography
            variant="h1"
            component="h1"
            id="error-title"
            color="error"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem' },
              fontWeight: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
              marginBottom: THEME.SPACING.LARGE
            }}
          >
            {t('error.404.title')}
          </Typography>

          {/* Error Description */}
          <Typography
            variant="h2"
            component="p"
            color="textSecondary"
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              marginBottom: THEME.SPACING.MEDIUM
            }}
            role="status"
            aria-live="polite"
          >
            {t('error.404.description')}
          </Typography>

          {/* Navigation Button */}
          <Button
            onClick={handleNavigateHome}
            variant="primary"
            size="lg"
            ariaLabel={t('error.404.returnHome')}
            style={{
              marginTop: THEME.SPACING.XLARGE,
              minWidth: '200px'
            }}
          >
            {t('error.404.returnHome')}
          </Button>
        </ErrorContainer>
      </Container>
    </MainLayout>
  );
});

// Display name for debugging
NotFoundPage.displayName = 'NotFoundPage';

export default NotFoundPage;