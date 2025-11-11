import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import type { Enrollment } from '../../types/enrollment.types';
import { EnrollmentStatus } from '../../types/enrollment.types';
import { useEnrollment } from '../../hooks/useEnrollment';
import { useAuth } from '../../hooks/useAuth';
import { DATE_TIME_FORMATS } from '../../constants/app.constants';

interface EnrollmentSummaryProps {
  enrollment: Enrollment;
  onStatusChange?: (enrollmentId: string, status: EnrollmentStatus) => Promise<void>;
  onClick?: (enrollmentId: string) => void;
  className?: string;
}

const EnrollmentSummary: React.FC<EnrollmentSummaryProps> = ({
  enrollment,
  onStatusChange,
  onClick,
  className
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { changeEnrollmentStatus } = useEnrollment();

  // Format CPF with proper masking
  const formatCPF = useCallback((cpf: string): string => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }, []);

  // Memoize formatted date to prevent unnecessary re-renders
  const formattedDate = useMemo(() => {
    return format(
      new Date(enrollment.createdAt),
      DATE_TIME_FORMATS.DATETIME,
      { locale: ptBR }
    );
  }, [enrollment.createdAt]);

  // Handle status change with role-based access control
  const handleStatusChange = useCallback(async (
    event: React.MouseEvent,
    newStatus: EnrollmentStatus
  ) => {
    event.stopPropagation();
    if (!onStatusChange) return;

    try {
      await changeEnrollmentStatus(enrollment.id, newStatus);
      await onStatusChange(enrollment.id, newStatus);
    } catch (error) {
      console.error('Failed to update enrollment status:', error);
    }
  }, [enrollment.id, onStatusChange, changeEnrollmentStatus]);

  // Handle card click with keyboard accessibility
  const handleCardClick = useCallback((
    event: React.MouseEvent | React.KeyboardEvent
  ) => {
    if (
      event.type === 'keydown' &&
      (event as React.KeyboardEvent).key !== 'Enter' &&
      (event as React.KeyboardEvent).key !== ' '
    ) {
      return;
    }

    onClick?.(enrollment.id);
  }, [enrollment.id, onClick]);

  return (
    <Card
      className={`enrollment-summary ${className || ''}`}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardClick as any}
      ariaLabel={t('enrollment.summary.cardLabel', {
        name: enrollment.beneficiary.name,
        status: t(`enrollment.status.${enrollment.status.toLowerCase()}`)
      })}
      testId={`enrollment-summary-${enrollment.id}`}
    >
      <div className="enrollment-summary__content">
        <div className="enrollment-summary__details">
          <h3 className="text-lg font-medium text-gray-900">
            {enrollment.beneficiary.name}
          </h3>
          <p className="text-sm text-gray-600">
            {t('enrollment.summary.cpf')}: {formatCPF(enrollment.beneficiary.cpf)}
          </p>
          <p className="text-sm text-gray-600">
            {t('enrollment.summary.createdAt')}: {formattedDate}
          </p>
        </div>

        <div className="enrollment-summary__status">
          <StatusBadge
            status={enrollment.status}
            type="enrollment"
            size="medium"
          />
          {enrollment.riskLevel && (
            <span
              className={`risk-level risk-level--${enrollment.riskLevel.toLowerCase()}`}
              role="status"
              aria-label={t('enrollment.summary.riskLevel', {
                level: t(`enrollment.riskLevel.${enrollment.riskLevel.toLowerCase()}`)
              })}
            >
              {t(`enrollment.riskLevel.${enrollment.riskLevel.toLowerCase()}`)}
            </span>
          )}
        </div>
      </div>

      <style>{`
        .enrollment-summary {
          cursor: pointer;
          transition: transform 0.2s ease-in-out;
          position: relative;
          outline: none;
        }

        .enrollment-summary:hover {
          transform: translateY(-2px);
        }

        .enrollment-summary:focus-visible {
          box-shadow: var(--box-shadow-focus);
        }

        .enrollment-summary__content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        .enrollment-summary__details {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .enrollment-summary__status {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: var(--spacing-xs);
        }

        .risk-level {
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--border-radius-sm);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
        }

        .risk-level--low {
          background-color: var(--color-success-light);
          color: var(--color-success-dark);
        }

        .risk-level--medium {
          background-color: var(--color-warning-light);
          color: var(--color-warning-dark);
        }

        .risk-level--high {
          background-color: var(--color-error-light);
          color: var(--color-error-dark);
        }

        @media (max-width: 768px) {
          .enrollment-summary__content {
            flex-direction: column;
            align-items: flex-start;
          }

          .enrollment-summary__status {
            align-items: flex-start;
            width: 100%;
          }
        }
      `}</style>
    </Card>
  );
};

export default EnrollmentSummary;