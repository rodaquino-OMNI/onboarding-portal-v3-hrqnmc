/**
 * Policy Service Tests
 * Comprehensive test coverage for policy service
 */

import { PolicyService } from '../policy.service';
import { ApiService } from '../api.service';
import { PolicyStatus } from '../../types/policy.types';
import { ErrorHandler } from '../../utils/error-handler.utils';

// Mock dependencies
jest.mock('../api.service');
jest.mock('../../utils/error-handler.utils');
jest.mock('../../types/policy.types', () => {
  const actual = jest.requireActual('../../types/policy.types');
  return {
    ...actual,
    isPolicyStatus: jest.fn(() => true),
    isCoverageTier: jest.fn(() => true)
  };
});
jest.mock('dayjs', () => {
  const actual = jest.requireActual('dayjs');
  return jest.fn((date?: any) => actual(date));
});

const MockedApiService = ApiService as jest.MockedClass<typeof ApiService>;
const MockedErrorHandler = ErrorHandler as jest.MockedClass<typeof ErrorHandler>;

describe('PolicyService', () => {
  let policyService: PolicyService;
  let mockApiService: jest.Mocked<ApiService>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApiService = new MockedApiService() as jest.Mocked<ApiService>;
    mockErrorHandler = new MockedErrorHandler() as jest.Mocked<ErrorHandler>;
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn()
    };

    policyService = new PolicyService(mockApiService, mockErrorHandler, mockLogger);
  });

  describe('getPolicyById', () => {
    const mockPolicy = {
      id: 'policy-123',
      enrollmentId: 'enrollment-123',
      policyNumber: 'POL-2024-001',
      status: PolicyStatus.ACTIVE,
      monthlyPremium: 150.00,
      effectiveDate: '2024-01-01',
      expiryDate: '2025-01-01',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      waitingPeriods: []
    };

    it('should retrieve policy by ID successfully', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({
        data: mockPolicy
      });

      const result = await policyService.getPolicyById('policy-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('policy-123');
      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('policy-123')
      );
    });

    it('should return cached policy on subsequent calls', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({
        data: mockPolicy
      });

      // First call - fetches from API
      await policyService.getPolicyById('policy-123');

      // Second call - should use cache
      await policyService.getPolicyById('policy-123');

      // API should only be called once
      expect(mockApiService.get).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Policy not found');
      mockApiService.get = jest.fn().mockRejectedValue(mockError);

      await expect(policyService.getPolicyById('invalid-id')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should transform date fields correctly', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({
        data: mockPolicy
      });

      const result = await policyService.getPolicyById('policy-123');

      expect(result.effectiveDate).toBeInstanceOf(Date);
      expect(result.expiryDate).toBeInstanceOf(Date);
    });
  });

  describe('getPoliciesByEnrollmentId', () => {
    it('should retrieve all policies for enrollment', async () => {
      const mockPolicies = [
        {
          id: 'policy-1',
          enrollmentId: 'enrollment-123',
          status: PolicyStatus.ACTIVE,
          effectiveDate: '2024-01-01',
          expiryDate: '2025-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          id: 'policy-2',
          enrollmentId: 'enrollment-123',
          status: PolicyStatus.PENDING,
          effectiveDate: '2024-02-01',
          expiryDate: '2025-02-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ];

      mockApiService.get = jest.fn().mockResolvedValue({
        data: mockPolicies
      });

      const result = await policyService.getPoliciesByEnrollmentId('enrollment-123');

      expect(result).toHaveLength(2);
      expect(result[0].enrollmentId).toBe('enrollment-123');
    });

    it('should handle empty policy list', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({
        data: []
      });

      const result = await policyService.getPoliciesByEnrollmentId('enrollment-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('createPolicy', () => {
    it('should create policy successfully', async () => {
      const policyData = {
        enrollmentId: 'enrollment-123',
        monthlyPremium: 200.00,
        effectiveDate: new Date('2025-01-01')
      };

      const mockResponse = {
        id: 'policy-new',
        ...policyData,
        status: PolicyStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockApiService.post = jest.fn().mockResolvedValue({
        data: mockResponse
      });

      const result = await policyService.createPolicy(policyData);

      expect(result).toBeDefined();
      expect(result.id).toBe('policy-new');
      expect(mockApiService.post).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        monthlyPremium: 100.00
        // Missing enrollmentId
      };

      await expect(policyService.createPolicy(invalidData)).rejects.toThrow(
        'Enrollment ID is required'
      );
    });

    it('should reject negative premium', async () => {
      const invalidData = {
        enrollmentId: 'enrollment-123',
        monthlyPremium: -50.00
      };

      await expect(policyService.createPolicy(invalidData)).rejects.toThrow(
        'Monthly premium must be greater than zero'
      );
    });

    it('should reject past effective date', async () => {
      const invalidData = {
        enrollmentId: 'enrollment-123',
        monthlyPremium: 150.00,
        effectiveDate: new Date('2020-01-01')
      };

      await expect(policyService.createPolicy(invalidData)).rejects.toThrow(
        'Effective date cannot be in the past'
      );
    });
  });

  describe('updatePolicyStatus', () => {
    it('should update policy status successfully', async () => {
      const mockResponse = {
        id: 'policy-123',
        status: PolicyStatus.ACTIVE,
        effectiveDate: '2024-01-01',
        expiryDate: '2025-01-01',
        createdAt: '2024-01-01',
        updatedAt: new Date().toISOString()
      };

      mockApiService.put = jest.fn().mockResolvedValue({
        data: mockResponse
      });

      const result = await policyService.updatePolicyStatus(
        'policy-123',
        PolicyStatus.ACTIVE
      );

      expect(result.status).toBe(PolicyStatus.ACTIVE);
      expect(mockApiService.put).toHaveBeenCalled();
    });

    it('should reject invalid policy status', async () => {
      await expect(
        policyService.updatePolicyStatus('policy-123', 'INVALID_STATUS' as any)
      ).rejects.toThrow('Invalid policy status');
    });

    it('should update cache after status update', async () => {
      const mockResponse = {
        id: 'policy-123',
        status: PolicyStatus.CANCELLED,
        effectiveDate: '2024-01-01',
        expiryDate: '2025-01-01',
        createdAt: '2024-01-01',
        updatedAt: new Date().toISOString()
      };

      mockApiService.put = jest.fn().mockResolvedValue({
        data: mockResponse
      });

      const result = await policyService.updatePolicyStatus(
        'policy-123',
        PolicyStatus.CANCELLED
      );

      expect(result.status).toBe(PolicyStatus.CANCELLED);
    });
  });

  describe('updateCoverageDetails', () => {
    it('should update coverage details successfully', async () => {
      const coverageDetails = {
        coverageTier: 'INDIVIDUAL' as any,
        coverageAmount: 50000,
        deductible: 1000,
        coinsurance: 20
      };

      const mockResponse = {
        id: 'policy-123',
        coverageDetails,
        effectiveDate: '2024-01-01',
        expiryDate: '2025-01-01',
        createdAt: '2024-01-01',
        updatedAt: new Date().toISOString()
      };

      mockApiService.put = jest.fn().mockResolvedValue({
        data: mockResponse
      });

      const result = await policyService.updateCoverageDetails(
        'policy-123',
        coverageDetails
      );

      expect(result.coverageDetails).toEqual(coverageDetails);
    });

    it('should reject invalid coverage tier', async () => {
      const invalidCoverage = {
        coverageTier: 'INVALID_TIER' as any,
        coverageAmount: 50000,
        deductible: 1000,
        coinsurance: 20
      };

      await expect(
        policyService.updateCoverageDetails('policy-123', invalidCoverage)
      ).rejects.toThrow('Invalid coverage tier');
    });
  });

  describe('updateWaitingPeriods', () => {
    it('should update waiting periods successfully', async () => {
      const waitingPeriods = [
        {
          serviceType: 'CONSULTATION',
          durationInDays: 30,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          isActive: true
        }
      ];

      const mockResponse = {
        id: 'policy-123',
        waitingPeriods,
        effectiveDate: '2024-01-01',
        expiryDate: '2025-01-01',
        createdAt: '2024-01-01',
        updatedAt: new Date().toISOString()
      };

      mockApiService.put = jest.fn().mockResolvedValue({
        data: mockResponse
      });

      const result = await policyService.updateWaitingPeriods(
        'policy-123',
        waitingPeriods
      );

      expect(result.waitingPeriods).toHaveLength(1);
    });

    it('should reject negative duration', async () => {
      const invalidPeriods = [
        {
          serviceType: 'CONSULTATION',
          durationInDays: -10,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          isActive: true
        }
      ];

      await expect(
        policyService.updateWaitingPeriods('policy-123', invalidPeriods)
      ).rejects.toThrow('Waiting period duration must be greater than zero');
    });

    it('should reject end date before start date', async () => {
      const invalidPeriods = [
        {
          serviceType: 'CONSULTATION',
          durationInDays: 30,
          startDate: new Date('2024-01-31'),
          endDate: new Date('2024-01-01'),
          isActive: true
        }
      ];

      await expect(
        policyService.updateWaitingPeriods('policy-123', invalidPeriods)
      ).rejects.toThrow('End date cannot be before start date');
    });
  });

  describe('cache management', () => {
    it('should cache policy after retrieval', async () => {
      const mockPolicy = {
        id: 'policy-cache',
        effectiveDate: '2024-01-01',
        expiryDate: '2025-01-01',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      mockApiService.get = jest.fn().mockResolvedValue({
        data: mockPolicy
      });

      await policyService.getPolicyById('policy-cache');
      await policyService.getPolicyById('policy-cache');

      // Should only call API once due to caching
      expect(mockApiService.get).toHaveBeenCalledTimes(1);
    });

    it('should update cache after policy update', async () => {
      const initialPolicy = {
        id: 'policy-123',
        status: PolicyStatus.PENDING,
        effectiveDate: '2024-01-01',
        expiryDate: '2025-01-01',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };

      const updatedPolicy = {
        ...initialPolicy,
        status: PolicyStatus.ACTIVE,
        updatedAt: new Date().toISOString()
      };

      mockApiService.get = jest.fn().mockResolvedValue({
        data: initialPolicy
      });

      mockApiService.put = jest.fn().mockResolvedValue({
        data: updatedPolicy
      });

      // Get policy (caches it)
      await policyService.getPolicyById('policy-123');

      // Update policy (should update cache)
      await policyService.updatePolicyStatus('policy-123', PolicyStatus.ACTIVE);

      // Get policy again (should return updated from cache)
      const result = await policyService.getPolicyById('policy-123');

      expect(result.status).toBe(PolicyStatus.ACTIVE);
    });
  });

  describe('error handling', () => {
    it('should log errors on failure', async () => {
      mockApiService.get = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      await expect(policyService.getPolicyById('policy-123')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const apiError = {
        code: 'NOT_FOUND',
        message: 'Policy not found'
      };

      mockApiService.get = jest.fn().mockRejectedValue(apiError);

      await expect(policyService.getPolicyById('invalid-id')).rejects.toThrow();
    });
  });
});
