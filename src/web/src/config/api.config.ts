/**
 * API Configuration Module
 * Version: 1.0.0
 * 
 * Implements core API configuration with comprehensive error handling,
 * performance monitoring, and security features for LGPD compliance.
 */

import { AxiosRequestConfig } from 'axios'; // ^1.5.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { trace, SpanStatusCode } from '@opentelemetry/api'; // ^1.4.0

import {
  API_CONFIG,
  API_PERFORMANCE,
  API_SECURITY,
  API_ENDPOINTS,
  API_MONITORING,
  HTTP_STATUS
} from '../constants/api.constants';

/**
 * Interface for enhanced API configuration options
 */
interface ApiConfigOptions {
  baseURL: string;
  enableRetry: boolean;
  enableCircuitBreaker: boolean;
  timeout: number;
  headers: Record<string, string>;
  telemetry: {
    enabled: boolean;
    sampleRate: number;
  };
  security: {
    validateStatus: (status: number) => boolean;
    withCredentials: boolean;
  };
}

/**
 * Default API configuration with telemetry and security features
 */
export const apiConfig: ApiConfigOptions = {
  baseURL: `${API_CONFIG.BASE_URL}/api/${API_CONFIG.VERSION}`,
  enableRetry: true,
  enableCircuitBreaker: true,
  timeout: API_PERFORMANCE.TIMEOUT,
  headers: API_SECURITY.HEADERS,
  telemetry: {
    enabled: true,
    sampleRate: 0.1
  },
  security: {
    validateStatus: (status: number) => status >= 200 && status < 300,
    withCredentials: true
  }
};

/**
 * Retry configuration with exponential backoff
 */
export const retryConfig = {
  retries: API_PERFORMANCE.RETRY_CONFIG.MAX_RETRIES,
  retryDelay: (retryCount: number): number => {
    const delay = Math.min(
      API_PERFORMANCE.RETRY_CONFIG.INITIAL_DELAY * Math.pow(API_PERFORMANCE.RETRY_CONFIG.BACKOFF_FACTOR, retryCount),
      API_PERFORMANCE.RETRY_CONFIG.MAX_DELAY
    );
    return delay;
  },
  retryCondition: (error: any): boolean => {
    return (
      !error.response ||
      API_PERFORMANCE.RETRY_CONFIG.STATUS_CODES.includes(error.response.status)
    );
  },
  shouldResetTimeout: true
};

/**
 * Circuit breaker configuration with health checks
 */
export const circuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,
  errorThresholdPercentage: 50,
  healthCheck: {
    interval: API_MONITORING.HEALTH_CHECK_INTERVAL,
    path: '/health',
    timeout: API_PERFORMANCE.TIMEOUT
  }
};

/**
 * Creates an enhanced Axios configuration object with telemetry and security features
 * @param customConfig Optional custom configuration to merge
 * @returns Enhanced Axios configuration
 */
export function createAxiosConfig(customConfig?: Partial<AxiosRequestConfig>): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    baseURL: `${API_CONFIG.BASE_URL}/api/${API_CONFIG.VERSION}`,
    timeout: apiConfig.timeout,
    headers: {
      ...API_SECURITY.HEADERS,
      ...customConfig?.headers
    },
    validateStatus: apiConfig.security.validateStatus,
    withCredentials: apiConfig.security.withCredentials
  };

  return { ...config, ...customConfig };
}

/**
 * Sets up telemetry interceptors for an axios instance
 * Note: This should be called after creating the axios instance
 */
export function setupTelemetryInterceptors(axiosInstance: any): void {
  const tracer = trace.getTracer('api-client');

  axiosInstance.interceptors.request.use((config: any) => {
    const span = tracer.startSpan('http_request');
    span.setAttribute('http.url', config.url!);
    span.setAttribute('http.method', config.method!.toUpperCase());
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response: any) => {
      try {
        const span = trace.getActiveSpan();
        if (span) {
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
        }
      } catch (e) {
        // Telemetry error - continue without throwing
      }
      return response;
    },
    (error: any) => {
      try {
        const span = trace.getActiveSpan();
        if (span) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          span.end();
        }
      } catch (e) {
        // Telemetry error - continue without throwing
      }
      return Promise.reject(error);
    }
  );
}

/**
 * Configures circuit breaker with health checks and monitoring
 * @param options Circuit breaker options
 * @returns Configured circuit breaker instance
 */
export function configureCircuitBreaker(options: typeof circuitBreakerConfig): CircuitBreaker {
  const breaker = new CircuitBreaker(async (request: Promise<any>) => {
    return await request;
  }, {
    timeout: options.healthCheck.timeout,
    errorThresholdPercentage: options.errorThresholdPercentage,
    resetTimeout: options.resetTimeout
  });

  // Configure health checks
  setInterval(async () => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}${options.healthCheck.path}`);
      breaker.close();
    } catch (error) {
      breaker.open();
    }
  }, options.healthCheck.interval);

  // Event handlers for monitoring
  breaker.on('open', () => {
    trace.getTracer('circuit-breaker').startSpan('circuit_breaker_open').end();
  });

  breaker.on('close', () => {
    trace.getTracer('circuit-breaker').startSpan('circuit_breaker_close').end();
  });

  return breaker;
}