/**
 * API Service Tests
 * Comprehensive test coverage for core API service
 */

import { ApiService } from '../api.service';
import axios from 'axios';
import axiosRetry from 'axios-retry';

// Mock dependencies
jest.mock('axios');
jest.mock('axios-retry');
jest.mock('opossum');
jest.mock('sanitize-html', () => jest.fn((data) => data));
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiService', () => {
  let apiService: ApiService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    apiService = new ApiService();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: expect.any(Number),
          withCredentials: true
        })
      );
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should perform GET request successfully', async () => {
      const mockResponse = {
        data: { data: { id: 1, name: 'Test' }, message: 'Success' },
        status: 200,
        headers: { 'x-request-id': 'test-request-id' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockResolvedValue(mockResponse);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      const result = await apiService.get('/test/endpoint');

      expect(result).toEqual(
        expect.objectContaining({
          status: 200,
          message: 'Success'
        })
      );
    });

    it('should return cached response for repeated GET requests', async () => {
      const mockResponse = {
        data: { data: { id: 1, name: 'Test' }, message: 'Success' },
        status: 200,
        headers: { 'x-request-id': 'test-request-id' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockResolvedValue(mockResponse);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      await apiService.get('/test/endpoint');
      const cachedResult = apiService.getCached('/test/endpoint');

      expect(cachedResult).toBeDefined();
    });

    it('should handle GET request errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        },
        config: { url: '/test/endpoint' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockRejectedValue(mockError);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      await expect(apiService.get('/test/endpoint')).rejects.toMatchObject({
        code: 'NOT_FOUND_ERROR',
        message: 'Not found'
      });
    });
  });

  describe('post', () => {
    it('should perform POST request successfully', async () => {
      const mockResponse = {
        data: { data: { id: 1, created: true }, message: 'Created' },
        status: 201,
        headers: { 'x-request-id': 'test-request-id' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockResolvedValue(mockResponse);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      const postData = { name: 'Test', value: 123 };
      const result = await apiService.post('/test/endpoint', postData);

      expect(result).toEqual(
        expect.objectContaining({
          status: 201,
          message: 'Created'
        })
      );
    });

    it('should handle validation errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Validation failed', details: {} }
        },
        config: { url: '/test/endpoint' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockRejectedValue(mockError);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      await expect(apiService.post('/test/endpoint', {})).rejects.toMatchObject({
        code: 'VALIDATION_ERROR'
      });
    });
  });

  describe('put', () => {
    it('should perform PUT request successfully', async () => {
      const mockResponse = {
        data: { data: { id: 1, updated: true }, message: 'Updated' },
        status: 200,
        headers: { 'x-request-id': 'test-request-id' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockResolvedValue(mockResponse);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      const updateData = { name: 'Updated Test' };
      const result = await apiService.put('/test/endpoint/1', updateData);

      expect(result).toEqual(
        expect.objectContaining({
          status: 200,
          message: 'Updated'
        })
      );
    });

    it('should handle unauthorized errors', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        },
        config: { url: '/test/endpoint' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockRejectedValue(mockError);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      await expect(apiService.put('/test/endpoint/1', {})).rejects.toMatchObject({
        code: 'AUTHENTICATION_ERROR'
      });
    });
  });

  describe('delete', () => {
    it('should perform DELETE request successfully', async () => {
      const mockResponse = {
        data: { data: null, message: 'Deleted' },
        status: 200,
        headers: { 'x-request-id': 'test-request-id' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockResolvedValue(mockResponse);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      const result = await apiService.delete('/test/endpoint/1');

      expect(result).toEqual(
        expect.objectContaining({
          status: 200,
          message: 'Deleted'
        })
      );
    });

    it('should handle forbidden errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' }
        },
        config: { url: '/test/endpoint' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockRejectedValue(mockError);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      await expect(apiService.delete('/test/endpoint/1')).rejects.toMatchObject({
        code: 'AUTHORIZATION_ERROR'
      });
    });
  });

  describe('static methods', () => {
    beforeEach(() => {
      const mockResponse = {
        data: { data: { test: true }, message: 'Success' },
        status: 200,
        headers: { 'x-request-id': 'test-request-id' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockResolvedValue(mockResponse);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));
    });

    it('should call static get method', async () => {
      const result = await ApiService.get('/test');
      expect(result).toBeDefined();
    });

    it('should call static post method', async () => {
      const result = await ApiService.post('/test', { data: 'test' });
      expect(result).toBeDefined();
    });

    it('should call static put method', async () => {
      const result = await ApiService.put('/test', { data: 'updated' });
      expect(result).toBeDefined();
    });

    it('should call static delete method', async () => {
      const result = await ApiService.delete('/test');
      expect(result).toBeDefined();
    });
  });

  describe('auditLog', () => {
    it('should log audit action successfully', async () => {
      const mockResponse = {
        data: { data: null, message: 'Logged' },
        status: 200,
        headers: { 'x-request-id': 'test-request-id' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockResolvedValue(mockResponse);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      await expect(
        ApiService.auditLog('USER_LOGIN', { userId: '123' })
      ).resolves.not.toThrow();
    });

    it('should not throw on audit log failure', async () => {
      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockRejectedValue(new Error('Audit failed'));
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      // Should not throw
      await expect(
        ApiService.auditLog('USER_ACTION', {})
      ).resolves.not.toThrow();
    });
  });

  describe('error categorization', () => {
    it('should categorize 429 as rate limit error', async () => {
      const mockError = {
        response: {
          status: 429,
          data: { message: 'Too many requests' }
        },
        config: { url: '/test' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockRejectedValue(mockError);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      await expect(apiService.get('/test')).rejects.toMatchObject({
        code: 'RATE_LIMIT_ERROR'
      });
    });

    it('should categorize 500 as internal error', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        },
        config: { url: '/test' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockRejectedValue(mockError);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      await expect(apiService.get('/test')).rejects.toMatchObject({
        code: 'INTERNAL_ERROR'
      });
    });
  });

  describe('cache management', () => {
    it('should cache GET responses', async () => {
      const mockResponse = {
        data: { data: { cached: true }, message: 'Success' },
        status: 200,
        headers: { 'x-request-id': 'test-request-id' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockResolvedValue(mockResponse);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      await apiService.get('/test/cached');
      const cached = apiService.getCached('/test/cached');

      expect(cached).toBeDefined();
    });

    it('should not cache POST responses', async () => {
      const mockResponse = {
        data: { data: { created: true }, message: 'Created' },
        status: 201,
        headers: { 'x-request-id': 'test-request-id' }
      };

      const CircuitBreaker = require('opossum');
      const mockFire = jest.fn().mockResolvedValue(mockResponse);
      CircuitBreaker.mockImplementation(() => ({ fire: mockFire }));

      apiService = new ApiService();

      await apiService.post('/test/no-cache', {});
      const cached = apiService.getCached('/test/no-cache');

      expect(cached).toBeNull();
    });
  });
});
