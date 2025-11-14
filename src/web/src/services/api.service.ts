/**
 * Core API Service for Pre-paid Health Plan Onboarding Portal
 * Version: 1.0.0
 * 
 * Implements secure communication with backend microservices through API Gateway
 * with comprehensive error handling, monitoring, and LGPD compliance.
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'; // ^1.5.0
import axiosRetry from 'axios-retry'; // ^3.8.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import sanitizeHtml from 'sanitize-html'; // ^2.11.0
// import { ApplicationInsights } from '@microsoft/applicationinsights-web'; // ^2.5.0 - Optional
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { apiConfig, retryConfig, circuitBreakerConfig } from '../config/api.config';
import {
  ApiResponse,
  ApiError,
  ApiRequestConfig,
  PaginatedResponse,
  isApiError,
  isValidationError,
  SecurityHeaders
} from '../types/api.types';
import { API_SECURITY, HTTP_STATUS, API_PERFORMANCE } from '../constants/api.constants';

/**
 * Enhanced API Service with comprehensive security and monitoring
 */
export class ApiService {
  private static instance: ApiService;
  private readonly apiClient: AxiosInstance;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly telemetry: any; // ApplicationInsights - optional
  private readonly responseCache: Map<string, { data: any; timestamp: number }>;

  constructor(config?: Partial<ApiRequestConfig>) {
    // Initialize API client with secure configuration
    this.apiClient = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: API_PERFORMANCE.TIMEOUT,
      headers: {
        ...API_SECURITY.HEADERS,
        ...config?.headers
      },
      withCredentials: true
    });

    // Configure retry mechanism with exponential backoff
    axiosRetry(this.apiClient, {
      retries: retryConfig.retries,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error: AxiosError) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status ? retryConfig.retryCondition(error.response.status) : false);
      }
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(async (request: Promise<any>) => request, {
      timeout: circuitBreakerConfig.healthCheck.timeout,
      errorThresholdPercentage: circuitBreakerConfig.errorThresholdPercentage,
      resetTimeout: circuitBreakerConfig.resetTimeout
    });

    // Initialize telemetry (optional)
    this.telemetry = null; // ApplicationInsights disabled
    // this.telemetry = new ApplicationInsights({
    //   config: {
    //     instrumentationKey: process.env.VITE_APPINSIGHTS_KEY,
    //     enableAutoRouteTracking: true
    //   }
    // });
    // this.telemetry.loadAppInsights();

    // Initialize response cache
    this.responseCache = new Map();

    // Configure request interceptors
    this.setupInterceptors();
  }

  /**
   * Performs a GET request with comprehensive error handling and security measures
   */
  public async get<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('GET', url, undefined, config);
  }

  /**
   * Performs a POST request with data validation and security measures
   */
  public async post<T>(url: string, data: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('POST', url, data, config);
  }

  /**
   * Performs a PUT request with data validation and security measures
   */
  public async put<T>(url: string, data: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('PUT', url, data, config);
  }

  /**
   * Performs a DELETE request with security measures
   */
  public async delete<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('DELETE', url, undefined, config);
  }

  /**
   * Executes request with circuit breaker, monitoring, and error handling
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      // Check cache for GET requests
      if (method === 'GET') {
        const cachedResponse = this.getCachedResponse<T>(url);
        if (cachedResponse) return cachedResponse;
      }

      // Prepare request configuration with security headers
      const secureConfig = this.prepareRequestConfig(method, url, data, config, requestId);

      // Execute request through circuit breaker
      const response = await this.circuitBreaker.fire(async () =>
        await this.apiClient.request<ApiResponse<T>>(secureConfig)
      ) as AxiosResponse;

      // Process and validate response
      const processedResponse = this.processResponse<T>(response);

      // Cache GET responses
      if (method === 'GET') {
        this.cacheResponse(url, processedResponse);
      }

      // Track request success
      this.trackRequest(requestId, url, method, startTime, true);

      return processedResponse;

    } catch (error) {
      // Handle and track error
      this.trackRequest(requestId, url, method, startTime, false);
      throw this.handleRequestError(error, requestId);
    }
  }

  /**
   * Configures request interceptors for security and monitoring
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.apiClient.interceptors.request.use(
      (config) => {
        // Add security headers
        if (config.headers) {
          config.headers['X-Request-ID'] = uuidv4();
          config.headers['X-Client-Version'] = process.env.VITE_APP_VERSION || '1.0.0';
        }

        // Validate request data
        if (config.data) {
          config.data = this.sanitizeData(config.data);
        }

        return config;
      },
      (error) => Promise.reject(this.handleRequestError(error))
    );

    // Response interceptor
    this.apiClient.interceptors.response.use(
      (response) => {
        // Validate and sanitize response data
        if (response.data) {
          response.data = this.sanitizeData(response.data);
        }
        return response;
      },
      (error) => Promise.reject(this.handleRequestError(error))
    );
  }

  /**
   * Prepares secure request configuration
   */
  private prepareRequestConfig(
    method: string,
    url: string,
    data?: any,
    config?: ApiRequestConfig,
    requestId?: string
  ): ApiRequestConfig {
    return {
      method,
      url,
      data,
      headers: {
        ...API_SECURITY.HEADERS,
        ...config?.headers,
        'X-Request-ID': requestId
      },
      timeout: config?.timeout || API_PERFORMANCE.TIMEOUT,
      validateStatus: (status: number) => status >= 200 && status < 300
    };
  }

  /**
   * Processes and validates API response
   */
  private processResponse<T>(response: AxiosResponse): ApiResponse<T> {
    const sanitizedData = this.sanitizeData(response.data);
    return {
      data: sanitizedData.data,
      status: response.status,
      message: sanitizedData.message || 'Success',
      timestamp: new Date().toISOString(),
      requestId: response.headers['x-request-id']
    };
  }

  /**
   * Handles and categorizes request errors
   */
  private handleRequestError(error: any, requestId?: string): ApiError {
    if (isApiError(error)) return error;

    const apiError: ApiError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: {},
      timestamp: new Date().toISOString(),
      requestId: requestId || uuidv4(),
      path: error.config?.url || ''
    };

    if (error.response) {
      apiError.code = this.categorizeError(error.response.status);
      apiError.message = error.response.data?.message || error.message;
      apiError.details = error.response.data?.details || {};
    }

    return apiError;
  }

  /**
   * Categorizes HTTP errors
   */
  private categorizeError(status: number): ApiError['code'] {
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HTTP_STATUS.UNAUTHORIZED:
        return 'AUTHENTICATION_ERROR';
      case HTTP_STATUS.FORBIDDEN:
        return 'AUTHORIZATION_ERROR';
      case HTTP_STATUS.NOT_FOUND:
        return 'NOT_FOUND_ERROR';
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_ERROR';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  /**
   * Sanitizes data for security
   */
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return sanitizeHtml(data, {
        allowedTags: [],
        allowedAttributes: {}
      });
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => ({
        ...acc,
        [key]: this.sanitizeData(data[key])
      }), {});
    }
    return data;
  }

  /**
   * Tracks request performance and status
   */
  private trackRequest(
    requestId: string,
    url: string,
    method: string,
    startTime: number,
    success: boolean
  ): void {
    const duration = Date.now() - startTime;
    this.telemetry.trackRequest({
      id: requestId,
      name: `${method} ${url}`,
      url: url,
      duration: duration,
      success: success,
      resultCode: success ? HTTP_STATUS.OK : HTTP_STATUS.INTERNAL_SERVER_ERROR
    });
  }

  /**
   * Retrieves cached response if valid
   */
  private getCachedResponse<T>(url: string): ApiResponse<T> | null {
    const cached = this.responseCache.get(url);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.data;
    }
    return null;
  }

  /**
   * Caches response for GET requests
   */
  private cacheResponse<T>(url: string, response: ApiResponse<T>): void {
    this.responseCache.set(url, {
      data: response,
      timestamp: Date.now()
    });
  }

  /**
   * Gets cached response if available (public instance method)
   */
  public getCached<T>(url: string): ApiResponse<T> | null {
    return this.getCachedResponse<T>(url);
  }

  /**
   * Gets singleton instance of ApiService
   */
  private static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Static GET method for convenience
   */
  static async get<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return ApiService.getInstance().get<T>(url, config);
  }

  /**
   * Static PUT method for convenience
   */
  static async put<T>(url: string, data: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return ApiService.getInstance().put<T>(url, data, config);
  }

  /**
   * Static POST method for convenience
   */
  static async post<T>(url: string, data: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return ApiService.getInstance().post<T>(url, data, config);
  }

  /**
   * Static DELETE method for convenience
   */
  static async delete<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return ApiService.getInstance().delete<T>(url, config);
  }

  /**
   * Audit log method for tracking user actions
   */
  static async auditLog(action: string, metadata?: Record<string, any>): Promise<void> {
    try {
      await ApiService.getInstance().post('/api/v1/audit/log', {
        action,
        metadata,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Log but don't throw - audit failures shouldn't break functionality
      console.error('Audit log failed:', error);
    }
  }
}

// Default export for backward compatibility
export default ApiService;