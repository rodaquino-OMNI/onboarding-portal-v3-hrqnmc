import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Divider, List, ListItem, ListItemText, Skeleton, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

import type { RiskAssessment, RiskFactor } from '../../types/health.types';
import { RiskLevel } from '../../types/health.types';
import { useHealth } from '../../hooks/useHealth';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';

// Props interface
interface RiskAssessmentProps {
  enrollmentId: string;
  className?: string;
}

// Styled components with WCAG 2.1 AA compliance
const RiskScoreContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(3),
  textAlign: 'center',
}));

const RiskScore = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
  '&[data-risk="HIGH"], &[data-risk="CRITICAL"]': {
    color: theme.palette.error.main,
  },
}));

const RiskFactorList = styled(List)(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(2),
  '& .MuiListItem-root': {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
}));

const RecommendationsBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.info.light,
  borderRadius: theme.shape.borderRadius,
  '& .MuiTypography-root': {
    color: theme.palette.info.contrastText,
  },
}));

// Helper function to determine risk level color
const getRiskLevelColor = (level: RiskLevel): string => {
  switch (level) {
    case RiskLevel.LOW:
      return 'success';
    case RiskLevel.MEDIUM:
      return 'warning';
    case RiskLevel.HIGH:
    case RiskLevel.CRITICAL:
      return 'error';
    default:
      return 'info';
  }
};

// Main component
const RiskAssessment: React.FC<RiskAssessmentProps> = React.memo(({ 
  enrollmentId, 
  className 
}) => {
  const { t } = useTranslation();
  const { riskAssessment, isLoading, error } = useHealth(enrollmentId);

  if (error) {
    return (
      <Card className={className}>
        <Alert 
          severity="error" 
          role="alert"
          aria-live="assertive"
        >
          {t('health.assessment.error')}
        </Alert>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <Skeleton 
          variant="rectangular" 
          height={200} 
          animation="wave"
          role="progressbar"
          aria-label={t('health.assessment.loading')}
        />
      </Card>
    );
  }

  if (!riskAssessment) {
    return (
      <Card className={className}>
        <Alert 
          severity="info"
          role="status"
        >
          {t('health.assessment.notAvailable')}
        </Alert>
      </Card>
    );
  }

  return (
    <Card 
      className={className}
      role="region"
      aria-label={t('health.assessment.title')}
    >
      <RiskScoreContainer>
        <RiskScore 
          variant="h1" 
          data-risk={riskAssessment.riskLevel}
          aria-label={t('health.assessment.score', { score: riskAssessment.riskScore })}
        >
          {riskAssessment.riskScore}
        </RiskScore>
        
        <StatusBadge
          status={riskAssessment.riskLevel as any}
          type="enrollment"
          size="large"
        />
      </RiskScoreContainer>

      <Divider />

      <RiskFactorList 
        aria-label={t('health.assessment.riskFactors')}
      >
        {riskAssessment.riskFactors.map((factor: RiskFactor) => (
          <ListItem 
            key={factor.code}
            sx={{ borderLeftColor: `${factor.severity > 7 ? 'error.main' : 'warning.main'}` }}
          >
            <ListItemText
              primary={
                <Typography variant="h6">
                  {t(`health.riskFactors.${factor.code}`)}
                </Typography>
              }
              secondary={
                <Typography 
                  variant="body2" 
                  color="textSecondary"
                  sx={{ mt: 1 }}
                >
                  {factor.description}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </RiskFactorList>

      {riskAssessment.riskLevel !== RiskLevel.LOW && (
        <RecommendationsBox
          role="complementary"
          aria-label={t('health.assessment.recommendations')}
        >
          <Typography variant="h6" gutterBottom>
            {t('health.assessment.recommendationsTitle')}
          </Typography>
          <Typography>
            {t(`health.recommendations.${riskAssessment.riskLevel.toLowerCase()}`)}
          </Typography>
        </RecommendationsBox>
      )}

      <Typography 
        variant="caption" 
        color="textSecondary"
        sx={{ mt: 2, display: 'block' }}
      >
        {t('health.assessment.lastUpdated', { 
          date: new Date(riskAssessment.assessmentDate).toLocaleDateString('pt-BR') 
        })}
      </Typography>
    </Card>
  );
});

RiskAssessment.displayName = 'RiskAssessment';

export default RiskAssessment;