import React, { useState, useCallback, useEffect } from 'react';
import { Box, Container, useMediaQuery, useTheme, Snackbar } from '@mui/material';
import { styled } from '@mui/material/styles';

import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';

// Constants for layout dimensions
const SIDEBAR_WIDTH = 240;
const SIDEBAR_WIDTH_COLLAPSED = 64;
const HEADER_HEIGHT = 64;

// Props interface with accessibility support
interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  disableSidebar?: boolean;
}

// Styled components with AUSTA design system
const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create('background-color', {
    duration: theme.transitions.duration.standard,
  }),
}));

const ContentWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'sidebarOpen' && prop !== 'isMobile',
})<{ sidebarOpen: boolean; isMobile: boolean }>(({ theme, sidebarOpen, isMobile }) => ({
  display: 'flex',
  flex: 1,
  paddingTop: HEADER_HEIGHT,
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create(['margin', 'padding'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.standard,
  }),
  marginLeft: isMobile ? 0 : (sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_COLLAPSED),
  [theme.breakpoints.down('sm')]: {
    marginLeft: 0,
  },
}));

const MainContent = styled(Container)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.standard,
  }),
  minWidth: 0,
  maxWidth: theme.breakpoints.values.lg,
}));

const MainLayout: React.FC<MainLayoutProps> = React.memo(({
  children,
  className,
  disableSidebar = false,
}) => {
  const theme = useTheme();
  const { checkSessionValidity, logout } = useAuth();
  const { showWarning } = useNotification();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);

  // Handle sidebar toggle with focus management
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Monitor session status
  useEffect(() => {
    const checkSession = () => {
      if (!checkSessionValidity()) {
        if (!sessionWarningOpen) {
          setSessionWarningOpen(true);
          showWarning('Sua sessão irá expirar em breve. Deseja continuar?', {
            duration: 0,
            action: (
              <button
                onClick={() => {
                  setSessionWarningOpen(false);
                  // Implement session refresh logic here
                }}
                style={{ color: theme.palette.primary.main }}
              >
                Continuar
              </button>
            ),
          });
        }
      }
    };

    const sessionInterval = setInterval(checkSession, 60000); // Check every minute

    return () => {
      clearInterval(sessionInterval);
    };
  }, [checkSessionValidity, showWarning, sessionWarningOpen, theme]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen && isMobile) {
        handleSidebarToggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSidebarToggle, sidebarOpen, isMobile]);

  return (
    <ErrorBoundary>
      <MainContainer className={className}>
        <Header onMenuClick={handleSidebarToggle} />
        
        {!disableSidebar && (
          <Sidebar
            open={sidebarOpen}
            onToggle={handleSidebarToggle}
            role="navigation"
            ariaLabel="Menu principal"
          />
        )}

        <ContentWrapper
          sidebarOpen={sidebarOpen && !disableSidebar}
          isMobile={isMobile}
          component="main"
          role="main"
          aria-label="Conteúdo principal"
        >
          <MainContent>
            {children}
          </MainContent>
        </ContentWrapper>

        <Snackbar
          open={sessionWarningOpen}
          message="Sua sessão irá expirar em breve"
          action={
            <>
              <button
                onClick={() => {
                  setSessionWarningOpen(false);
                  logout();
                }}
                style={{ color: theme.palette.error.main }}
              >
                Sair
              </button>
            </>
          }
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </MainContainer>
    </ErrorBoundary>
  );
});

MainLayout.displayName = 'MainLayout';

export default MainLayout;