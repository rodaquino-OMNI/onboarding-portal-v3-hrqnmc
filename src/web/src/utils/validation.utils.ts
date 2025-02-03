import { z } from 'zod'; // v3.22.0
import xss from 'xss'; // v1.0.14
import validator from 'validator'; // v13.11.0
import { ApiValidationError } from '../types/api.types';
import { Address } from '../types/enrollment.types';

/**
 * Constants for validation rules and error messages
 */
const VALIDATION_CONSTANTS = {
  CPF_LENGTH: 11,
  PHONE_REGEX: /^\+55 \(\d{2}\) \d{5}-\d{4}$/,
  EMAIL_MAX_LENGTH: 100,
  NAME_MAX_LENGTH: 100,
  INVALID_CPF_LIST: [
    '00000000000',
    '11111111111',
    '22222222222',
    '33333333333',
    '44444444444',
    '55555555555',
    '66666666666',
    '77777777777',
    '88888888888',
    '99999999999'
  ],
  HEALTHCARE_PROVIDER_PATTERNS: {
    CRM: /^\d{4,6}-[A-Z]{2}$/,
    COREN: /^\d{6}-[A-Z]{2}$/,
    CRO: /^\d{5}-[A-Z]{2}$/,
    CRF: /^\d{5}-[A-Z]{2}$/
  },
  BRAZILIAN_STATES: [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]
} as const;

/**
 * Error codes for validation failures
 */
const ERROR_CODES = {
  CPF_INVALID: 'VAL001',
  CPF_BLACKLISTED: 'VAL002',
  PHONE_INVALID: 'VAL003',
  EMAIL_INVALID: 'VAL004',
  HEALTHCARE_PROVIDER_INVALID: 'VAL005',
  ADDRESS_INVALID: 'VAL006',
  SANITIZATION_FAILED: 'VAL007',
  STATE_INVALID: 'VAL008',
  ZIPCODE_INVALID: 'VAL009'
} as const;

/**
 * Brazilian Portuguese error messages
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.CPF_INVALID]: 'CPF inválido. Verifique os dígitos informados.',
  [ERROR_CODES.CPF_BLACKLISTED]: 'CPF inválido. Número não permitido.',
  [ERROR_CODES.PHONE_INVALID]: 'Telefone inválido. Use o formato: +55 (XX) XXXXX-XXXX',
  [ERROR_CODES.EMAIL_INVALID]: 'E-mail inválido. Verifique o formato.',
  [ERROR_CODES.HEALTHCARE_PROVIDER_INVALID]: 'Número de registro profissional inválido.',
  [ERROR_CODES.ADDRESS_INVALID]: 'Endereço inválido. Verifique os dados informados.',
  [ERROR_CODES.SANITIZATION_FAILED]: 'Dados contêm caracteres não permitidos.',
  [ERROR_CODES.STATE_INVALID]: 'Estado inválido. Use a sigla do estado (ex: SP).',
  [ERROR_CODES.ZIPCODE_INVALID]: 'CEP inválido. Use o formato: XXXXX-XXX'
} as const;

/**
 * Interface for validation result
 */
interface ValidationResult {
  isValid: boolean;
  error?: ApiValidationError;
}

/**
 * Options for data sanitization
 */
interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  preserveMedicalTerms?: boolean;
  maskSensitiveData?: boolean;
}

/**
 * Validates CPF with enhanced security checks
 */
export function validateCPF(cpf: string): ValidationResult {
  // Remove non-numeric characters
  const cleanCPF = cpf.replace(/\D/g, '');

  // Basic format validation
  if (cleanCPF.length !== VALIDATION_CONSTANTS.CPF_LENGTH) {
    return {
      isValid: false,
      error: {
        field: 'cpf',
        message: ERROR_MESSAGES.CPF_INVALID,
        code: ERROR_CODES.CPF_INVALID,
        context: { length: cleanCPF.length }
      }
    };
  }

  // Check against blacklist
  if (VALIDATION_CONSTANTS.INVALID_CPF_LIST.includes(cleanCPF)) {
    return {
      isValid: false,
      error: {
        field: 'cpf',
        message: ERROR_MESSAGES.CPF_BLACKLISTED,
        code: ERROR_CODES.CPF_BLACKLISTED,
        context: { cpf: cleanCPF }
      }
    };
  }

  // Calculate first verification digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;

  // Calculate second verification digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;

  // Validate verification digits
  if (parseInt(cleanCPF.charAt(9)) !== digit1 || parseInt(cleanCPF.charAt(10)) !== digit2) {
    return {
      isValid: false,
      error: {
        field: 'cpf',
        message: ERROR_MESSAGES.CPF_INVALID,
        code: ERROR_CODES.CPF_INVALID,
        context: { expected: `${digit1}${digit2}`, received: cleanCPF.slice(-2) }
      }
    };
  }

  return { isValid: true };
}

/**
 * Validates healthcare provider registration numbers
 */
export function validateHealthcareProvider(
  providerNumber: string,
  providerType: keyof typeof VALIDATION_CONSTANTS.HEALTHCARE_PROVIDER_PATTERNS
): ValidationResult {
  const pattern = VALIDATION_CONSTANTS.HEALTHCARE_PROVIDER_PATTERNS[providerType];
  
  if (!pattern.test(providerNumber)) {
    return {
      isValid: false,
      error: {
        field: 'providerNumber',
        message: ERROR_MESSAGES.HEALTHCARE_PROVIDER_INVALID,
        code: ERROR_CODES.HEALTHCARE_PROVIDER_INVALID,
        context: { type: providerType, format: pattern.toString() }
      }
    };
  }

  return { isValid: true };
}

/**
 * Validates Brazilian address with enhanced postal code validation
 */
export function validateAddress(address: Address): ValidationResult {
  // Validate state
  if (!VALIDATION_CONSTANTS.BRAZILIAN_STATES.includes(address.state)) {
    return {
      isValid: false,
      error: {
        field: 'state',
        message: ERROR_MESSAGES.STATE_INVALID,
        code: ERROR_CODES.STATE_INVALID,
        context: { validStates: VALIDATION_CONSTANTS.BRAZILIAN_STATES }
      }
    };
  }

  // Validate ZIP code (CEP)
  const cepRegex = /^\d{5}-\d{3}$/;
  if (!cepRegex.test(address.zipCode)) {
    return {
      isValid: false,
      error: {
        field: 'zipCode',
        message: ERROR_MESSAGES.ZIPCODE_INVALID,
        code: ERROR_CODES.ZIPCODE_INVALID,
        context: { format: 'XXXXX-XXX' }
      }
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes healthcare data with LGPD compliance
 */
export function sanitizeHealthcareData(
  input: string,
  options: SanitizationOptions = {}
): string {
  const defaultOptions: SanitizationOptions = {
    allowedTags: ['p', 'br', 'b', 'i'],
    allowedAttributes: {},
    preserveMedicalTerms: true,
    maskSensitiveData: true,
    ...options
  };

  // Create XSS filter configuration
  const xssOptions = {
    whiteList: {
      ...defaultOptions.allowedTags?.reduce((acc, tag) => ({ ...acc, [tag]: [] }), {}),
      ...defaultOptions.allowedAttributes
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  };

  // Apply XSS filtering
  let sanitized = xss(input, xssOptions);

  // Preserve medical terminology if enabled
  if (defaultOptions.preserveMedicalTerms) {
    const medicalTerms = /(diagnóstico|tratamento|medicamento|sintoma|patologia)/gi;
    sanitized = sanitized.replace(medicalTerms, (match) => match);
  }

  // Mask sensitive data if enabled
  if (defaultOptions.maskSensitiveData) {
    // Mask CPF
    sanitized = sanitized.replace(
      /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
      (match) => `${match.slice(0, 4)}.***.${match.slice(-2)}`
    );

    // Mask phone numbers
    sanitized = sanitized.replace(
      /\+55 \(\d{2}\) \d{5}-\d{4}/g,
      (match) => `${match.slice(0, 8)}*****${match.slice(-4)}`
    );
  }

  return sanitized;
}

/**
 * Validates Brazilian phone number format
 */
export function validatePhone(phone: string): ValidationResult {
  if (!VALIDATION_CONSTANTS.PHONE_REGEX.test(phone)) {
    return {
      isValid: false,
      error: {
        field: 'phone',
        message: ERROR_MESSAGES.PHONE_INVALID,
        code: ERROR_CODES.PHONE_INVALID,
        context: { format: '+55 (XX) XXXXX-XXXX' }
      }
    };
  }

  return { isValid: true };
}

/**
 * Validates email with enhanced security checks
 */
export function validateEmail(email: string): ValidationResult {
  if (!validator.isEmail(email) || email.length > VALIDATION_CONSTANTS.EMAIL_MAX_LENGTH) {
    return {
      isValid: false,
      error: {
        field: 'email',
        message: ERROR_MESSAGES.EMAIL_INVALID,
        code: ERROR_CODES.EMAIL_INVALID,
        context: { maxLength: VALIDATION_CONSTANTS.EMAIL_MAX_LENGTH }
      }
    };
  }

  return { isValid: true };
}

export {
  ValidationResult,
  SanitizationOptions,
  VALIDATION_CONSTANTS,
  ERROR_CODES,
  ERROR_MESSAGES
};