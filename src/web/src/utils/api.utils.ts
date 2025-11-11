/**
 * API Utilities Module
 * Version: 1.0.0
 * 
 * Implements core API utilities with comprehensive error handling,
 * LGPD compliance, telemetry integration, and retry mechanisms.
 */

import axios, { AxiosInstance, AxiosError } from 'axios'; // ^1.5.0
import axiosRetry from 'axios-retry'; // ^3.8.0
import CircuitBreaker from 'opossum'; // ^7.1.0
// import * as newrelic from '@newrelic/browser'; // ^1.0.0

import { 
  ApiResponse, 
  ApiError, 
  ApiRequestConfig,
  HTTP_STATUS,
  ERROR_CODES,
  isApiError,
  isValidationError
} from '../types/api.types';

import {
  apiConfig,
  retryConfig,
  circuitBreakerConfig,
  createAxiosConfig
} from '../config/api.config';

// Constants for request configuration
const DEFAULT_TIMEOUT = 5000;
const MAX_RETRIES = 3;
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  healthCheckInterval: 5000
};

// LGPD compliance headers
const LGPD_HEADERS = {
  'X-Data-Protection': 'LGPD',
  'X-Data-Processing-Purpose': 'health-enrollment',
  'X-Data-Retention-Period': '5-years'
};

/**
 * Creates and configures an Axios instance with enhanced interceptors,
 * telemetry integration, and LGPD compliance
 * @param customConfig Optional custom configuration
 * @returns Configured Axios instance
 */
export function createApiClient(customConfig?: Partial<ApiRequestConfig>): AxiosInstance {
  // Create base axios instance with merged configuration
  const axiosConfig = createAxiosConfig(customConfig);
  const client = axios.create(axiosConfig);

  // Configure retry mechanism with exponential backoff
  axiosRetry(client, {
    retries: MAX_RETRIES,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error: AxiosError) => {
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === HTTP_STATUS.TOO_MANY_REQUESTS;
    }
  });

  // Configure circuit breaker
  const breaker = new CircuitBreaker(client, CIRCUIT_BREAKER_OPTIONS);
  breaker.fallback(() => {
    return Promise.reject(new Error(ERROR_CODES.CIRCUIT_BREAKER_ERROR));
  });

  // Request interceptor for authentication and LGPD headers
  client.interceptors.request.use((config) => {
    const requestConfig = config;
    requestConfig.headers = {
      ...requestConfig.headers,
      ...LGPD_HEADERS,
      'X-Request-Id': crypto.randomUUID()
    };
    
    // Add telemetry data
    // newrelic.addPageAction('api_request', {
    //   url: requestConfig.url,
    //   method: requestConfig.method
    // });

    return requestConfig;
  });

  // Response interceptor for error handling and telemetry
  client.interceptors.response.use(
    (response) => {
      // newrelic.addPageAction('api_response', {
      //   url: response.config.url,
      //   status: response.status,
      //   duration: response.headers['x-response-time']
      // });
      return response;
    },
    (error) => {
      return Promise.reject(handleApiError(error));
    }
  );

  return client;
}

/**
 * Enhanced error handling with telemetry integration and business error categorization
 * @param error The error object to handle
 * @returns Standardized API error
 */
export function handleApiError(error: unknown): ApiError {
  let apiError: ApiError;

  if (axios.isAxiosError(error)) {
    const { response, request, message } = error;

    if (response) {
      // Server error response
      apiError = {
        code: response.data?.code || ERROR_CODES.INTERNAL_ERROR,
        message: response.data?.message || 'An unexpected error occurred',
        details: response.data?.details || {},
        timestamp: new Date().toISOString(),
        requestId: response.headers['x-request-id'] || crypto.randomUUID(),
        path: request.path || ''
      };
    } else if (request) {
      // Request made but no response received
      apiError = {
        code: ERROR_CODES.INTEGRATION_ERROR,
        message: 'No response received from server',
        details: { originalError: message },
        timestamp: new Date().toISOString(),
        requestId: request.headers['x-request-id'] || crypto.randomUUID(),
        path: request.path || ''
      };
    } else {
      // Request setup error
      apiError = {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Error setting up request',
        details: { originalError: message },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        path: ''
      };
    }
  } else if (isApiError(error)) {
    apiError = error;
  } else {
    // Unknown error type
    apiError = {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      details: { originalError: String(error) },
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      path: ''
    };
  }

  // Log error with telemetry
  // newrelic.noticeError(new Error(apiError.message), {
  //   errorCode: apiError.code,
  //   requestId: apiError.requestId,
  //   path: apiError.path
  // });

  return apiError;
}

/**
 * Creates request configuration with LGPD compliance and telemetry integration
 * @param config Optional custom configuration
 * @returns Enhanced request configuration
 */
export function createRequestConfig(config?: Partial<ApiRequestConfig>): ApiRequestConfig {
  const defaultConfig: ApiRequestConfig = {
    headers: {
      ...LGPD_HEADERS,
      'X-Request-Id': crypto.randomUUID()
    },
    params: {},
    timeout: DEFAULT_TIMEOUT,
    retryConfig: {
      maxRetries: MAX_RETRIES,
      backoffFactor: 2,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      retryableStatuses: [408, 429, 500, 502, 503, 504]
    },
    securityHeaders: {
      'Content-Security-Policy': "default-src 'self'",
      'X-XSS-Protection': '1; mode=block',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Frame-Options': 'DENY',
      'X-Request-Id': crypto.randomUUID()
    },
    validateStatus: (status: number) => status >= 200 && status < 300
  };

  return {
    ...defaultConfig,
    ...config,
    headers: {
      ...defaultConfig.headers,
      ...config?.headers
    },
    securityHeaders: {
      ...defaultConfig.securityHeaders,
      ...config?.securityHeaders
    }
  };
}