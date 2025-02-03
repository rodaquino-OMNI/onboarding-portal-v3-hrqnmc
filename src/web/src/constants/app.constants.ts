import { UserRole } from '../types/auth.types';

/**
 * Core application configuration constants
 */
export const APP_CONFIG = {
  APP_NAME: 'AUSTA Health Portal',
  VERSION: '1.0.0',
  DEFAULT_LOCALE: 'pt-BR',
  SUPPORTED_LOCALES: ['pt-BR', 'en'] as const,
  BUILD_INFO: {
    timestamp: process.env.BUILD_TIMESTAMP,
    environment: process.env.NODE_ENV,
    apiUrl: process.env.API_URL,
  },
} as const;

/**
 * Comprehensive UI theme constants based on design system specifications
 */
export const THEME = {
  COLORS: {
    PRIMARY: '#0047AB',
    SECONDARY: '#00A86B',
    ERROR: '#DC3545',
    WARNING: '#FFC107',
    SUCCESS: '#28A745',
    INFO: '#17A2B8',
    BACKGROUND: '#FFFFFF',
    TEXT: '#333333',
    CONTRAST: {
      PRIMARY: '#FFFFFF',
      SECONDARY: '#FFFFFF',
      ERROR: '#FFFFFF',
    },
  },
  TYPOGRAPHY: {
    FONT_FAMILY: 'Roboto, sans-serif',
    FONT_SIZES: {
      SMALL: '14px',
      MEDIUM: '16px',
      LARGE: '18px',
      XLARGE: '24px',
    },
    FONT_WEIGHTS: {
      REGULAR: 400,
      MEDIUM: 500,
      BOLD: 700,
    },
    LINE_HEIGHTS: {
      SMALL: 1.2,
      MEDIUM: 1.5,
      LARGE: 1.8,
    },
  },
  SPACING: {
    UNIT: '8px',
    SMALL: '8px',
    MEDIUM: '16px',
    LARGE: '24px',
    XLARGE: '32px',
    XXLARGE: '48px',
  },
  ANIMATION: {
    DURATION: {
      FAST: '200ms',
      MEDIUM: '300ms',
      SLOW: '500ms',
    },
    EASING: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
      EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },
  Z_INDEX: {
    MODAL: 1000,
    OVERLAY: 900,
    DRAWER: 800,
    HEADER: 700,
    TOOLTIP: 600,
  },
} as const;

/**
 * API configuration and performance settings based on technical requirements
 */
export const API_CONFIG = {
  TIMEOUTS: {
    DEFAULT: 30000, // 30 seconds
    UPLOAD: 60000, // 60 seconds for document uploads
    HEALTH_ASSESSMENT: 45000, // 45 seconds for health assessment
    SLOW_CONNECTION_MULTIPLIER: 1.5,
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_FACTOR: 2,
    INITIAL_DELAY: 1000, // 1 second
  },
  ENDPOINTS: {
    BASE_URL: process.env.API_URL,
    AUTH: '/api/v1/auth',
    ENROLLMENT: '/api/v1/enrollments',
    HEALTH: '/api/v1/health-assessment',
    DOCUMENTS: '/api/v1/documents',
  },
} as const;

/**
 * Role-based access level constants
 */
export const ACCESS_LEVELS = {
  [UserRole.ADMINISTRATOR]: {
    canAccessAdmin: true,
    canManageUsers: true,
    canViewAllData: true,
    canApproveEnrollments: true,
  },
  [UserRole.UNDERWRITER]: {
    canAccessAdmin: false,
    canManageUsers: false,
    canViewAllData: true,
    canApproveEnrollments: true,
  },
  [UserRole.BROKER]: {
    canAccessAdmin: false,
    canManageUsers: false,
    canViewAllData: false,
    canInitiateEnrollment: true,
  },
  [UserRole.HR_PERSONNEL]: {
    canAccessAdmin: false,
    canManageUsers: false,
    canViewAllData: false,
    canInitiateEnrollment: true,
  },
  [UserRole.BENEFICIARY]: {
    canAccessAdmin: false,
    canManageUsers: false,
    canViewAllData: false,
    canViewOwnData: true,
  },
  [UserRole.PARENT_GUARDIAN]: {
    canAccessAdmin: false,
    canManageUsers: false,
    canViewAllData: false,
    canViewDependentData: true,
  },
} as const;

/**
 * Accessibility constants based on WCAG 2.1 AA requirements
 */
export const ACCESSIBILITY = {
  MIN_CONTRAST_RATIO: 4.5,
  MIN_TOUCH_TARGET_SIZE: '44px',
  FOCUS_OUTLINE: '2px solid #0047AB',
  SCREEN_READER_ONLY: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    border: '0',
  },
} as const;

/**
 * Form validation constants
 */
export const VALIDATION = {
  CPF: {
    PATTERN: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
    MESSAGE: 'CPF deve estar no formato 000.000.000-00',
  },
  EMAIL: {
    PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    MESSAGE: 'Digite um email válido',
  },
  PHONE: {
    PATTERN: /^\+55\s\(\d{2}\)\s\d{5}-\d{4}$/,
    MESSAGE: 'Telefone deve estar no formato +55 (00) 00000-0000',
  },
} as const;

/**
 * Date and time format constants for Brazilian locale
 */
export const DATE_TIME_FORMATS = {
  SHORT_DATE: 'dd/MM/yyyy',
  LONG_DATE: 'dd \'de\' MMMM \'de\' yyyy',
  TIME: 'HH:mm',
  DATETIME: 'dd/MM/yyyy HH:mm',
  TIMEZONE: 'America/Sao_Paulo',
} as const;

/**
 * File upload constants
 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_DOCUMENT_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ] as const,
  MAX_FILES_PER_REQUEST: 5,
} as const;