/**
 * Unauthorized Error Page (403)
 * Version: 1.0.0
 *
 * Access denied page with login/logout options and admin contact
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import BlockIcon from '@mui/icons-material/Block';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { useAuth } from '../../hooks/useAuth';

const Unauthorized: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  // Set page title
  useEffect(() => {
    document.title = `403 - ${t('error.unauthorized.title')} | ${t('app.name')}`;

    // Log unauthorized access attempt
    console.warn('Unauthorized access attempt', {
      path: location.pathname,
      user: user?.email,
      role: user?.role,
      timestamp: new Date().toISOString()
    });
  }, [t, location.pathname, user]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle login
  const handleLogin = () => {
    navigate('/login', {
      state: { from: location.pathname }
    });
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

  // Handle contact admin
  const handleContactAdmin = () => {
    navigate('/contact-admin', {
      state: {
        requestedPath: location.pathname,
        currentRole: user?.role
      }
    });
  };

  // Get user role display name
  const getUserRoleDisplay = () => {
    if (!user?.role) return null;
    return t(`roles.${user.role.toLowerCase()}`);
  };

  // Common reasons for unauthorized access
  const commonReasons = [
    t('error.unauthorized.reasons.insufficientPermissions'),
    t('error.unauthorized.reasons.roleRestriction'),
    t('error.unauthorized.reasons.sessionExpired'),
    t('error.unauthorized.reasons.accountInactive')
  ];

  // Steps to resolve
  const resolutionSteps = [
    t('error.unauthorized.steps.verifyAccount'),
    t('error.unauthorized.steps.contactAdmin'),
    t('error.unauthorized.steps.checkRole'),
    t('error.unauthorized.steps.relogin')
  ];

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
          <BlockIcon
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
            403
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
            {t('error.unauthorized.title')}
          </Typography>

          {/* Error Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            {t('error.unauthorized.description')}
          </Typography>

          {/* User Info (if authenticated) */}
          {isAuthenticated && user && (
            <Paper
              sx={{
                p: 2,
                mb: 4,
                bgcolor: 'grey.50',
                maxWidth: 600,
                mx: 'auto'
              }}
            >
              <Grid container spacing={1} sx={{ textAlign: 'left' }}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    {t('error.unauthorized.currentUser')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>{t('error.unauthorized.name')}:</strong>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">{user.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>{t('error.unauthorized.email')}:</strong>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">{user.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>{t('error.unauthorized.role')}:</strong>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">{getUserRoleDisplay()}</Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Explanation Alert */}
          <Alert
            severity="warning"
            icon={<InfoOutlinedIcon />}
            sx={{ mb: 4, maxWidth: 600, mx: 'auto', textAlign: 'left' }}
          >
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              {t('error.unauthorized.whyBlocked')}
            </Typography>
            <List dense>
              {commonReasons.map((reason, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <InfoOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={reason}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Alert>

          {/* Action Buttons */}
          <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            <Grid item>
              <Button
                variant="contained"
                size="large"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
              >
                {t('error.unauthorized.goHome')}
              </Button>
            </Grid>
            {isAuthenticated ? (
              <Grid item>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                >
                  {t('error.unauthorized.logout')}
                </Button>
              </Grid>
            ) : (
              <Grid item>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<LoginIcon />}
                  onClick={handleLogin}
                >
                  {t('error.unauthorized.login')}
                </Button>
              </Grid>
            )}
            <Grid item>
              <Button
                variant="outlined"
                size="large"
                color="secondary"
                startIcon={<ContactSupportIcon />}
                onClick={handleContactAdmin}
              >
                {t('error.unauthorized.contactAdmin')}
              </Button>
            </Grid>
          </Grid>

          {/* Resolution Steps */}
          <Paper
            sx={{
              p: 3,
              mb: 4,
              maxWidth: 600,
              mx: 'auto',
              textAlign: 'left'
            }}
          >
            <Typography variant="h6" gutterBottom>
              {t('error.unauthorized.howToResolve')}
            </Typography>
            <List>
              {resolutionSteps.map((step, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${index + 1}. ${step}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Additional Information */}
          <Alert
            severity="info"
            sx={{
              maxWidth: 600,
              mx: 'auto',
              textAlign: 'left'
            }}
          >
            <Typography variant="body2">
              {t('error.unauthorized.additionalInfo')}
            </Typography>
          </Alert>

          {/* Help Text */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 4 }}
          >
            {t('error.unauthorized.needHelp')}{' '}
            <Button
              variant="text"
              size="small"
              onClick={() => navigate('/help')}
            >
              {t('error.unauthorized.viewHelp')}
            </Button>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Unauthorized;
