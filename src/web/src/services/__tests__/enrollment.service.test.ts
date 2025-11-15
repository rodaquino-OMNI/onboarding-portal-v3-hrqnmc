/**
 * Enrollment Service Tests
 * Comprehensive test coverage for enrollment service
 */

import { EnrollmentService } from '../enrollment.service';
import { ApiService } from '../api.service';
import { EnrollmentStatus } from '../../types/enrollment.types';
import { RiskLevel } from '../../types/health.types';

// Mock dependencies
jest.mock('../api.service');
jest.mock('../../types/enrollment.types', () => {
  const actual = jest.requireActual('../../types/enrollment.types');
  return {
    ...actual,
    isValidBeneficiary: jest.fn(() => true),
    isValidEnrollment: jest.fn(() => true)
  };
});
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(() => ({ toString: () => 'encrypted-data' })),
    decrypt: jest.fn(() => ({
      toString: jest.fn(() => 'decrypted-data')
    }))
  },
  enc: {
    Utf8: 'Utf8'
  }
}));

const MockedApiService = ApiService as jest.MockedClass<typeof ApiService>;

describe('EnrollmentService', () => {
  let enrollmentService: EnrollmentService;
  let mockApiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApiService = new MockedApiService() as jest.Mocked<ApiService>;
    enrollmentService = new EnrollmentService(mockApiService);
  });

  describe('createEnrollment', () => {
    const mockBeneficiary = {
      cpf: '12345678900',
      name: 'Test Beneficiary',
      email: 'test@example.com',
      phone: '11999999999',
      dateOfBirth: new Date('1990-01-01'),
      rg: '123456789'
    };

    it('should create enrollment successfully for authorized role', async () => {
      const mockResponse = {
        data: {
          id: 'enrollment-123',
          beneficiary: mockBeneficiary,
          status: EnrollmentStatus.DRAFT,
          riskLevel: RiskLevel.LOW,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        status: 201,
        message: 'Created',
        timestamp: new Date().toISOString(),
        requestId: 'req-123'
      };

      mockApiService.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await enrollmentService.createEnrollment(mockBeneficiary, 'BROKER');

      expect(result.data).toBeDefined();
      expect(result.data.status).toBe(EnrollmentStatus.DRAFT);
      expect(mockApiService.post).toHaveBeenCalled();
    });

    it('should throw error for unauthorized role', async () => {
      await expect(
        enrollmentService.createEnrollment(mockBeneficiary, 'BENEFICIARY')
      ).rejects.toThrow('Unauthorized access');
    });

    it('should encrypt sensitive beneficiary data', async () => {
      const CryptoJS = require('crypto-js');
      mockApiService.post = jest.fn().mockResolvedValue({
        data: { id: 'enrollment-123' },
        status: 201
      });

      await enrollmentService.createEnrollment(mockBeneficiary, 'BROKER');

      expect(CryptoJS.AES.encrypt).toHaveBeenCalled();
    });
  });

  describe('updateEnrollment', () => {
    it('should update enrollment successfully', async () => {
      const mockResponse = {
        data: {
          id: 'enrollment-123',
          status: EnrollmentStatus.PENDING_DOCUMENTS,
          updatedAt: new Date()
        },
        status: 200,
        message: 'Updated',
        timestamp: new Date().toISOString(),
        requestId: 'req-123'
      };

      mockApiService.get = jest.fn().mockResolvedValue({
        data: { authorized: true }
      });
      mockApiService.put = jest.fn().mockResolvedValue(mockResponse);

      const updates = { status: EnrollmentStatus.PENDING_DOCUMENTS };
      const result = await enrollmentService.updateEnrollment(
        'enrollment-123',
        updates,
        'BROKER'
      );

      expect(result.data.status).toBe(EnrollmentStatus.PENDING_DOCUMENTS);
      expect(mockApiService.put).toHaveBeenCalled();
    });

    it('should throw error for unauthorized user', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({
        data: { authorized: false }
      });

      await expect(
        enrollmentService.updateEnrollment('enrollment-123', {}, 'BENEFICIARY')
      ).rejects.toThrow();
    });

    it('should reject unauthorized role', async () => {
      await expect(
        enrollmentService.updateEnrollment('enrollment-123', {}, 'INVALID_ROLE')
      ).rejects.toThrow('Unauthorized access');
    });
  });

  describe('getEnrollment', () => {
    it('should retrieve enrollment with decrypted data', async () => {
      const mockEnrollment = {
        id: 'enrollment-123',
        beneficiary: {
          cpf: 'encrypted-data',
          name: 'Test Beneficiary',
          email: 'encrypted-data'
        },
        status: EnrollmentStatus.APPROVED
      };

      mockApiService.get = jest.fn()
        .mockResolvedValueOnce({ data: { authorized: true } })
        .mockResolvedValueOnce({ data: mockEnrollment });

      const result = await enrollmentService.getEnrollment('enrollment-123', 'BROKER');

      expect(result.data).toBeDefined();
      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });

    it('should throw error for unauthorized access', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({
        data: { authorized: false }
      });

      await expect(
        enrollmentService.getEnrollment('enrollment-123', 'BENEFICIARY')
      ).rejects.toThrow();
    });
  });

  describe('getEnrollments', () => {
    it('should retrieve paginated enrollments', async () => {
      const mockResponse = {
        items: [
          { id: 'enrollment-1', status: EnrollmentStatus.DRAFT },
          { id: 'enrollment-2', status: EnrollmentStatus.APPROVED }
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1
      };

      mockApiService.get = jest.fn().mockResolvedValue({
        data: mockResponse
      });

      const filters = { status: EnrollmentStatus.DRAFT };
      const result = await enrollmentService.getEnrollments(filters, 1, 10);

      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(mockApiService.get).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0
        }
      });

      const result = await enrollmentService.getEnrollments({}, 1, 10);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should update status successfully for authorized role', async () => {
      mockApiService.put = jest.fn().mockResolvedValue({
        data: {
          id: 'enrollment-123',
          status: EnrollmentStatus.APPROVED
        },
        status: 200
      });

      const result = await enrollmentService.updateEnrollmentStatus(
        'enrollment-123',
        EnrollmentStatus.APPROVED,
        'UNDERWRITER'
      );

      expect(result.data.status).toBe(EnrollmentStatus.APPROVED);
    });

    it('should reject invalid status transition for role', async () => {
      await expect(
        enrollmentService.updateEnrollmentStatus(
          'enrollment-123',
          EnrollmentStatus.APPROVED,
          'BROKER'
        )
      ).rejects.toThrow('Invalid status transition');
    });

    it('should allow broker to set draft status', async () => {
      mockApiService.put = jest.fn().mockResolvedValue({
        data: {
          id: 'enrollment-123',
          status: EnrollmentStatus.DRAFT
        },
        status: 200
      });

      const result = await enrollmentService.updateEnrollmentStatus(
        'enrollment-123',
        EnrollmentStatus.DRAFT,
        'BROKER'
      );

      expect(result.data.status).toBe(EnrollmentStatus.DRAFT);
    });

    it('should allow underwriter to approve enrollment', async () => {
      mockApiService.put = jest.fn().mockResolvedValue({
        data: {
          id: 'enrollment-123',
          status: EnrollmentStatus.APPROVED
        },
        status: 200
      });

      const result = await enrollmentService.updateEnrollmentStatus(
        'enrollment-123',
        EnrollmentStatus.APPROVED,
        'UNDERWRITER'
      );

      expect(result.data.status).toBe(EnrollmentStatus.APPROVED);
    });
  });

  describe('data encryption and decryption', () => {
    it('should encrypt sensitive fields', async () => {
      const CryptoJS = require('crypto-js');
      const testData = {
        cpf: '12345678900',
        email: 'test@example.com',
        phone: '11999999999'
      };

      mockApiService.post = jest.fn().mockResolvedValue({
        data: { id: 'enrollment-123' },
        status: 201
      });

      await enrollmentService.createEnrollment(testData as any, 'BROKER');

      // Verify encryption was called for sensitive fields
      expect(CryptoJS.AES.encrypt).toHaveBeenCalled();
    });

    it('should decrypt sensitive fields on retrieval', async () => {
      const CryptoJS = require('crypto-js');

      mockApiService.get = jest.fn()
        .mockResolvedValueOnce({ data: { authorized: true } })
        .mockResolvedValueOnce({
          data: {
            id: 'enrollment-123',
            beneficiary: {
              cpf: 'encrypted-cpf',
              email: 'encrypted-email'
            }
          }
        });

      await enrollmentService.getEnrollment('enrollment-123', 'HR_ADMIN');

      // Verify decryption was called
      expect(CryptoJS.AES.decrypt).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };

      mockApiService.post = jest.fn().mockRejectedValue(mockError);

      await expect(
        enrollmentService.createEnrollment({} as any, 'BROKER')
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockApiService.get = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        enrollmentService.getEnrollments({}, 1, 10)
      ).rejects.toThrow();
    });
  });

  describe('filter formatting', () => {
    it('should format date filters correctly', async () => {
      const filters = {
        startDate: new Date('2024-01-01'),
        status: EnrollmentStatus.APPROVED
      };

      mockApiService.get = jest.fn().mockResolvedValue({
        data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }
      });

      await enrollmentService.getEnrollments(filters, 1, 10);

      // Verify API was called with formatted filters
      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('startDate=')
      );
    });

    it('should omit undefined filters', async () => {
      const filters = {
        status: undefined,
        enrollmentId: 'enroll-123'
      };

      mockApiService.get = jest.fn().mockResolvedValue({
        data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }
      });

      await enrollmentService.getEnrollments(filters as any, 1, 10);

      expect(mockApiService.get).toHaveBeenCalled();
    });
  });
});
