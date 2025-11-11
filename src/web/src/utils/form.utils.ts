import { z } from 'zod'; // v3.22.0
import { ApiError } from '../types/api.types';
import { validateCPF, validateEmail, validatePhone, validateZipCode } from './validation.utils';

// Re-export validation functions
export { validateCPF } from './validation.utils';

/**
 * Constants for form handling
 */
const DATE_FORMAT = 'DD/MM/YYYY';
const NUMERIC_FIELDS = ['age', 'zipCode', 'phone', 'cpf'] as const;

/**
 * ARIA labels for error messages in Brazilian Portuguese
 */
const ARIA_LABELS = {
  ERROR_PREFIX: 'Erro: ',
  REQUIRED_FIELD: 'Campo obrigatório: ',
  INVALID_FORMAT: 'Formato inválido: ',
  VALIDATION_ERROR: 'Erro de validação: '
};

/**
 * Formats validation errors into user-friendly messages with ARIA support
 */
export function formatFormErrors(error: z.ZodError | ApiError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      const fieldName = err.path.join('.');
      const message = `${ARIA_LABELS.ERROR_PREFIX}${err.message}`;
      formattedErrors[fieldName] = message;
    });
  } else {
    // Handle API errors
    Object.entries(error.details).forEach(([field, message]) => {
      formattedErrors[field] = `${ARIA_LABELS.ERROR_PREFIX}${message}`;
    });
  }

  return formattedErrors;
}

/**
 * Transforms form data for API submission with proper formatting and LGPD compliance
 */
export function transformFormData(formData: Record<string, any>): Record<string, any> {
  const transformed: Record<string, any> = {};

  Object.entries(formData).forEach(([key, value]) => {
    // Skip null or undefined values
    if (value == null) return;

    // Handle different field types
    if (NUMERIC_FIELDS.includes(key as any)) {
      // Remove formatting characters for numeric fields
      transformed[key] = value.toString().replace(/\D/g, '');
    } else if (key === 'dateOfBirth') {
      // Convert date to ISO format
      transformed[key] = new Date(value).toISOString();
    } else if (typeof value === 'string') {
      // Sanitize string values
      transformed[key] = value.trim();
    } else if (Array.isArray(value)) {
      // Handle array values
      transformed[key] = value.map(item => 
        typeof item === 'string' ? item.trim() : item
      );
    } else {
      transformed[key] = value;
    }
  });

  return transformed;
}

/**
 * Retrieves localized error message for a specific form field with accessibility support
 */
export function getFieldError(
  fieldName: string, 
  errors: Record<string, string>
): string | undefined {
  const error = errors[fieldName];
  if (!error) return undefined;

  // Add ARIA attributes for screen readers
  return {
    'aria-invalid': 'true',
    'aria-errormessage': `${fieldName}-error`,
    message: error
  } as unknown as string;
}

/**
 * Updates form state with new field value and proper type conversion
 */
export function setFormValue(
  formState: Record<string, any>,
  fieldName: string,
  value: any
): Record<string, any> {
  const newState = { ...formState };

  // Validate and format based on field type
  switch (fieldName) {
    case 'cpf':
      const cpfResult = validateCPF(value);
      if (cpfResult.isValid) {
        newState[fieldName] = value;
      }
      break;

    case 'email':
      const emailResult = validateEmail(value);
      if (emailResult.isValid) {
        newState[fieldName] = value;
      }
      break;

    case 'phone':
      const phoneResult = validatePhone(value);
      if (phoneResult.isValid) {
        newState[fieldName] = value;
      }
      break;

    case 'zipCode':
      const zipResult = validateZipCode(value);
      if (zipResult.isValid) {
        newState[fieldName] = value;
      }
      break;

    case 'dateOfBirth':
      // Ensure valid date format
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        newState[fieldName] = date;
      }
      break;

    default:
      // Handle nested object paths
      if (fieldName.includes('.')) {
        const parts = fieldName.split('.');
        let current = newState;
        for (let i = 0; i < parts.length - 1; i++) {
          current[parts[i]] = current[parts[i]] || {};
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
      } else {
        newState[fieldName] = value;
      }
  }

  return newState;
}

/**
 * Formats field value based on Brazilian standards
 */
export function formatFieldValue(fieldName: string, value: any): string {
  if (!value) return '';

  switch (fieldName) {
    case 'cpf':
      return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    case 'phone':
      return value.replace(/(\d{2})(\d{5})(\d{4})/, '+55 ($1) $2-$3');
    case 'zipCode':
      return value.replace(/(\d{5})(\d{3})/, '$1-$2');
    case 'dateOfBirth':
      return new Date(value).toLocaleDateString('pt-BR');
    default:
      return value.toString();
  }
}

/**
 * Masks sensitive data for logging and display purposes (LGPD compliance)
 */
export function maskSensitiveData(data: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};
  const sensitiveFields = ['cpf', 'password', 'email', 'phone', 'ssn', 'healthData'];

  Object.entries(data).forEach(([key, value]) => {
    if (sensitiveFields.includes(key)) {
      if (key === 'cpf' && typeof value === 'string') {
        // Mask CPF: XXX.XXX.XXX-XX
        masked[key] = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, 'XXX.XXX.$3-XX');
      } else if (key === 'email' && typeof value === 'string') {
        // Mask email: x***@domain.com
        const [local, domain] = value.split('@');
        masked[key] = `${local[0]}***@${domain}`;
      } else if (key === 'phone' && typeof value === 'string') {
        // Mask phone: +55 (XX) XXXXX-1234
        masked[key] = value.replace(/(\d{2})(\d{5})(\d{4})/, '+55 (XX) XXXXX-$3');
      } else {
        masked[key] = '***';
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  });

  return masked;
}

export {
  DATE_FORMAT,
  NUMERIC_FIELDS,
  ARIA_LABELS
};