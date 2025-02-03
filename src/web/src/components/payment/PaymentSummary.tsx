import React, { memo, useEffect, useMemo } from 'react';
import { Typography } from '@mui/material'; // v5.0.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import formatCurrency from 'currency-formatter'; // v1.5.9

import Card from '../common/Card';
import { Table } from '../common/Table';
import type { Policy } from '../../types/policy.types';

interface PaymentSummaryProps {
  policy: Policy;
  processingFee: number;
  className?: string;
  onTotalChange?: (total: number) => void;
}

/**
 * Calculates total payment amount including premium and fees
 * @param premium - Monthly premium amount
 * @param processingFee - Processing fee amount
 * @returns Total payment amount rounded to 2 decimal places
 */
const calculateTotal = (premium: number, processingFee: number): number => {
  if (premium < 0 || processingFee < 0) {
    throw new Error('Payment amounts cannot be negative');
  }
  // Use proper decimal arithmetic to avoid floating point errors
  return Number((premium + processingFee).toFixed(2));
};

/**
 * Payment Summary component displaying breakdown of health plan costs
 * Implements WCAG 2.1 AA compliance and responsive design
 */
const PaymentSummary: React.FC<PaymentSummaryProps> = memo(({
  policy,
  processingFee,
  className,
  onTotalChange
}) => {
  const { t } = useTranslation();

  // Format currency values following Brazilian standards
  const formatBRL = (value: number): string => {
    return formatCurrency.format(value, {
      code: 'BRL',
      locale: 'pt-BR',
      precision: 2
    });
  };

  // Calculate and memoize payment details
  const paymentDetails = useMemo(() => {
    const total = calculateTotal(policy.monthlyPremium, processingFee);
    return {
      items: [
        {
          id: 'monthly-premium',
          description: t('payment.monthlyPremium'),
          amount: policy.monthlyPremium
        },
        {
          id: 'processing-fee',
          description: t('payment.processingFee'),
          amount: processingFee
        }
      ],
      total
    };
  }, [policy.monthlyPremium, processingFee, t]);

  // Notify parent component of total changes
  useEffect(() => {
    onTotalChange?.(paymentDetails.total);
  }, [paymentDetails.total, onTotalChange]);

  // Table columns configuration
  const columns = [
    {
      key: 'description',
      header: t('payment.description'),
      width: '70%',
      ariaLabel: t('payment.descriptionColumn')
    },
    {
      key: 'amount',
      header: t('payment.amount'),
      width: '30%',
      render: (row: { amount: number }) => formatBRL(row.amount),
      ariaLabel: t('payment.amountColumn')
    }
  ];

  return (
    <Card
      className={className}
      testId="payment-summary"
      ariaLabel={t('payment.summaryTitle')}
      role="region"
    >
      <Typography
        variant="h6"
        component="h2"
        gutterBottom
        className="summaryTitle"
      >
        {t('payment.summaryTitle')}
      </Typography>

      <div className="summaryContainer">
        <Table
          columns={columns}
          data={paymentDetails.items}
          ariaLabel={t('payment.itemsBreakdown')}
        />

        <div className="totalAmount" role="text">
          <Typography
            variant="h5"
            component="p"
            aria-live="polite"
            aria-atomic="true"
          >
            {t('payment.total')}: {formatBRL(paymentDetails.total)}
          </Typography>
        </div>
      </div>

      <style jsx>{`
        .summaryContainer {
          margin-top: var(--spacing-md);
          margin-bottom: var(--spacing-md);
          padding: var(--spacing-md);
          background-color: var(--color-background-secondary);
          border-radius: var(--border-radius-md);
        }

        .summaryTitle {
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-md);
        }

        .totalAmount {
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-sm);
          border-top: 2px solid var(--color-primary);
          text-align: right;
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
        }

        @media (max-width: 768px) {
          .summaryContainer {
            padding: var(--spacing-sm);
          }

          .totalAmount {
            font-size: var(--font-size-lg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .summaryContainer {
            transition: none;
          }
        }
      `}</style>
    </Card>
  );
});

PaymentSummary.displayName = 'PaymentSummary';

export default PaymentSummary;