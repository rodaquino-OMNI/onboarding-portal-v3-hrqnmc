import React, { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, Typography, Button, Skeleton, Alert } from '@mui/material';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import { useEnrollment } from '../../hooks/useEnrollment';
import { useHealth } from '../../hooks/useHealth';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { EnrollmentStatus } from '../../types/enrollment.types';
import { RiskLevel } from '../../types/health.types';

// Refresh interval for real-time updates (in milliseconds)
const REFRESH_INTERVAL = 30000;

const BeneficiaryDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showError } = useNotification();
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize hooks with error handling
  const {
    enrollment,
    isLoading: isEnrollmentLoading,
    error: enrollmentError,
    refetch: refetchEnrollment
  } = useEnrollment(user?.id);

  const {
    questionnaire,
    currentQuestion,
    riskAssessment,
    progress
  } = useHealth(user?.id || '');

  // Set up periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Refresh data when refresh key changes
  useEffect(() => {
    if (user?.id) {
      refetchEnrollment().catch(error => {
        showError(t('errors.refresh_failed'));
        console.error('Dashboard refresh error:', error);
      });
    }
  }, [refreshKey, user?.id, refetchEnrollment, showError, t]);

  const renderEnrollmentStatus = useCallback(() => {
    return (
      <Card
        testId="enrollment-status-card"
        ariaLabel={t('aria.enrollment_status')}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          {t('dashboard.enrollment_status')}
        </Typography>
        {enrollment && (
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <StatusBadge
                status={enrollment.status}
                type="enrollment"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1">
                {t(`enrollment.status_description.${enrollment.status.toLowerCase()}`)}
              </Typography>
            </Grid>
          </Grid>
        )}
      </Card>
    );
  }, [enrollment, t]);

  const renderHealthAssessment = useCallback(() => {
    return (
      <Card
        testId="health-assessment-card"
        ariaLabel={t('aria.health_assessment')}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          {t('dashboard.health_assessment')}
        </Typography>
        {questionnaire && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body1" gutterBottom>
                {currentQuestion ? (
                  t('health.current_question_progress', { progress: Math.round(progress * 100) })
                ) : (
                  t('health.assessment_complete')
                )}
              </Typography>
            </Grid>
            {riskAssessment && (
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  {t('health.risk_level')}: {t(`health.risk_levels.${riskAssessment.riskLevel.toLowerCase()}`)}
                </Typography>
              </Grid>
            )}
          </Grid>
        )}
      </Card>
    );
  }, [questionnaire, currentQuestion, riskAssessment, progress, t]);

  const renderRequiredActions = useCallback(() => {
    if (!enrollment) return null;

    return (
      <Card
        testId="required-actions-card"
        ariaLabel={t('aria.required_actions')}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          {t('dashboard.required_actions')}
        </Typography>
        <Grid container spacing={2}>
          {enrollment.status === EnrollmentStatus.PENDING_DOCUMENTS && (
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                href="/documents/upload"
                className="actionButton"
                aria-label={t('aria.upload_documents')}
              >
                {t('actions.upload_documents')}
              </Button>
            </Grid>
          )}
          {enrollment.status === EnrollmentStatus.PENDING_HEALTH_ASSESSMENT && (
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                href="/health-assessment"
                className="actionButton"
                aria-label={t('aria.complete_assessment')}
              >
                {t('actions.complete_assessment')}
              </Button>
            </Grid>
          )}
        </Grid>
      </Card>
    );
  }, [enrollment, t]);

  if (isEnrollmentLoading) {
    return (
      <div className="dashboardContainer">
        <Grid container spacing={3}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} key={item}>
              <Skeleton
                variant="rectangular"
                height={200}
                className="loadingSkeleton"
                aria-label={t('aria.loading')}
              />
            </Grid>
          ))}
        </Grid>
      </div>
    );
  }

  if (enrollmentError) {
    return (
      <div className="dashboardContainer">
        <Alert
          severity="error"
          aria-live="assertive"
          role="alert"
        >
          {t('errors.dashboard_load_failed')}
        </Alert>
      </div>
    );
  }

  return (
    <div className="dashboardContainer">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {renderEnrollmentStatus()}
        </Grid>
        <Grid item xs={12}>
          {renderHealthAssessment()}
        </Grid>
        <Grid item xs={12}>
          {renderRequiredActions()}
        </Grid>
      </Grid>
    </div>
  );
};

// CSS styles
const styles = {
  dashboardContainer: {
    padding: 'var(--spacing-lg)',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '100vh'
  },
  actionButton: {
    marginTop: 'var(--spacing-sm)',
    minWidth: '200px',
    height: '48px'
  },
  loadingSkeleton: {
    borderRadius: 'var(--border-radius-md)',
    marginBottom: 'var(--spacing-sm)'
  }
} as const;

export default BeneficiaryDashboard;