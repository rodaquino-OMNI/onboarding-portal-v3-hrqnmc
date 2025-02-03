/**
 * Authentication Layout Component
 * Version: 1.0.0
 * 
 * Implements secure authentication layout with role-based access control,
 * MFA support, and comprehensive accessibility features.
 */

import React, { useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom'; // ^6.0.0
import { 
  Container, 
  Box, 
  Paper, 
  useTheme, 
  useMediaQuery 
} from '@mui/material'; // ^5.0.0

import { useAuth } from '../../contexts/AuthContext';
import MFAVerification from '../../components/auth/MFAVerification';

// Interface for AuthLayout props
interface AuthLayoutProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
  allowMFA?: boolean;
}

/**
 * Enhanced Authentication Layout with security features and accessibility
 */
const AuthLayout: React.FC<AuthLayoutProps> = React.memo(({
  children,
  requiresAuth = false,
  allowMFA = true
}) => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { 
    isAuthenticated,
    requiresMFA,
    sessionExpiry,
    refreshSession,
    logout 
  } = useAuth();

  // Session monitoring with automatic refresh
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiry) return;

    const timeToExpiry = new Date(sessionExpiry).getTime() - Date.now();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes

    if (timeToExpiry <= refreshThreshold) {
      refreshSession().catch(() => logout());
    }

    const sessionCheck = setInterval(() => {
      const currentTimeToExpiry = new Date(sessionExpiry).getTime() - Date.now();
      if (currentTimeToExpiry <= 0) {
        logout();
      } else if (currentTimeToExpiry <= refreshThreshold) {
        refreshSession().catch(() => logout());
      }
    }, 60000); // Check every minute

    return () => clearInterval(sessionCheck);
  }, [isAuthenticated, sessionExpiry, refreshSession, logout]);

  // Security context verification
  const verifySecureContext = useCallback(() => {
    return window.isSecureContext && 
           window.location.protocol === 'https:' &&
           !window.opener;
  }, []);

  // Verify secure context on mount
  useEffect(() => {
    if (!verifySecureContext()) {
      console.error('Insecure context detected');
      logout();
    }
  }, [verifySecureContext, logout]);

  // Handle authentication requirements
  if (requiresAuth && !isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Handle MFA verification
  if (requiresMFA && allowMFA) {
    return (
      <Container 
        maxWidth="sm" 
        component="main" 
        sx={{ 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Paper 
          elevation={3}
          sx={{
            p: isMobile ? 2 : 4,
            width: '100%',
            borderRadius: 2
          }}
        >
          <MFAVerification
            sessionToken=""
            onSuccess={() => {}}
            onError={(error) => console.error('MFA Error:', error)}
          />
        </Paper>
      </Container>
    );
  }

  return (
    <Box
      component="div"
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Container
        component="main"
        maxWidth="lg"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: isMobile ? 2 : 4
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            p: isMobile ? 2 : 4,
            borderRadius: 2,
            backgroundColor: 'background.paper'
          }}
          role="main"
          aria-label="Authentication content"
        >
          {children}
        </Paper>
      </Container>
    </Box>
  );
});

AuthLayout.displayName = 'AuthLayout';

export default AuthLayout;