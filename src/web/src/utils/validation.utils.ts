import { z } from 'zod'; // v3.22.0
import xss from 'xss'; // v1.0.14
import validator from 'validator'; // v13.11.0
import CryptoJS from 'crypto-js'; // v4.2.0
import { ApiValidationError } from '../types/api.types';
import { Address } from '../types/enrollment.types';
import { BRAZILIAN_STATES, BrazilianState, isBrazilianState } from './type-guards.utils';

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
  BRAZILIAN_STATES
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
  CPF_INVALID: 'CPF inválido. Verifique os dígitos informados.',
  CPF_BLACKLISTED: 'CPF inválido. Número não permitido.',
  PHONE_INVALID: 'Telefone inválido. Use o formato: +55 (XX) XXXXX-XXXX',
  EMAIL_INVALID: 'E-mail inválido. Verifique o formato.',
  HEALTHCARE_PROVIDER_INVALID: 'Número de registro profissional inválido.',
  ADDRESS_INVALID: 'Endereço inválido. Verifique os dados informados.',
  SANITIZATION_FAILED: 'Dados contêm caracteres não permitidos.',
  STATE_INVALID: 'Estado inválido. Use a sigla do estado (ex: SP).',
  ZIPCODE_INVALID: 'CEP inválido. Use o formato: XXXXX-XXX',
  VAL001: 'CPF inválido. Verifique os dígitos informados.',
  VAL002: 'CPF inválido. Número não permitido.',
  VAL003: 'Telefone inválido. Use o formato: +55 (XX) XXXXX-XXXX',
  VAL004: 'E-mail inválido. Verifique o formato.',
  VAL005: 'Número de registro profissional inválido.',
  VAL006: 'Endereço inválido. Verifique os dados informados.',
  VAL007: 'Dados contêm caracteres não permitidos.',
  VAL008: 'Estado inválido. Use a sigla do estado (ex: SP).',
  VAL009: 'CEP inválido. Use o formato: XXXXX-XXX'
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
  if ((VALIDATION_CONSTANTS.INVALID_CPF_LIST as readonly string[]).includes(cleanCPF)) {
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
  // Validate required fields
  if (!address.street || address.street.trim() === '') {
    return {
      isValid: false,
      error: {
        field: 'street',
        message: ERROR_MESSAGES.ADDRESS_INVALID,
        code: ERROR_CODES.ADDRESS_INVALID,
        context: { missingField: 'street' }
      }
    };
  }

  if (!address.neighborhood || address.neighborhood.trim() === '') {
    return {
      isValid: false,
      error: {
        field: 'neighborhood',
        message: ERROR_MESSAGES.ADDRESS_INVALID,
        code: ERROR_CODES.ADDRESS_INVALID,
        context: { missingField: 'neighborhood' }
      }
    };
  }

  if (!address.city || address.city.trim() === '') {
    return {
      isValid: false,
      error: {
        field: 'city',
        message: ERROR_MESSAGES.ADDRESS_INVALID,
        code: ERROR_CODES.ADDRESS_INVALID,
        context: { missingField: 'city' }
      }
    };
  }

  // Validate state
  if (!isBrazilianState(address.state)) {
    return {
      isValid: false,
      error: {
        field: 'state',
        message: ERROR_MESSAGES.STATE_INVALID,
        code: ERROR_CODES.STATE_INVALID,
        context: { validStates: BRAZILIAN_STATES }
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

  // Extract and validate area code
  const areaCodeMatch = phone.match(/\((\d{2})\)/);
  if (areaCodeMatch) {
    const areaCode = parseInt(areaCodeMatch[1]);
    // Valid Brazilian area codes range from 11 to 99, excluding some ranges
    // Area codes 10 and below don't exist, and 99 is not valid
    if (areaCode < 11 || areaCode === 99) {
      return {
        isValid: false,
        error: {
          field: 'phone',
          message: ERROR_MESSAGES.PHONE_INVALID,
          code: ERROR_CODES.PHONE_INVALID,
          context: { format: '+55 (XX) XXXXX-XXXX', invalidAreaCode: areaCode }
        }
      };
    }
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

/**
 * Validates Brazilian ZIP code (CEP)
 * @param zipCode ZIP code to validate
 * @returns Validation result
 */
export function validateZipCode(zipCode: string): ValidationResult {
  if (!zipCode) {
    return {
      isValid: false,
      error: {
        field: 'zipCode',
        message: 'CEP é obrigatório',
        code: ERROR_CODES.ZIPCODE_INVALID
      }
    };
  }

  const cleanZipCode = zipCode.replace(/[^\d]/g, '');

  if (cleanZipCode.length !== 8) {
    return {
      isValid: false,
      error: {
        field: 'zipCode',
        message: 'CEP deve conter 8 dígitos',
        code: ERROR_CODES.ZIPCODE_INVALID
      }
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Use xss library to sanitize
  return xss(input, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
}

/**
 * Validates health assessment data
 * @param data Health data to validate
 * @returns Validation result
 */
export function validateHealthData(data: any): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      error: {
        field: 'healthData',
        message: 'Dados de saúde inválidos',
        code: ERROR_CODES.ZIPCODE_INVALID
      }
    };
  }

  // Basic validation - can be extended based on requirements
  if (data.responses && !Array.isArray(data.responses)) {
    return {
      isValid: false,
      error: {
        field: 'responses',
        message: 'Respostas devem ser um array',
        code: ERROR_CODES.ZIPCODE_INVALID
      }
    };
  }

  return { isValid: true };
}

/**
 * Encrypts a field value using AES encryption
 * @param value Value to encrypt
 * @param key Encryption key
 * @returns Encrypted string
 */
export function encryptField(value: string, key: string): string {
  if (!value || !key) return value;

  try {
    const encrypted = CryptoJS.AES.encrypt(value, key);
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return value;
  }
}

export type {
  ValidationResult,
  SanitizationOptions
};

export {
  VALIDATION_CONSTANTS,
  ERROR_CODES,
  ERROR_MESSAGES
};