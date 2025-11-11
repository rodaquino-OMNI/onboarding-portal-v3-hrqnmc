/**
 * Not Found Error Page (404)
 * Version: 1.0.0
 *
 * User-friendly 404 error page with navigation options
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Grid,
  Link,
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import { useAuth } from '../../hooks/useAuth';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState('');

  // Set page title
  useEffect(() => {
    document.title = `404 - ${t('error.notFound.title')} | ${t('app.name')}`;
  }, [t]);

  // Handle navigation to home
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

  // Handle go back
  const handleGoBack = () => {
    navigate(-1);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // In a real application, navigate to search results
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  // Common links based on user role
  const commonLinks = [
    { label: t('error.notFound.links.dashboard'), path: '/dashboard' },
    { label: t('error.notFound.links.profile'), path: '/profile' },
    { label: t('error.notFound.links.help'), path: '/help' },
    { label: t('error.notFound.links.contact'), path: '/contact' }
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
          <ErrorOutlineIcon
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
            404
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
            {t('error.notFound.title')}
          </Typography>

          {/* Error Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            {t('error.notFound.description')}
          </Typography>

          {/* Search Box */}
          <Paper
            component="form"
            onSubmit={handleSearch}
            sx={{
              p: 2,
              mb: 4,
              display: 'flex',
              alignItems: 'center',
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            <TextField
              fullWidth
              placeholder={t('error.notFound.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="standard"
              InputProps={{
                disableUnderline: true
              }}
            />
            <Button
              type="submit"
              variant="text"
              startIcon={<SearchIcon />}
              aria-label={t('error.notFound.search')}
            >
              {t('error.notFound.search')}
            </Button>
          </Paper>

          {/* Action Buttons */}
          <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            <Grid item>
              <Button
                variant="contained"
                size="large"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
              >
                {t('error.notFound.goHome')}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                size="large"
                startIcon={<ArrowBackIcon />}
                onClick={handleGoBack}
              >
                {t('error.notFound.goBack')}
              </Button>
            </Grid>
          </Grid>

          {/* Common Links */}
          {isAuthenticated && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                {t('error.notFound.commonLinks')}
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                {commonLinks.map((link) => (
                  <Grid item key={link.path}>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => navigate(link.path)}
                      sx={{
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      {link.label}
                    </Link>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Help Text */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 4 }}
          >
            {t('error.notFound.helpText')}{' '}
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/support')}
            >
              {t('error.notFound.contactSupport')}
            </Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default NotFound;
