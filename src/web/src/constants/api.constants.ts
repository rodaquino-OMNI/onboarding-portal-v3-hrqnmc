/**
 * API Constants for Pre-paid Health Plan Onboarding Portal
 * Version: 1.0.0
 * 
 * This file contains all API-related constants including base URLs, endpoints,
 * timeouts, headers, and security configurations for frontend-backend communication.
 * Ensures LGPD compliance and meets performance requirements.
 */

/**
 * Core API configuration including base URL, version, and region settings
 */
export const API_CONFIG = {
  BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
  VERSION: process.env.VITE_API_VERSION || 'v1',
  REGION: process.env.VITE_API_REGION || 'brazil-south',
  DEBUG_MODE: process.env.VITE_API_DEBUG === 'true',
  FEATURE_FLAGS: process.env.VITE_FEATURE_FLAGS ? JSON.parse(process.env.VITE_FEATURE_FLAGS) : {}
} as const;

/**
 * Performance-related configurations including timeouts and retry strategies
 * Implements sophisticated retry mechanism with exponential backoff
 */
export const API_PERFORMANCE = {
  TIMEOUT: 200, // 200ms timeout as per performance requirements
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    INITIAL_DELAY: 100, // ms
    MAX_DELAY: 1000, // ms
    BACKOFF_FACTOR: 2,
    STATUS_CODES: [408, 500, 502, 503, 504]
  },
  RATE_LIMITS: {
    DEFAULT: 1000, // requests per hour
    UPLOAD: 50,    // file uploads per hour
    HEALTH_CHECK: 5000 // health checks per hour
  }
} as const;

/**
 * Security-related configurations including headers and CORS settings
 * Implements comprehensive security headers for LGPD compliance
 */
export const API_SECURITY = {
  HEADERS: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-API-Version': API_CONFIG.VERSION,
    'X-API-Region': API_CONFIG.REGION,
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  },
  CORS_CONFIG: {
    ALLOWED_ORIGINS: process.env.VITE_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'],
    MAX_AGE: 7200 // 2 hours
  }
} as const;

/**
 * HTTP Status codes used across the application
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TIMEOUT: 408,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * File upload configuration
 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  MAX_FILES: 5,
  CHUNK_SIZE: 1024 * 1024 // 1MB chunks for large file uploads
} as const;

/**
 * API Endpoints for all microservices
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
    VERIFY: '/auth/verify',
    RESET_PASSWORD: '/auth/reset-password'
  },
  ENROLLMENT: {
    BASE: '/enrollments',
    CREATE: '/enrollments/create',
    UPDATE: '/enrollments/:id',
    DELETE: '/enrollments/:id',
    STATUS: '/enrollments/:id/status',
    HISTORY: '/enrollments/:id/history'
  },
  HEALTH: {
    QUESTIONNAIRE: '/health/questionnaire',
    SUBMIT: '/health/questionnaire/submit',
    RISK_ASSESSMENT: '/health/risk-assessment',
    HISTORY: '/health/history/:id'
  },
  DOCUMENT: {
    UPLOAD: '/documents/upload',
    DOWNLOAD: '/documents/:id/download',
    VERIFY: '/documents/:id/verify',
    LIST: '/documents/list',
    DELETE: '/documents/:id'
  },
  POLICY: {
    BASE: '/policies',
    CREATE: '/policies/create',
    UPDATE: '/policies/:id',
    STATUS: '/policies/:id/status',
    COVERAGE: '/policies/:id/coverage',
    CLAIMS: '/policies/:id/claims'
  }
} as const;

/**
 * Monitoring and observability configuration
 */
export const API_MONITORING = {
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  PERFORMANCE_THRESHOLD: 200,   // 200ms threshold for performance monitoring
  ERROR_THRESHOLD: 50,         // Error threshold percentage
  METRICS_ENABLED: process.env.VITE_METRICS_ENABLED === 'true'
} as const;