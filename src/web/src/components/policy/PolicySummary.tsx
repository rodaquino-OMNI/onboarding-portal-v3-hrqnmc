import React, { useCallback, useEffect, useMemo } from 'react';
import styled from '@mui/material/styles/styled';
import { Card, Typography, Chip, Divider, CircularProgress, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useWebSocket from 'react-use-websocket';
import { Policy, PolicyStatus } from '../../types/policy.types';
import ErrorBoundary from '../common/ErrorBoundary';
import { THEME, DATE_TIME_FORMATS } from '../../constants/app.constants';

// Styled components with AUSTA design system specifications
const SummaryContainer = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  position: 'relative',
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

const StatusChip = styled(Chip)(({ theme, color }) => ({
  marginBottom: theme.spacing(2),
  minHeight: '32px',
  '& .MuiChip-label': {
    fontWeight: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
  },
}));

const DetailSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const LoadingOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: 1,
});

// Props interface
interface PolicySummaryProps {
  policy: Policy;
  className?: string;
  showDetails?: boolean;
  onStatusChange?: (status: PolicyStatus) => void;
}

// Currency formatter for Brazilian Real
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const PolicySummary: React.FC<PolicySummaryProps> = React.memo(({
  policy,
  className,
  showDetails = true,
  onStatusChange,
}) => {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = React.useState(false);

  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocket(`${process.env.WS_URL}/policies/${policy.id}`, {
    shouldReconnect: true,
    reconnectInterval: 3000,
  });

  // Handle real-time policy updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const update = JSON.parse(lastMessage.data);
        if (update.status !== policy.status) {
          setIsUpdating(true);
          onStatusChange?.(update.status);
          setTimeout(() => setIsUpdating(false), 500);
        }
      } catch (error) {
        console.error('Error processing policy update:', error);
      }
    }
  }, [lastMessage, policy.status, onStatusChange]);

  // Status color mapping
  const getStatusColor = useCallback((status: PolicyStatus) => {
    const statusColors = {
      [PolicyStatus.ACTIVE]: 'success',
      [PolicyStatus.SUSPENDED]: 'warning',
      [PolicyStatus.CANCELLED]: 'error',
      [PolicyStatus.DRAFT]: 'default',
      [PolicyStatus.EXPIRED]: 'error',
    };
    return statusColors[status];
  }, []);

  // Format dates according to Brazilian locale
  const formattedDates = useMemo(() => ({
    effective: format(new Date(policy.effectiveDate), DATE_TIME_FORMATS.LONG_DATE, { locale: ptBR }),
    expiry: format(new Date(policy.expiryDate), DATE_TIME_FORMATS.LONG_DATE, { locale: ptBR }),
  }), [policy.effectiveDate, policy.expiryDate]);

  return (
    <ErrorBoundary>
      <SummaryContainer 
        className={className}
        tabIndex={0}
        role="region"
        aria-label={t('policy.summary.title')}
      >
        {isUpdating && (
          <LoadingOverlay>
            <CircularProgress 
              aria-label={t('common.loading')}
              size={40}
            />
          </LoadingOverlay>
        )}

        <StatusChip
          label={t(`policy.status.${policy.status.toLowerCase()}`)}
          color={getStatusColor(policy.status)}
          aria-label={t('policy.summary.status')}
        />

        <Typography 
          variant="h6" 
          component="h2"
          gutterBottom
        >
          {t('policy.summary.policyNumber', { number: policy.policyNumber })}
        </Typography>

        <DetailSection>
          <Typography 
            variant="subtitle2" 
            color="textSecondary"
            gutterBottom
          >
            {t('policy.summary.premium')}
          </Typography>
          <Typography variant="h5">
            {formatCurrency(policy.monthlyPremium)}
          </Typography>
        </DetailSection>

        <Divider sx={{ my: 2 }} />

        {showDetails && (
          <>
            <DetailSection>
              <Typography variant="subtitle2" gutterBottom>
                {t('policy.summary.coverage')}
              </Typography>
              <Box sx={{ mt: 1 }}>
                {Object.entries(policy.coverageDetails).map(([key, value]) => (
                  value && (
                    <Typography 
                      key={key} 
                      variant="body2" 
                      sx={{ mb: 0.5 }}
                      component="div"
                    >
                      • {t(`policy.coverage.${key.toLowerCase()}`)}
                    </Typography>
                  )
                ))}
              </Box>
            </DetailSection>

            <DetailSection>
              <Typography variant="subtitle2" gutterBottom>
                {t('policy.summary.dates')}
              </Typography>
              <Typography variant="body2" component="div">
                {t('policy.summary.effectiveDate')}: {formattedDates.effective}
              </Typography>
              <Typography variant="body2" component="div">
                {t('policy.summary.expiryDate')}: {formattedDates.expiry}
              </Typography>
            </DetailSection>

            {policy.waitingPeriods.length > 0 && (
              <DetailSection>
                <Typography variant="subtitle2" gutterBottom>
                  {t('policy.summary.waitingPeriods')}
                </Typography>
                {policy.waitingPeriods.map((period, index) => (
                  <Typography 
                    key={index} 
                    variant="body2" 
                    component="div"
                    sx={{ mb: 0.5 }}
                  >
                    {t(`policy.procedures.${period.procedureType.toLowerCase()}`)}: {
                      t('policy.summary.daysRemaining', { 
                        days: period.durationInDays 
                      })
                    }
                  </Typography>
                ))}
              </DetailSection>
            )}
          </>
        )}
      </SummaryContainer>
    </ErrorBoundary>
  );
});

PolicySummary.displayName = 'PolicySummary';

export default PolicySummary;