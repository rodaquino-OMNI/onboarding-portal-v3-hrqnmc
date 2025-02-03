import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames'; // v2.3.2
import { z } from 'zod'; // v3.22.0
import Input from './Input';
import {
  formatFormErrors,
  transformFormData,
  getFieldError,
  setFormValue,
  validateCPF,
  maskSensitiveData,
  ARIA_LABELS
} from '../../utils/form.utils';
import {
  sanitizeInput,
  validateHealthData
} from '../../utils/validation.utils';

/**
 * Configuration for form accessibility features
 */
interface FormAccessibilityConfig {
  ariaLive?: 'polite' | 'assertive';
  ariaAtomic?: boolean;
  highContrast?: boolean;
  keyboardNavigation?: boolean;
  screenReaderInstructions?: string;
}

/**
 * Configuration for form security features
 */
interface SecurityConfig {
  encryptFields?: string[];
  maskFields?: string[];
  auditLog?: boolean;
  lgpdCompliance?: boolean;
}

/**
 * Props for the Form component
 */
interface FormProps {
  children: React.ReactNode;
  validationSchema: z.Schema;
  initialValues: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  disabled?: boolean;
  className?: string;
  containsHealthData?: boolean;
  formId?: string;
  locale?: string;
  a11yConfig?: FormAccessibilityConfig;
  securityConfig?: SecurityConfig;
}

/**
 * Context value for form state management
 */
interface FormContextValue {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  setFieldValue: (field: string, value: any) => void;
  setFieldTouched: (field: string) => void;
  handleSubmit: () => Promise<void>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  resetForm: () => void;
  sensitiveFields: Record<string, boolean>;
  auditLog: FormAuditLog[];
}

/**
 * Audit log entry for form interactions
 */
interface FormAuditLog {
  timestamp: Date;
  action: string;
  field?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Create form context
export const FormContext = React.createContext<FormContextValue | undefined>(undefined);

/**
 * Enterprise-grade form component with WCAG compliance and LGPD security
 */
export const Form: React.FC<FormProps> = ({
  children,
  validationSchema,
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = 'Enviar',
  disabled = false,
  className,
  containsHealthData = false,
  formId,
  locale = 'pt-BR',
  a11yConfig = {},
  securityConfig = {}
}) => {
  // Form state
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [auditLog, setAuditLog] = useState<FormAuditLog[]>([]);

  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  // Security configuration
  const {
    encryptFields = [],
    maskFields = [],
    auditLog: enableAuditLog = true,
    lgpdCompliance = true
  } = securityConfig;

  // Accessibility configuration
  const {
    ariaLive = 'polite',
    ariaAtomic = true,
    highContrast = false,
    keyboardNavigation = true,
    screenReaderInstructions
  } = a11yConfig;

  /**
   * Logs form actions for audit trail
   */
  const logAction = useCallback((action: string, field?: string, metadata?: Record<string, any>) => {
    if (!enableAuditLog) return;

    const logEntry: FormAuditLog = {
      timestamp: new Date(),
      action,
      field,
      userId: window?.sessionStorage?.getItem('userId'),
      metadata
    };

    setAuditLog(prev => [...prev, logEntry]);
  }, [enableAuditLog]);

  /**
   * Handles field value changes with security and validation
   */
  const handleChange = useCallback((field: string, value: any) => {
    // Sanitize input
    const sanitizedValue = sanitizeInput(value);

    // Handle sensitive data
    let processedValue = sanitizedValue;
    if (maskFields.includes(field)) {
      processedValue = maskSensitiveData(processedValue);
    }

    // Update form state
    setValues(prev => setFormValue(prev, field, processedValue));
    setTouched(prev => ({ ...prev, [field]: true }));
    setIsDirty(true);

    // Log change
    logAction('field_change', field, { oldValue: values[field], newValue: processedValue });

    // Validate field if needed
    if (containsHealthData) {
      const healthValidation = validateHealthData(field, processedValue);
      if (!healthValidation.isValid) {
        setErrors(prev => ({ ...prev, [field]: healthValidation.error!.message }));
        announceError(field, healthValidation.error!.message);
      }
    }
  }, [values, containsHealthData, maskFields, logAction]);

  /**
   * Announces errors to screen readers
   */
  const announceError = useCallback((field: string, message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = `${ARIA_LABELS.ERROR_PREFIX}${field}: ${message}`;
    }
  }, []);

  /**
   * Handles form submission with validation and security measures
   */
  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    
    setIsSubmitting(true);
    logAction('form_submit_attempt');

    try {
      // Validate all fields
      const validatedData = await validationSchema.parseAsync(values);

      // Transform and secure data
      let submissionData = transformFormData(validatedData);
      if (lgpdCompliance) {
        submissionData = encryptFields.reduce((acc, field) => ({
          ...acc,
          [field]: maskSensitiveData(acc[field])
        }), submissionData);
      }

      // Submit form
      await onSubmit(submissionData);
      
      logAction('form_submit_success');
      setErrors({});
      setIsDirty(false);
    } catch (error) {
      const formattedErrors = formatFormErrors(error as z.ZodError);
      setErrors(formattedErrors);
      
      // Announce first error
      const firstError = Object.entries(formattedErrors)[0];
      if (firstError) {
        announceError(firstError[0], firstError[1]);
      }

      logAction('form_submit_error', undefined, { errors: formattedErrors });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    logAction('form_reset');
  }, [initialValues, logAction]);

  // Context value
  const contextValue: FormContextValue = {
    values,
    errors,
    touched,
    setFieldValue: handleChange,
    setFieldTouched: field => setTouched(prev => ({ ...prev, [field]: true })),
    handleSubmit,
    isSubmitting,
    isValid: Object.keys(errors).length === 0,
    isDirty,
    resetForm,
    sensitiveFields: maskFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
    auditLog
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        ref={formRef}
        id={formId}
        onSubmit={handleSubmit}
        className={classNames(
          'form-container',
          { 'high-contrast': highContrast },
          className
        )}
        noValidate
      >
        {screenReaderInstructions && (
          <div className="sr-only" role="note">
            {screenReaderInstructions}
          </div>
        )}

        {children}

        <div className="form-actions">
          <button
            type="submit"
            disabled={disabled || isSubmitting || loading}
            className={classNames(
              'form-submit',
              { 'form-submit-loading': loading }
            )}
            aria-busy={loading}
          >
            {loading ? 'Processando...' : submitLabel}
          </button>
        </div>

        <div
          ref={announcerRef}
          className="sr-only"
          role="alert"
          aria-live={ariaLive}
          aria-atomic={ariaAtomic}
        />
      </form>
    </FormContext.Provider>
  );
};

/**
 * Custom hook for accessing form context
 */
export const useForm = () => {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a Form component');
  }
  return context;
};

export default Form;