import React, { useState, useCallback, useEffect } from 'react';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth.types';

// Constants for layout dimensions
const HEADER_HEIGHT = 64;
const SIDEBAR_WIDTH = 240;
const SIDEBAR_WIDTH_COLLAPSED = 64;
const TRANSITION_DURATION = 225;

// Props interface with accessibility support
interface BrokerLayoutProps {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}

// Styled components for layout structure
const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: HEADER_HEIGHT,
  minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: TRANSITION_DURATION,
  }),
  backgroundColor: theme.palette.background.default,
  position: 'relative',
  zIndex: theme.zIndex.drawer + 1,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginLeft: 0,
  },
}));

const LayoutContainer = styled(Box)({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
});

/**
 * BrokerLayout component that implements the broker-specific interface structure
 * with enhanced security, accessibility, and session management features.
 */
const BrokerLayout: React.FC<BrokerLayoutProps> = React.memo(({
  children,
  className,
  testId = 'broker-layout'
}) => {
  const theme = useTheme();
  const { user, isAuthenticated, checkSessionValidity } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Verify broker role access
  useEffect(() => {
    if (isAuthenticated && user?.role !== UserRole.BROKER) {
      window.location.href = '/unauthorized';
    }
  }, [isAuthenticated, user]);

  // Monitor session status
  useEffect(() => {
    if (!isAuthenticated) return;

    const sessionCheck = setInterval(() => {
      if (!checkSessionValidity()) {
        window.location.href = '/auth/login';
      }
    }, 60000); // Check every minute

    return () => clearInterval(sessionCheck);
  }, [isAuthenticated, checkSessionValidity]);

  // Handle sidebar toggle with animation
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Handle responsive layout adjustments
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <ErrorBoundary>
      <LayoutContainer
        className={className}
        data-testid={testId}
        role="main"
        aria-label="Broker Dashboard Layout"
      >
        <Header
          testId="broker-header"
          className="broker-layout-header"
        />
        
        <Sidebar
          open={sidebarOpen}
          onToggle={handleSidebarToggle}
          role="navigation"
          ariaLabel="Broker Navigation Menu"
          testId="broker-sidebar"
        />

        <MainContent
          component="main"
          sx={{
            marginLeft: {
              sm: sidebarOpen ? `${SIDEBAR_WIDTH}px` : `${SIDEBAR_WIDTH_COLLAPSED}px`,
              xs: 0,
            },
            width: {
              sm: `calc(100% - ${sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_COLLAPSED}px)`,
              xs: '100%',
            },
          }}
        >
          <Container
            maxWidth="xl"
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {children}
          </Container>
        </MainContent>
      </LayoutContainer>
    </ErrorBoundary>
  );
});

// Display name for debugging
BrokerLayout.displayName = 'BrokerLayout';

export default BrokerLayout;