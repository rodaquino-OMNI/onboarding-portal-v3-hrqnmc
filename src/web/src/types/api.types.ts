// @ts-check
import { z } from 'zod'; // v3.22.0 - Runtime type validation

/**
 * HTTP Status codes used across the application
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Standardized error codes for API responses
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  CIRCUIT_BREAKER_ERROR: 'CIRCUIT_BREAKER_ERROR',
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  BUSINESS_RULE_ERROR: 'BUSINESS_RULE_ERROR',
} as const;

/**
 * Security headers configuration for API requests
 */
export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-XSS-Protection': string;
  'X-Content-Type-Options': string;
  'Strict-Transport-Security': string;
  'X-Frame-Options': string;
  'X-Request-Id': string;
}

/**
 * Retry configuration for failed API requests
 */
export interface RetryConfig {
  maxRetries: number;
  backoffFactor: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

/**
 * Generic API response wrapper with enhanced tracking and security features
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: string;
  requestId: string;
}

/**
 * Comprehensive API error response with detailed error tracking
 */
export interface ApiError {
  code: keyof typeof ERROR_CODES;
  message: string;
  details: Record<string, any>;
  timestamp: string;
  requestId: string;
  path: string;
}

/**
 * Enhanced paginated response with comprehensive pagination metadata
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Extended API request configuration with security and retry policies
 */
export interface ApiRequestConfig {
  headers: Record<string, string>;
  params: Record<string, string | number>;
  timeout: number;
  retryConfig: RetryConfig;
  securityHeaders: SecurityHeaders;
  validateStatus: (status: number) => boolean;
}

/**
 * Detailed validation error with field-level validation details
 */
export interface ApiValidationError {
  field: string;
  message: string;
  code: string;
  constraints?: Record<string, string>;
  value?: any;
  context?: Record<string, any>;
}

/**
 * Zod schema for API response validation
 */
export const apiResponseSchema = z.object({
  data: z.any(),
  status: z.number().int().min(100).max(599),
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid()
});

/**
 * Zod schema for API error validation
 */
export const apiErrorSchema = z.object({
  code: z.enum(Object.keys(ERROR_CODES) as [string, ...string[]]),
  message: z.string(),
  details: z.record(z.any()),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
  path: z.string()
});

/**
 * Zod schema for validation error
 */
export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
  constraints: z.record(z.string()),
  value: z.any()
});

/**
 * Type guard to check if response is an API error
 */
export const isApiError = (error: unknown): error is ApiError => {
  try {
    return apiErrorSchema.safeParse(error).success;
  } catch {
    return false;
  }
};

/**
 * Type guard to check if error is a validation error
 */
export const isValidationError = (error: unknown): error is ApiValidationError => {
  try {
    return validationErrorSchema.safeParse(error).success;
  } catch {
    return false;
  }
};