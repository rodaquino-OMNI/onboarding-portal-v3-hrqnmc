/**
 * Policy API Module
 * Version: 1.0.0
 * 
 * Implements secure HTTP communication with the policy microservice through the API gateway.
 * Features enhanced error handling, retry logic, and performance monitoring.
 */

import axios, { AxiosError } from 'axios'; // ^1.5.0
import axiosRetry from 'axios-retry'; // ^3.8.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import winston from 'winston'; // ^3.8.0
import { trace, SpanStatusCode } from '@opentelemetry/api';

import type {
  Policy,
  CoverageDetails,
  WaitingPeriod
} from '../types/policy.types';
import {
  PolicyStatus,
  isPolicyStatus
} from '../types/policy.types';
import { apiConfig, createAxiosConfig, circuitBreakerConfig } from '../config/api.config';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'policy-api.log' })
  ]
});

// API endpoints for policy operations
const API_ENDPOINTS = {
  POLICIES: '/api/v1/policies',
  POLICY_BY_ID: '/api/v1/policies/{id}',
  POLICY_STATUS: '/api/v1/policies/{id}/status',
  POLICY_COVERAGE: '/api/v1/policies/{id}/coverage',
  POLICY_WAITING_PERIODS: '/api/v1/policies/{id}/waiting-periods',
  ENROLLMENT_POLICIES: '/api/v1/enrollments/{id}/policies'
} as const;

// Configure retry mechanism
const RETRY_CONFIG = {
  retries: 3,
  retryDelay: (retryCount: number) => retryCount * 1000,
  retryCondition: axiosRetry.isNetworkOrIdempotentRequestError
};

// Configure circuit breaker
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 60000
};

// Initialize axios instance with retry mechanism
const axiosInstance = axios.create(createAxiosConfig());
axiosRetry(axiosInstance, RETRY_CONFIG);

// Initialize circuit breaker
const breaker = new CircuitBreaker(async (request: Promise<any>) => {
  return await request;
}, CIRCUIT_BREAKER_CONFIG);

/**
 * Retrieves a policy by its ID with enhanced error handling and retry logic
 * @param policyId - Unique identifier of the policy
 * @returns Promise resolving to Policy object
 * @throws AxiosError with detailed error information
 */
export async function getPolicyById(policyId: string): Promise<Policy> {
  const tracer = trace.getTracer('policy-api');
  const span = tracer.startSpan('get_policy_by_id');

  try {
    const response = await breaker.fire(
      axiosInstance.get<Policy>(
        API_ENDPOINTS.POLICY_BY_ID.replace('{id}', policyId),
        {
          headers: {
            ...apiConfig.headers,
            'X-Request-ID': crypto.randomUUID()
          }
        }
      )
    );

    span.setStatus({ code: SpanStatusCode.OK });
    return response.data;
  } catch (error) {
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: (error as Error).message 
    });
    logger.error('Error fetching policy', {
      policyId,
      error: error instanceof AxiosError ? error.response?.data : error
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Retrieves all policies associated with an enrollment
 * @param enrollmentId - Enrollment identifier
 * @param page - Page number for pagination
 * @param limit - Number of items per page
 * @returns Promise resolving to array of Policy objects
 */
export async function getPoliciesByEnrollmentId(
  enrollmentId: string,
  page: number = 1,
  limit: number = 10
): Promise<Policy[]> {
  const span = trace.getTracer('policy-api').startSpan('get_enrollment_policies');

  try {
    const response = await breaker.fire(
      axiosInstance.get<Policy[]>(
        API_ENDPOINTS.ENROLLMENT_POLICIES.replace('{id}', enrollmentId),
        {
          params: { page, limit }
        }
      )
    );

    span.setStatus({ code: SpanStatusCode.OK });
    return response.data;
  } catch (error) {
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: (error as Error).message 
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Creates a new policy with validation
 * @param policy - Policy object without ID
 * @returns Promise resolving to created Policy
 */
export async function createPolicy(policy: Omit<Policy, 'id'>): Promise<Policy> {
  const span = trace.getTracer('policy-api').startSpan('create_policy');

  try {
    const response = await breaker.fire(
      axiosInstance.post<Policy>(
        API_ENDPOINTS.POLICIES,
        policy,
        {
          headers: {
            'X-Request-ID': crypto.randomUUID(),
            'X-Operation-Type': 'CREATE'
          }
        }
      )
    );

    span.setStatus({ code: SpanStatusCode.OK });
    return response.data;
  } catch (error) {
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: (error as Error).message 
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Updates policy status with audit logging
 * @param policyId - Policy identifier
 * @param status - New policy status
 * @returns Promise resolving to updated Policy
 */
export async function updatePolicyStatus(
  policyId: string,
  status: PolicyStatus
): Promise<Policy> {
  if (!isPolicyStatus(status)) {
    throw new Error(`Invalid policy status: ${status}`);
  }

  const span = trace.getTracer('policy-api').startSpan('update_policy_status');

  try {
    const response = await breaker.fire(
      axiosInstance.patch<Policy>(
        API_ENDPOINTS.POLICY_STATUS.replace('{id}', policyId),
        { status },
        {
          headers: {
            'X-Request-ID': crypto.randomUUID(),
            'X-Operation-Type': 'UPDATE_STATUS'
          }
        }
      )
    );

    span.setStatus({ code: SpanStatusCode.OK });
    return response.data;
  } catch (error) {
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: (error as Error).message 
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Updates policy coverage details with validation
 * @param policyId - Policy identifier
 * @param coverageDetails - Updated coverage details
 * @returns Promise resolving to updated Policy
 */
export async function updateCoverageDetails(
  policyId: string,
  coverageDetails: CoverageDetails
): Promise<Policy> {
  const span = trace.getTracer('policy-api').startSpan('update_coverage_details');

  try {
    const response = await breaker.fire(
      axiosInstance.put<Policy>(
        API_ENDPOINTS.POLICY_COVERAGE.replace('{id}', policyId),
        coverageDetails,
        {
          headers: {
            'X-Request-ID': crypto.randomUUID(),
            'X-Operation-Type': 'UPDATE_COVERAGE'
          }
        }
      )
    );

    span.setStatus({ code: SpanStatusCode.OK });
    return response.data;
  } catch (error) {
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: (error as Error).message 
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Updates policy waiting periods with validation
 * @param policyId - Policy identifier
 * @param waitingPeriods - Array of waiting period updates
 * @returns Promise resolving to updated Policy
 */
export async function updateWaitingPeriods(
  policyId: string,
  waitingPeriods: WaitingPeriod[]
): Promise<Policy> {
  const span = trace.getTracer('policy-api').startSpan('update_waiting_periods');

  try {
    const response = await breaker.fire(
      axiosInstance.put<Policy>(
        API_ENDPOINTS.POLICY_WAITING_PERIODS.replace('{id}', policyId),
        { waitingPeriods },
        {
          headers: {
            'X-Request-ID': crypto.randomUUID(),
            'X-Operation-Type': 'UPDATE_WAITING_PERIODS'
          }
        }
      )
    );

    span.setStatus({ code: SpanStatusCode.OK });
    return response.data;
  } catch (error) {
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: (error as Error).message 
    });
    throw error;
  } finally {
    span.end();
  }
}