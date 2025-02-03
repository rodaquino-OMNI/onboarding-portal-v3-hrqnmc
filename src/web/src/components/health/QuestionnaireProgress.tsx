import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // v13.0.0
import classNames from 'classnames'; // v2.3.2
import StatusBadge from '../common/StatusBadge';
import { useHealth } from '../../hooks/useHealth';

interface QuestionnaireProgressProps {
  className?: string;
  showEstimatedTime?: boolean;
  showQuestionCount?: boolean;
  ariaLabel?: string;
}

/**
 * Calculates the current progress percentage of the questionnaire
 * @param questionnaire - Current questionnaire state
 * @returns Progress percentage between 0 and 100
 */
const calculateProgress = (questionnaire: any): number => {
  if (!questionnaire?.questions?.length || !questionnaire?.responses) {
    return 0;
  }

  const totalQuestions = questionnaire.questions.length;
  const answeredQuestions = Object.keys(questionnaire.responses).length;
  const percentage = (answeredQuestions / totalQuestions) * 100;

  return Math.min(Math.max(percentage, 0), 100);
};

/**
 * Estimates remaining time to complete the questionnaire based on user patterns
 * @param questionnaire - Current questionnaire state
 * @returns Estimated minutes remaining
 */
const estimateRemainingTime = (questionnaire: any): number => {
  if (!questionnaire?.startTime || !questionnaire?.responses) {
    return 0;
  }

  const elapsedTime = Date.now() - new Date(questionnaire.startTime).getTime();
  const answeredQuestions = Object.keys(questionnaire.responses).length;
  const remainingQuestions = questionnaire.questions.length - answeredQuestions;

  if (answeredQuestions === 0 || remainingQuestions === 0) {
    return 0;
  }

  const averageTimePerQuestion = elapsedTime / answeredQuestions;
  const estimatedRemainingMs = averageTimePerQuestion * remainingQuestions;

  return Math.ceil(estimatedRemainingMs / 60000); // Convert to minutes and round up
};

/**
 * Displays the progress of a health questionnaire with accessibility support
 * and internationalization.
 */
const QuestionnaireProgress: React.FC<QuestionnaireProgressProps> = ({
  className,
  showEstimatedTime = true,
  showQuestionCount = true,
  ariaLabel,
}) => {
  const { t } = useTranslation();
  const { questionnaire, currentQuestion, isLoading } = useHealth();

  const progress = useMemo(() => {
    return calculateProgress(questionnaire);
  }, [questionnaire]);

  const remainingTime = useMemo(() => {
    return showEstimatedTime ? estimateRemainingTime(questionnaire) : 0;
  }, [questionnaire, showEstimatedTime]);

  if (isLoading || !questionnaire) {
    return null;
  }

  const totalQuestions = questionnaire.questions.length;
  const currentQuestionNumber = currentQuestion 
    ? questionnaire.questions.findIndex(q => q.id === currentQuestion.id) + 1 
    : 0;

  return (
    <div 
      className={classNames('progress', className)}
      role="region"
      aria-label={ariaLabel || t('health.questionnaire.progress.label')}
    >
      <div className="progress__status">
        <StatusBadge 
          status={questionnaire.status}
          type="enrollment"
        />
        {showQuestionCount && (
          <span className="progress__count" aria-live="polite">
            {t('health.questionnaire.progress.count', {
              current: currentQuestionNumber,
              total: totalQuestions
            })}
          </span>
        )}
      </div>

      <div className="progress__info">
        <div 
          className="progress__bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('health.questionnaire.progress.completion', {
            percentage: Math.round(progress)
          })}
        >
          <div 
            className="progress__fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {showEstimatedTime && remainingTime > 0 && (
          <span className="progress__time" aria-live="polite">
            {t('health.questionnaire.progress.timeRemaining', {
              minutes: remainingTime
            })}
          </span>
        )}
      </div>
    </div>
  );
};

export default QuestionnaireProgress;

// Styles
const styles = {
  '.progress': {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--color-background-secondary)',
    borderRadius: 'var(--border-radius-md)',
    position: 'relative'
  },

  '.progress__status': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-xs)'
  },

  '.progress__info': {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)'
  },

  '.progress__bar': {
    height: '8px',
    backgroundColor: 'var(--color-background-tertiary)',
    borderRadius: 'var(--border-radius-sm)',
    overflow: 'hidden'
  },

  '.progress__fill': {
    height: '100%',
    backgroundColor: 'var(--color-primary)',
    transition: 'width 0.3s ease-in-out'
  }
};