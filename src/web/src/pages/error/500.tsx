import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import MainLayout from '../../layouts/MainLayout';
import Button from '../../components/common/Button';
import { ROUTES } from '../../constants/routes.constants';
import { useAuth } from '../../hooks/useAuth';

// Styled components with AUSTA design system
const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  textAlign: 'center',
  padding: theme.spacing(3),
  gap: theme.spacing(2)
}));

const ErrorCode = styled(Typography)(({ theme }) => ({
  fontSize: 80,
  [theme.breakpoints.up('md')]: {
    fontSize: 120
  },
  fontWeight: 700,
  color: theme.palette.error.main,
  marginBottom: theme.spacing(2),
  lineHeight: 1.2
}));

const ErrorMessage = styled(Typography)(({ theme }) => ({
  fontSize: 18,
  [theme.breakpoints.up('md')]: {
    fontSize: 24
  },
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(4),
  maxWidth: 600,
  fontWeight: 500
}));

const ActionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row'
  },
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    width: 'auto'
  }
}));

const InternalServerError: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle retry action
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Handle return to dashboard based on user role
  const handleReturnToDashboard = useCallback(() => {
    const dashboardRoute = user ? ROUTES[user.role].DASHBOARD : ROUTES.AUTH.LOGIN;
    navigate(dashboardRoute);
  }, [navigate, user]);

  return (
    <MainLayout>
      <ErrorContainer
        component="main"
        role="main"
        aria-labelledby="error-title"
      >
        <ErrorCode
          variant="h1"
          id="error-title"
          aria-label="Erro 500"
        >
          500
        </ErrorCode>

        <ErrorMessage
          variant="h2"
          aria-live="polite"
        >
          Desculpe, ocorreu um erro no servidor.
          <br />
          Nossa equipe foi notificada e está trabalhando na solução.
        </ErrorMessage>

        <ActionContainer>
          <Button
            variant="primary"
            onClick={handleRetry}
            aria-label="Tentar novamente"
          >
            Tentar novamente
          </Button>

          <Button
            variant="outline"
            onClick={handleReturnToDashboard}
            aria-label="Voltar ao início"
          >
            Voltar ao início
          </Button>
        </ActionContainer>
      </ErrorContainer>
    </MainLayout>
  );
});

InternalServerError.displayName = 'InternalServerError';

export default InternalServerError;