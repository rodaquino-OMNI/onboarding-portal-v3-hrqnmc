import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Alert, 
  Tooltip, 
  Dialog 
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Internal imports
import RiskAssessment from '../../components/health/RiskAssessment';
import Loading from '../../components/common/Loading';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useHealth } from '../../hooks/useHealth';
import { useNotification } from '../../hooks/useNotification';
import { useAuditLog } from '@austa/audit-logging';
import { useMaskData } from '@austa/data-masking';

// Styled components with WCAG compliance
const StyledContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: '1200px',
  margin: '0 auto',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  minHeight: '44px', // WCAG touch target size
  marginLeft: theme.spacing(2),
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

// Interfaces
interface UnderwriterDecision {
  enrollmentId: string;
  decision: 'APPROVE' | 'MODIFY' | 'REJECT';
  modifications: Array<{
    type: string;
    description: string;
    justification: string;
  }>;
  notes: string;
  riskFactors: Array<{
    code: string;
    severity: number;
    impact: string;
  }>;
  auditInfo: {
    timestamp: Date;
    underwriterId: string;
    action: string;
  };
}

// Main component
const UnderwriterRiskAssessment: React.FC = () => {
  const { t } = useTranslation();
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  const { logAudit } = useAuditLog();
  const { maskSensitiveData } = useMaskData();

  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<UnderwriterDecision | null>(null);

  // Fetch risk assessment data
  const { riskAssessment, isLoading, error } = useHealth(enrollmentId || '');

  // Memoized masked data
  const maskedAssessment = useMemo(() => {
    if (!riskAssessment) return null;
    return maskSensitiveData(riskAssessment, ['cpf', 'medicalHistory']);
  }, [riskAssessment, maskSensitiveData]);

  // Handle decision submission
  const handleDecisionSubmit = useCallback(async (decision: UnderwriterDecision) => {
    try {
      setIsSubmitting(true);

      // Create audit trail
      await logAudit({
        action: `UNDERWRITER_DECISION_${decision.decision}`,
        resourceId: decision.enrollmentId,
        details: {
          decision: decision.decision,
          modifications: decision.modifications,
          timestamp: new Date(),
        },
      });

      // Show success message in Brazilian Portuguese
      showSuccess(t('underwriter.decision.success'));
      
      // Navigate back to policies list
      navigate('/underwriter/policies');

    } catch (error) {
      console.error('Decision submission error:', error);
      showError(t('underwriter.decision.error'));
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  }, [logAudit, navigate, showSuccess, showError, t]);

  // Confirmation dialog handlers
  const handleConfirmDecision = useCallback(() => {
    if (pendingDecision) {
      handleDecisionSubmit(pendingDecision);
    }
  }, [pendingDecision, handleDecisionSubmit]);

  const handleDecisionClick = useCallback((decision: 'APPROVE' | 'MODIFY' | 'REJECT') => {
    const newDecision: UnderwriterDecision = {
      enrollmentId: enrollmentId || '',
      decision,
      modifications: [],
      notes: '',
      riskFactors: riskAssessment?.riskFactors || [],
      auditInfo: {
        timestamp: new Date(),
        underwriterId: '', // Will be filled by backend
        action: `UNDERWRITER_${decision}`,
      },
    };
    setPendingDecision(newDecision);
    setShowConfirmDialog(true);
  }, [enrollmentId, riskAssessment]);

  if (error) {
    return (
      <Alert 
        severity="error"
        role="alert"
        aria-live="assertive"
      >
        {t('underwriter.assessment.error')}
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <StyledContainer>
        <Typography 
          variant="h4" 
          component="h1"
          gutterBottom
          tabIndex={0}
        >
          {t('underwriter.assessment.title')}
        </Typography>

        {isLoading ? (
          <Loading size="lg" />
        ) : !maskedAssessment ? (
          <Alert severity="info">
            {t('underwriter.assessment.notFound')}
          </Alert>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <StyledPaper elevation={2}>
                <RiskAssessment 
                  enrollmentId={enrollmentId || ''} 
                  className="risk-assessment"
                />
              </StyledPaper>
            </Grid>

            <Grid item xs={12}>
              <StyledPaper 
                elevation={2}
                role="region"
                aria-label={t('underwriter.decision.section')}
              >
                <Typography variant="h6" gutterBottom>
                  {t('underwriter.decision.title')}
                </Typography>

                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    mt: 3 
                  }}
                >
                  <Tooltip title={t('underwriter.decision.reject.tooltip')}>
                    <ActionButton
                      variant="outlined"
                      color="error"
                      onClick={() => handleDecisionClick('REJECT')}
                      disabled={isSubmitting}
                      aria-label={t('underwriter.decision.reject.aria')}
                    >
                      {t('underwriter.decision.reject')}
                    </ActionButton>
                  </Tooltip>

                  <Tooltip title={t('underwriter.decision.modify.tooltip')}>
                    <ActionButton
                      variant="outlined"
                      color="warning"
                      onClick={() => handleDecisionClick('MODIFY')}
                      disabled={isSubmitting}
                      aria-label={t('underwriter.decision.modify.aria')}
                    >
                      {t('underwriter.decision.modify')}
                    </ActionButton>
                  </Tooltip>

                  <Tooltip title={t('underwriter.decision.approve.tooltip')}>
                    <ActionButton
                      variant="contained"
                      color="success"
                      onClick={() => handleDecisionClick('APPROVE')}
                      disabled={isSubmitting}
                      aria-label={t('underwriter.decision.approve.aria')}
                    >
                      {t('underwriter.decision.approve')}
                    </ActionButton>
                  </Tooltip>
                </Box>
              </StyledPaper>
            </Grid>
          </Grid>
        )}

        {/* Confirmation Dialog */}
        <Dialog
          open={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <Box sx={{ p: 3 }}>
            <Typography id="confirm-dialog-title" variant="h6" gutterBottom>
              {t('underwriter.decision.confirm.title')}
            </Typography>
            <Typography id="confirm-dialog-description" sx={{ mb: 3 }}>
              {t('underwriter.decision.confirm.message')}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmDecision}
                disabled={isSubmitting}
                autoFocus
              >
                {t('common.confirm')}
              </Button>
            </Box>
          </Box>
        </Dialog>
      </StyledContainer>
    </ErrorBoundary>
  );
};

export default UnderwriterRiskAssessment;