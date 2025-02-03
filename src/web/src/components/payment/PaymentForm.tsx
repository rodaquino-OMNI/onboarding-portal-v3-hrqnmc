import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // v23.5.0
import { z } from 'zod'; // v3.22.0
import CryptoJS from 'crypto-js'; // v4.1.1
import currencyFormatter from 'currency-formatter'; // v1.5.9
import Form from '../common/Form';
import Input from '../common/Input';
import { ARIA_LABELS } from '../../utils/form.utils';

// Payment method constants
const PAYMENT_METHODS = {
  PIX: 'pix',
  CREDIT_CARD: 'credit_card',
  BOLETO: 'boleto'
} as const;

// Validation schema with Brazilian-specific rules
const VALIDATION_SCHEMA = z.object({
  paymentMethod: z.enum(['pix', 'credit_card', 'boleto']),
  cardNumber: z.string().regex(/^\d{16}$/).optional(),
  cardHolder: z.string().min(3).max(100).optional(),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/).optional(),
  cvv: z.string().regex(/^[0-9]{3,4}$/).optional(),
  cpf: z.string().regex(/^\d{11}$/),
  pixKey: z.string().optional(),
  boletoEmail: z.string().email().optional()
});

// Props interface with enhanced security features
interface PaymentFormProps {
  amount: number;
  planName: string;
  onSubmit: (paymentData: EncryptedPaymentData) => Promise<void>;
  loading: boolean;
  locale?: string;
}

// Payment data interface with PCI DSS compliance
interface PaymentData {
  paymentMethod: keyof typeof PAYMENT_METHODS;
  encryptedCardNumber?: string;
  encryptedCardHolder?: string;
  encryptedExpiryDate?: string;
  encryptedCvv?: string;
  encryptedCpf: string;
  pixKey?: string;
  boletoEmail?: string;
}

// Encryption key management (in production, this would be fetched from a secure key management service)
const ENCRYPTION_KEY = process.env.REACT_APP_PAYMENT_ENCRYPTION_KEY || 'development-key';

const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  planName,
  onSubmit,
  loading,
  locale = 'pt-BR'
}) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<keyof typeof PAYMENT_METHODS>(PAYMENT_METHODS.CREDIT_CARD);
  const [formError, setFormError] = useState<string | null>(null);

  // Format amount in Brazilian Real
  const formattedAmount = currencyFormatter.format(amount, {
    locale: 'pt-BR',
    code: 'BRL'
  });

  // Encrypt sensitive payment data with AES-256
  const encryptData = useCallback((data: string): string => {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }, []);

  // Handle payment method selection with accessibility
  const handlePaymentMethodChange = useCallback((method: keyof typeof PAYMENT_METHODS) => {
    setSelectedMethod(method);
    setFormError(null);

    // Announce change to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = t(`payment.methodSelected.${method}`);
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, [t]);

  // Handle form submission with encryption and validation
  const handlePaymentSubmit = useCallback(async (values: Record<string, any>) => {
    try {
      const paymentData: PaymentData = {
        paymentMethod: selectedMethod,
        encryptedCpf: encryptData(values.cpf)
      };

      if (selectedMethod === PAYMENT_METHODS.CREDIT_CARD) {
        paymentData.encryptedCardNumber = encryptData(values.cardNumber);
        paymentData.encryptedCardHolder = encryptData(values.cardHolder);
        paymentData.encryptedExpiryDate = encryptData(values.expiryDate);
        paymentData.encryptedCvv = encryptData(values.cvv);
      } else if (selectedMethod === PAYMENT_METHODS.PIX) {
        paymentData.pixKey = values.pixKey;
      } else if (selectedMethod === PAYMENT_METHODS.BOLETO) {
        paymentData.boletoEmail = values.boletoEmail;
      }

      await onSubmit(paymentData);
    } catch (error) {
      setFormError(t('payment.error.processing'));
      console.error('Payment processing error:', error);
    }
  }, [selectedMethod, encryptData, onSubmit, t]);

  return (
    <div className="payment-form" role="form" aria-labelledby="payment-title">
      <h2 id="payment-title" className="payment-title">
        {t('payment.title')}
      </h2>

      <div className="payment-summary" aria-live="polite">
        <p>{t('payment.planName', { name: planName })}</p>
        <p className="payment-amount">
          {t('payment.amount', { amount: formattedAmount })}
        </p>
      </div>

      <div className="payment-method-selector" role="radiogroup" aria-label={t('payment.method.select')}>
        {Object.entries(PAYMENT_METHODS).map(([key, value]) => (
          <label key={value} className="payment-method-option">
            <input
              type="radio"
              name="paymentMethod"
              value={value}
              checked={selectedMethod === value}
              onChange={() => handlePaymentMethodChange(value)}
              aria-describedby={`payment-method-description-${value}`}
            />
            <span>{t(`payment.method.${value}`)}</span>
            <span id={`payment-method-description-${value}`} className="sr-only">
              {t(`payment.method.${value}.description`)}
            </span>
          </label>
        ))}
      </div>

      <Form
        validationSchema={VALIDATION_SCHEMA}
        initialValues={{
          paymentMethod: selectedMethod,
          cpf: '',
          cardNumber: '',
          cardHolder: '',
          expiryDate: '',
          cvv: '',
          pixKey: '',
          boletoEmail: ''
        }}
        onSubmit={handlePaymentSubmit}
        loading={loading}
        submitLabel={t('payment.submit')}
        className="payment-details"
        a11yConfig={{
          ariaLive: 'polite',
          screenReaderInstructions: t('payment.accessibility.instructions')
        }}
        securityConfig={{
          encryptFields: ['cardNumber', 'cardHolder', 'expiryDate', 'cvv', 'cpf'],
          maskFields: ['cardNumber', 'cvv'],
          lgpdCompliance: true
        }}
      >
        <Input
          id="cpf"
          name="cpf"
          label={t('payment.cpf')}
          type="text"
          required
          maskType="cpf"
          aria-required="true"
        />

        {selectedMethod === PAYMENT_METHODS.CREDIT_CARD && (
          <>
            <Input
              id="cardNumber"
              name="cardNumber"
              label={t('payment.card.number')}
              type="text"
              required
              aria-required="true"
            />
            <Input
              id="cardHolder"
              name="cardHolder"
              label={t('payment.card.holder')}
              type="text"
              required
              aria-required="true"
            />
            <div className="payment-card-row">
              <Input
                id="expiryDate"
                name="expiryDate"
                label={t('payment.card.expiry')}
                type="text"
                required
                aria-required="true"
              />
              <Input
                id="cvv"
                name="cvv"
                label={t('payment.card.cvv')}
                type="text"
                required
                aria-required="true"
              />
            </div>
          </>
        )}

        {selectedMethod === PAYMENT_METHODS.PIX && (
          <Input
            id="pixKey"
            name="pixKey"
            label={t('payment.pix.key')}
            type="text"
            required
            aria-required="true"
          />
        )}

        {selectedMethod === PAYMENT_METHODS.BOLETO && (
          <Input
            id="boletoEmail"
            name="boletoEmail"
            label={t('payment.boleto.email')}
            type="email"
            required
            aria-required="true"
          />
        )}

        {formError && (
          <div 
            className="payment-error" 
            role="alert" 
            aria-live="assertive"
          >
            {formError}
          </div>
        )}
      </Form>
    </div>
  );
};

export default PaymentForm;