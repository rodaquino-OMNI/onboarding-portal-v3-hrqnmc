import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, useMediaQuery, useTheme, Snackbar, Alert } from '@mui/material';
import { Navigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';

import { Header } from '../components/common/Header';
import { Sidebar } from '../components/common/Sidebar';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../constants/routes.constants';
import { THEME } from '../constants/app.constants';

// Constants for layout dimensions and timing
const DRAWER_WIDTH = {
  desktop: 240,
  tablet: 200,
  mobile: '100%'
};

const HEADER_HEIGHT = 64;
const SESSION_TIMEOUT = 28800000; // 8 hours

// Styled components with accessibility support
const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: HEADER_HEIGHT,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
  position: 'relative',
  outline: 'none', // Will be handled by focus styles
  backgroundColor: theme.palette.background.default,
}));

const SkipLink = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: -9999,
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(1, 2),
  zIndex: theme.zIndex.tooltip + 1,
  '&:focus': {
    top: 0,
  },
}));

// Props interface
interface AdminLayoutProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = React.memo(({ children, requiredRole }) => {
  const theme = useTheme();
  const location = useLocation();
  const { user, isAuthenticated, checkRole } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // State management
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sessionWarning, setSessionWarning] = useState(false);

  // Handle sidebar toggle with accessibility
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Monitor session timeout
  useEffect(() => {
    if (isAuthenticated) {
      const warningTimeout = setTimeout(() => {
        setSessionWarning(true);
      }, SESSION_TIMEOUT - 300000); // Show warning 5 minutes before timeout

      return () => clearTimeout(warningTimeout);
    }
  }, [isAuthenticated]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && sidebarOpen && isMobile) {
      handleSidebarToggle();
    }
  }, [handleSidebarToggle, sidebarOpen, isMobile]);

  // Check authentication and role
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  if (requiredRole && !checkRole(requiredRole)) {
    return <Navigate to={ROUTES.ERROR.FORBIDDEN} replace />;
  }

  return (
    <ErrorBoundary>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Skip to main content link for accessibility */}
        <SkipLink
          component="a"
          href="#main-content"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
        >
          Pular para o conteúdo principal
        </SkipLink>

        {/* Header */}
        <Header />

        {/* Sidebar */}
        <Sidebar
          open={sidebarOpen}
          onToggle={handleSidebarToggle}
          role="navigation"
          ariaLabel="Menu principal"
        />

        {/* Main Content */}
        <MainContent
          id="main-content"
          component="main"
          role="main"
          tabIndex={-1}
          sx={{
            marginLeft: {
              xs: 0,
              sm: sidebarOpen ? DRAWER_WIDTH.tablet : 0,
              md: sidebarOpen ? DRAWER_WIDTH.desktop : 0,
            },
            width: {
              xs: '100%',
              sm: `calc(100% - ${sidebarOpen ? DRAWER_WIDTH.tablet : 0}px)`,
              md: `calc(100% - ${sidebarOpen ? DRAWER_WIDTH.desktop : 0}px)`,
            },
          }}
        >
          <Container maxWidth="xl">
            {children}
          </Container>
        </MainContent>

        {/* Session Warning */}
        <Snackbar
          open={sessionWarning}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          onClose={() => setSessionWarning(false)}
        >
          <Alert
            severity="warning"
            onClose={() => setSessionWarning(false)}
            sx={{ width: '100%' }}
          >
            Sua sessão irá expirar em 5 minutos. Por favor, salve seu trabalho.
          </Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
});

AdminLayout.displayName = 'AdminLayout';

export default AdminLayout;