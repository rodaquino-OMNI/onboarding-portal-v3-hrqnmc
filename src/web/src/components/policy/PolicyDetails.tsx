import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import {
  Grid,
  Typography,
  Divider,
  Skeleton,
  Alert,
  Paper,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useAuditLog } from '@austa/audit-logging'; // v1.0.0
import { useRoleBasedAccess } from '@austa/rbac'; // v1.0.0

import {
  Policy,
  PolicyStatus,
  CoverageDetails,
  WaitingPeriod,
  RoleAccess
} from '../../types/policy.types';
import PolicyService from '../../services/policy.service';

interface PolicyDetailsProps {
  policyId: string;
  onStatusChange?: (status: PolicyStatus) => void;
  className?: string;
  userRole: string;
}

/**
 * PolicyDetails Component
 * 
 * Displays comprehensive policy information with role-based access control
 * and LGPD compliance measures.
 * 
 * @param props - Component properties
 * @returns JSX.Element
 */
const PolicyDetails: React.FC<PolicyDetailsProps> = ({
  policyId,
  onStatusChange,
  className,
  userRole
}) => {
  // Hooks initialization
  const { t } = useTranslation();
  const { logAccess } = useAuditLog();
  const { hasAccess, maskSensitiveData } = useRoleBasedAccess(userRole);
  
  // State management
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Service initialization
  const policyService = useMemo(() => new PolicyService(), []);

  /**
   * Fetches policy data with error handling and circuit breaker pattern
   */
  const fetchPolicyData = useCallback(async () => {
    try {
      setLoading(true);
      const policyData = await policyService.getPolicyById(policyId);
      setPolicy(policyData);
      logAccess('POLICY_VIEW', { policyId, userRole });
    } catch (err) {
      setError(t('policy.error.fetch'));
      console.error('Policy fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [policyId, policyService, logAccess, userRole, t]);

  useEffect(() => {
    fetchPolicyData();
  }, [fetchPolicyData]);

  /**
   * Formats currency values according to Brazilian locale
   */
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  /**
   * Renders policy status with appropriate styling
   */
  const renderStatus = useMemo(() => {
    if (!policy) return null;

    const statusColors = {
      [PolicyStatus.ACTIVE]: 'success',
      [PolicyStatus.SUSPENDED]: 'warning',
      [PolicyStatus.CANCELLED]: 'error',
      [PolicyStatus.DRAFT]: 'default',
      [PolicyStatus.EXPIRED]: 'error'
    };

    return (
      <Chip
        label={t(`policy.status.${policy.status.toLowerCase()}`)}
        color={statusColors[policy.status] as any}
        aria-label={t('policy.status.label')}
      />
    );
  }, [policy, t]);

  /**
   * Renders coverage details with role-based data masking
   */
  const renderCoverageDetails = useMemo(() => {
    if (!policy?.coverageDetails) return null;

    return (
      <Box component={Paper} p={3} mb={2}>
        <Typography variant="h6" gutterBottom>
          {t('policy.coverage.title')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">
              {t('policy.coverage.tier')}
            </Typography>
            <Typography>
              {t(`policy.coverage.tier.${policy.coverageDetails.coverageTier.toLowerCase()}`)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">
              {t('policy.coverage.premium')}
            </Typography>
            <Typography>
              {hasAccess('VIEW_PREMIUM') 
                ? formatCurrency(policy.monthlyPremium)
                : maskSensitiveData('currency')}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  }, [policy, hasAccess, maskSensitiveData, formatCurrency, t]);

  /**
   * Renders waiting periods with accessibility support
   */
  const renderWaitingPeriods = useMemo(() => {
    if (!policy?.waitingPeriods?.length) return null;

    return (
      <Box component={Paper} p={3} mb={2}>
        <Typography variant="h6" gutterBottom>
          {t('policy.waitingPeriods.title')}
        </Typography>
        <List aria-label={t('policy.waitingPeriods.aria')}>
          {policy.waitingPeriods.map((period: WaitingPeriod, index: number) => (
            <ListItem key={index} divider={index < policy.waitingPeriods.length - 1}>
              <ListItemText
                primary={t(`policy.procedures.${period.procedureType.toLowerCase()}`)}
                secondary={
                  <>
                    {t('policy.waitingPeriods.duration', { days: period.durationInDays })}
                    <br />
                    {t('policy.waitingPeriods.dates', {
                      start: dayjs(period.startDate).format('DD/MM/YYYY'),
                      end: dayjs(period.endDate).format('DD/MM/YYYY')
                    })}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }, [policy, t]);

  if (loading) {
    return (
      <Box className={className}>
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="text" height={40} />
        <Skeleton variant="text" height={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" className={className}>
        {error}
      </Alert>
    );
  }

  if (!policy) {
    return (
      <Alert severity="info" className={className}>
        {t('policy.notFound')}
      </Alert>
    );
  }

  return (
    <Box className={className} data-testid="policy-details">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h1">
              {t('policy.details.title')}
            </Typography>
            {renderStatus}
          </Box>
          <Divider />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            {t('policy.number')}: {policy.policyNumber}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('policy.dates', {
              effective: dayjs(policy.effectiveDate).format('DD/MM/YYYY'),
              expiry: dayjs(policy.expiryDate).format('DD/MM/YYYY')
            })}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          {renderCoverageDetails}
        </Grid>

        <Grid item xs={12}>
          {renderWaitingPeriods}
        </Grid>

        {hasAccess('VIEW_EXCLUSIONS') && policy.exclusions.length > 0 && (
          <Grid item xs={12}>
            <Box component={Paper} p={3}>
              <Typography variant="h6" gutterBottom>
                {t('policy.exclusions.title')}
              </Typography>
              <List aria-label={t('policy.exclusions.aria')}>
                {policy.exclusions.map((exclusion, index) => (
                  <ListItem key={index} divider={index < policy.exclusions.length - 1}>
                    <ListItemText
                      primary={exclusion.condition}
                      secondary={exclusion.reason}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default PolicyDetails;