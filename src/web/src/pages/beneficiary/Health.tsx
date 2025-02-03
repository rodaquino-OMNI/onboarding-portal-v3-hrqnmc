import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // v13.0.0
import { Box, Container, Typography, CircularProgress, Alert } from '@mui/material'; // v5.0.0
import { styled } from '@mui/material/styles';

import HealthQuestionnaire from '../../components/health/HealthQuestionnaire';
import QuestionnaireProgress from '../../components/health/QuestionnaireProgress';
import RiskAssessment from '../../components/health/RiskAssessment';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useHealth } from '../../hooks/useHealth';
import { useNotification } from '../../hooks/useNotification';

// Styled components with WCAG compliance
const PageContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  '@media (max-width: 768px)': {
    padding: theme.spacing(2),
  },
}));

const ContentSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  '&:focus': {
    outline: 'none',
  },
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
  color: theme.palette.text.secondary,
}));

interface HealthProps {
  beneficiaryId: string;
  enrollmentId: string;
}

/**
 * Health assessment page component implementing the dynamic questionnaire
 * and risk assessment visualization with full accessibility support.
 */
const Health: React.FC<HealthProps> = ({ beneficiaryId, enrollmentId }) => {
  const { t } = useTranslation();
  const { showError } = useNotification();
  const {
    questionnaire,
    currentQuestion,
    riskAssessment,
    isLoading,
    error,
    progress,
  } = useHealth(beneficiaryId);

  // Handle questionnaire completion
  const handleComplete = useCallback(() => {
    showError(t('health.questionnaire.completed'));
  }, [showError, t]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    showError(t('health.questionnaire.error', { message: error.message }));
  }, [showError, t]);

  // Set page title based on assessment state
  useEffect(() => {
    document.title = getPageTitle(questionnaire, riskAssessment, error);
  }, [questionnaire, riskAssessment, error]);

  if (error) {
    return (
      <PageContainer>
        <Alert 
          severity="error"
          role="alert"
          aria-live="assertive"
        >
          {t('health.error.loading')}
        </Alert>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <LoadingContainer>
        <CircularProgress 
          aria-label={t('health.loading')}
          role="progressbar"
        />
      </LoadingContainer>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <PageContainer>
        <ContentSection>
          <Typography 
            variant="h1" 
            component="h1"
            gutterBottom
            aria-label={t('health.title')}
          >
            {t('health.title')}
          </Typography>

          <Typography 
            variant="body1" 
            color="textSecondary"
            paragraph
            aria-label={t('health.description')}
          >
            {t('health.description')}
          </Typography>
        </ContentSection>

        <ContentSection>
          <QuestionnaireProgress
            showEstimatedTime
            showQuestionCount
            ariaLabel={t('health.progress.label')}
          />
        </ContentSection>

        {currentQuestion && (
          <ContentSection>
            <HealthQuestionnaire
              beneficiaryId={beneficiaryId}
              enrollmentId={enrollmentId}
              onComplete={handleComplete}
              onError={handleError}
            />
          </ContentSection>
        )}

        {riskAssessment && (
          <ContentSection>
            <RiskAssessment
              enrollmentId={enrollmentId}
              aria-label={t('health.riskAssessment.label')}
            />
          </ContentSection>
        )}
      </PageContainer>
    </ErrorBoundary>
  );
};

/**
 * Determines the page title based on assessment state
 */
const getPageTitle = (
  questionnaire: any,
  riskAssessment: any,
  error: Error | null
): string => {
  if (error) {
    return 'Erro - Avaliação de Saúde | AUSTA Health';
  }
  if (riskAssessment) {
    return 'Resultado da Avaliação de Saúde | AUSTA Health';
  }
  if (questionnaire) {
    return 'Questionário de Saúde | AUSTA Health';
  }
  return 'Avaliação de Saúde | AUSTA Health';
};

export default Health;