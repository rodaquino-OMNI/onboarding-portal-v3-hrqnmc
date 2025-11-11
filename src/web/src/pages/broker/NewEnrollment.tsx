import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAnalytics } from '../../hooks/useAnalytics';

import BeneficiaryForm from '../../components/enrollment/BeneficiaryForm';
import GuardianForm from '../../components/enrollment/GuardianForm';
import { useEnrollment } from '../../hooks/useEnrollment';
import { useAuth } from '../../hooks/useAuth';
import ErrorBoundary from '../../components/common/ErrorBoundary';

import { Beneficiary, Guardian } from '../../types/enrollment.types';
import { THEME } from '../../constants/app.constants';

// Step type for enrollment flow
type EnrollmentStep = 'beneficiary' | 'guardian' | 'review';

// Component state interface
interface NewEnrollmentState {
  currentStep: EnrollmentStep;
  beneficiaryData: Beneficiary | null;
  guardianData: Guardian | null;
  validationErrors: Record<string, string[]>;
  isSubmitting: boolean;
  progress: number;
}

const NewEnrollment: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const analytics = useAnalytics();
  const { validateBrokerRole } = useAuth();
  const { createNewEnrollment, isLoading, enrollmentError } = useEnrollment();

  // Component state
  const [state, setState] = useState<NewEnrollmentState>({
    currentStep: 'beneficiary',
    beneficiaryData: null,
    guardianData: null,
    validationErrors: {},
    isSubmitting: false,
    progress: 0
  });

  // Validate broker role on mount
  useEffect(() => {
    const validateAccess = async () => {
      const hasAccess = await validateBrokerRole();
      if (!hasAccess) {
        navigate('/unauthorized', { replace: true });
      }
    };
    validateAccess();
  }, [validateBrokerRole, navigate]);

  // Track enrollment progress
  useEffect(() => {
    analytics.trackEvent('enrollment_progress', {
      step: state.currentStep,
      progress: state.progress
    });
  }, [state.currentStep, state.progress, analytics]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    const steps = {
      beneficiary: 33,
      guardian: 66,
      review: 100
    };
    return steps[state.currentStep];
  }, [state.currentStep]);

  /**
   * Handles beneficiary form submission with validation
   */
  const handleBeneficiarySubmit = useCallback(async (beneficiaryData: Beneficiary) => {
    try {
      setState(prev => ({
        ...prev,
        isSubmitting: true,
        validationErrors: {}
      }));

      // Track form completion
      analytics.trackEvent('beneficiary_form_complete', {
        isMinor: new Date().getFullYear() - new Date(beneficiaryData.dateOfBirth).getFullYear() < 18
      });

      // Check if beneficiary is minor
      const age = new Date().getFullYear() - new Date(beneficiaryData.dateOfBirth).getFullYear();
      const isMinor = age < 18;

      setState(prev => ({
        ...prev,
        beneficiaryData,
        currentStep: isMinor ? 'guardian' : 'review',
        progress: isMinor ? 33 : 66,
        isSubmitting: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        validationErrors: {
          beneficiary: [(error as Error).message]
        }
      }));
    }
  }, [analytics]);

  /**
   * Handles guardian form submission and enrollment creation
   */
  const handleGuardianSubmit = useCallback(async (guardianData: Guardian) => {
    try {
      setState(prev => ({
        ...prev,
        isSubmitting: true,
        validationErrors: {}
      }));

      if (!state.beneficiaryData) {
        throw new Error('Beneficiary data is required');
      }

      // Track guardian form completion
      analytics.trackEvent('guardian_form_complete', {
        relationship: guardianData.relationship
      });

      // Create enrollment with beneficiary and guardian data
      await createNewEnrollment({
        ...state.beneficiaryData,
        guardianId: guardianData.id
      });

      setState(prev => ({
        ...prev,
        guardianData,
        currentStep: 'review',
        progress: 100,
        isSubmitting: false
      }));

      // Navigate to success page
      navigate('/enrollment/success', {
        state: { enrollmentId: state.beneficiaryData.id }
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        validationErrors: {
          guardian: [(error as Error).message]
        }
      }));
    }
  }, [state.beneficiaryData, createNewEnrollment, navigate, analytics]);

  return (
    <ErrorBoundary>
      <div
        role="main"
        aria-label={t('enrollment.newEnrollment.title')}
        style={{
          padding: THEME.SPACING.LARGE,
          maxWidth: '800px',
          margin: '0 auto'
        }}
      >
        {/* Progress indicator */}
        <div
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            marginBottom: THEME.SPACING.LARGE
          }}
        >
          {t('enrollment.progress', { progress: progressPercentage })}
        </div>

        {/* Enrollment forms */}
        {state.currentStep === 'beneficiary' && (
          <BeneficiaryForm
            onSubmit={handleBeneficiarySubmit}
            loading={state.isSubmitting}
            initialData={state.beneficiaryData}
            userRole="BROKER"
            encryptionKey={process.env.VITE_ENCRYPTION_KEY!}
            auditLogger={analytics.logEvent}
          />
        )}

        {state.currentStep === 'guardian' && (
          <GuardianForm
            onSubmit={handleGuardianSubmit}
            loading={state.isSubmitting}
            initialValues={state.guardianData}
            encryptionKey={process.env.VITE_ENCRYPTION_KEY!}
          />
        )}

        {/* Error messages */}
        {Object.entries(state.validationErrors).map(([field, errors]) => (
          <div
            key={field}
            role="alert"
            aria-live="polite"
            style={{
              color: THEME.COLORS.ERROR,
              marginTop: THEME.SPACING.MEDIUM
            }}
          >
            {errors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        ))}
      </div>
    </ErrorBoundary>
  );
};

export default NewEnrollment;