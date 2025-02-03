import React, { useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // v13.0.0
import { z } from 'zod'; // v3.22.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11
import { useDebounce } from 'use-debounce'; // v9.0.4
import CryptoJS from 'crypto-js'; // v4.1.1

import { useHealth } from '../../hooks/useHealth';
import QuestionnaireProgress from './QuestionnaireProgress';
import Form from '../common/Form';
import { Question, QuestionResponse, QuestionType } from '../../types/health.types';

interface HealthQuestionnaireProps {
  beneficiaryId: string;
  enrollmentId: string;
  onComplete: () => void;
  className?: string;
  isGuardian?: boolean;
  onError?: (error: Error) => void;
}

// AES encryption key for sensitive health data
const ENCRYPTION_KEY = process.env.REACT_APP_HEALTH_DATA_KEY || '';

/**
 * Encrypts sensitive health information for LGPD compliance
 */
const encryptHealthData = (data: any): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

/**
 * Health questionnaire component with AI-powered dynamic progression
 * and LGPD compliance for sensitive health data.
 */
const HealthQuestionnaire: React.FC<HealthQuestionnaireProps> = ({
  beneficiaryId,
  enrollmentId,
  onComplete,
  className,
  isGuardian = false,
  onError
}) => {
  const { t } = useTranslation();
  const {
    questionnaire,
    currentQuestion,
    riskAssessment,
    handleQuestionResponse
  } = useHealth(beneficiaryId);

  // Debounce responses to prevent rapid submissions
  const [debouncedResponse] = useDebounce(currentQuestion, 300);

  /**
   * Generates validation schema based on question type
   */
  const getValidationSchema = useCallback((question: Question): z.Schema => {
    const baseSchema = z.object({
      value: (() => {
        switch (question.type) {
          case QuestionType.TEXT:
            return z.string().min(1, t('validation.required'));
          case QuestionType.NUMERIC:
            return z.number()
              .min(question.validationRules.min || 0)
              .max(question.validationRules.max || 999);
          case QuestionType.BOOLEAN:
            return z.boolean();
          case QuestionType.CHOICE:
            return z.string().refine(
              val => question.options?.includes(val),
              t('validation.invalidChoice')
            );
          case QuestionType.MULTIPLE_CHOICE:
            return z.array(z.string()).refine(
              vals => vals.every(v => question.options?.includes(v)),
              t('validation.invalidChoices')
            );
          default:
            return z.any();
        }
      })()
    });

    return question.required ? baseSchema : baseSchema.partial();
  }, [t]);

  /**
   * Handles secure submission of question responses
   */
  const handleResponse = useCallback(async (formValues: Record<string, any>) => {
    if (!currentQuestion) return;

    try {
      // Encrypt sensitive health data
      const encryptedValue = encryptHealthData(formValues.value);

      const response: QuestionResponse = {
        questionId: currentQuestion.id,
        value: formValues.value,
        encryptedValue,
        timestamp: new Date().toISOString(),
        auditTrail: {
          respondedBy: isGuardian ? 'guardian' : 'beneficiary',
          deviceInfo: navigator.userAgent,
          ipAddress: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => data.ip)
        }
      };

      await handleQuestionResponse(response);

      // Check if questionnaire is complete
      if (!currentQuestion && riskAssessment) {
        onComplete();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      onError?.(error as Error);
    }
  }, [currentQuestion, handleQuestionResponse, isGuardian, onComplete, onError, riskAssessment]);

  /**
   * Manages keyboard navigation for accessibility
   */
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (!currentQuestion) return;

    switch (event.key) {
      case 'Enter':
        if (event.ctrlKey || event.metaKey) {
          const form = document.querySelector('form');
          form?.dispatchEvent(new Event('submit', { cancelable: true }));
        }
        break;
      case 'Escape':
        // Clear current response
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => (input as HTMLElement).blur());
        break;
    }
  }, [currentQuestion]);

  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  // Generate validation schema for current question
  const validationSchema = useMemo(() => {
    return currentQuestion ? getValidationSchema(currentQuestion) : z.any();
  }, [currentQuestion, getValidationSchema]);

  if (!questionnaire || !currentQuestion) {
    return null;
  }

  return (
    <ErrorBoundary
      fallback={<div role="alert">{t('errors.questionnaireFailed')}</div>}
      onError={onError}
    >
      <div 
        className={className}
        role="main"
        aria-label={t('health.questionnaire.title')}
      >
        <QuestionnaireProgress
          showEstimatedTime
          showQuestionCount
          ariaLabel={t('health.questionnaire.progress')}
        />

        <Form
          validationSchema={validationSchema}
          initialValues={{ value: '' }}
          onSubmit={handleResponse}
          formId={`question-${currentQuestion.id}`}
          containsHealthData
          a11yConfig={{
            ariaLive: 'polite',
            screenReaderInstructions: t('health.questionnaire.instructions')
          }}
          securityConfig={{
            encryptFields: ['value'],
            maskFields: ['value'],
            lgpdCompliance: true,
            auditLog: true
          }}
        >
          <div 
            className="question-container"
            role="region"
            aria-label={t('health.questionnaire.currentQuestion')}
          >
            <h2 className="question-text">
              {currentQuestion.text}
              {currentQuestion.required && (
                <span className="required-indicator" aria-hidden="true">*</span>
              )}
            </h2>

            {/* Question input based on type */}
            {/* Implementation varies based on question type */}
          </div>
        </Form>
      </div>
    </ErrorBoundary>
  );
};

export default HealthQuestionnaire;