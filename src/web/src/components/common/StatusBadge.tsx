import React from 'react'; // v18.0.0
import classNames from 'classnames'; // v2.3.2
import { useTranslation } from 'react-i18next'; // v13.0.0
import { EnrollmentStatus } from '../../types/enrollment.types';
import { PolicyStatus } from '../../types/policy.types';

interface StatusBadgeProps {
  status: EnrollmentStatus | PolicyStatus;
  type: 'enrollment' | 'policy';
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Gets the appropriate color scheme class based on status and type
 * @param status - Current status value
 * @param type - Type of status (enrollment or policy)
 * @returns CSS class name for color scheme
 */
const getStatusColor = (status: EnrollmentStatus | PolicyStatus, type: 'enrollment' | 'policy'): string => {
  if (type === 'enrollment') {
    switch (status as EnrollmentStatus) {
      case EnrollmentStatus.APPROVED:
        return 'badge--success';
      case EnrollmentStatus.PENDING_DOCUMENTS:
      case EnrollmentStatus.PENDING_HEALTH_ASSESSMENT:
      case EnrollmentStatus.PENDING_PAYMENT:
      case EnrollmentStatus.UNDER_REVIEW:
        return 'badge--warning';
      case EnrollmentStatus.REJECTED:
      case EnrollmentStatus.CANCELLED:
        return 'badge--error';
      case EnrollmentStatus.DRAFT:
        return 'badge--info';
      default:
        return 'badge--neutral';
    }
  } else {
    switch (status as PolicyStatus) {
      case PolicyStatus.ACTIVE:
        return 'badge--success';
      case PolicyStatus.SUSPENDED:
        return 'badge--warning';
      case PolicyStatus.CANCELLED:
      case PolicyStatus.EXPIRED:
        return 'badge--error';
      case PolicyStatus.DRAFT:
        return 'badge--info';
      default:
        return 'badge--neutral';
    }
  }
};

/**
 * A reusable status badge component that displays status with appropriate styling
 * and accessibility features.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  className,
  size = 'medium'
}) => {
  const { t } = useTranslation();

  const badgeClasses = classNames(
    'badge',
    `badge--${size}`,
    getStatusColor(status, type),
    className
  );

  // Translate status key based on type and status
  const statusKey = `status.${type}.${status.toLowerCase()}`;
  const translatedStatus = t(statusKey);

  return (
    <span 
      className={badgeClasses}
      role="status"
      aria-label={t('aria.status', { status: translatedStatus })}
    >
      {translatedStatus}
    </span>
  );
};

export default StatusBadge;

// CSS Module styles
const styles = {
  '.badge': {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    borderRadius: 'var(--border-radius-full)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    lineHeight: '1',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s ease-in-out'
  },

  '.badge--small': {
    padding: 'var(--spacing-xxs) var(--spacing-xs)',
    fontSize: 'var(--font-size-xs)'
  },

  '.badge--large': {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: 'var(--font-size-base)'
  },

  // WCAG 2.1 AA compliant color combinations
  '.badge--success': {
    backgroundColor: 'var(--color-success-light)',
    color: 'var(--color-success-dark)',
    border: '1px solid var(--color-success-border)'
  },

  '.badge--warning': {
    backgroundColor: 'var(--color-warning-light)',
    color: 'var(--color-warning-dark)',
    border: '1px solid var(--color-warning-border)'
  },

  '.badge--error': {
    backgroundColor: 'var(--color-error-light)',
    color: 'var(--color-error-dark)',
    border: '1px solid var(--color-error-border)'
  },

  '.badge--info': {
    backgroundColor: 'var(--color-info-light)',
    color: 'var(--color-info-dark)',
    border: '1px solid var(--color-info-border)'
  },

  '.badge--neutral': {
    backgroundColor: 'var(--color-neutral-light)',
    color: 'var(--color-neutral-dark)',
    border: '1px solid var(--color-neutral-border)'
  }
};