/**
 * Enrollment Service for Pre-paid Health Plan Onboarding Portal
 * Version: 1.0.0
 * 
 * Implements secure enrollment processing with LGPD compliance,
 * role-based access control, and comprehensive data validation.
 */

import { ApiService } from './api.service';
import {
  Enrollment,
  EnrollmentStatus,
  Beneficiary,
  RequiredDocument,
  EnrollmentFilters,
  EnrollmentSummary,
  beneficiarySchema,
  enrollmentSchema,
  isValidBeneficiary,
  isValidEnrollment
} from '../types/enrollment.types';
import { RiskLevel } from '../types/health.types';
import { ApiError, ApiResponse, PaginatedResponse, isApiError } from '../types/api.types';
import { API_ENDPOINTS } from '../constants/api.constants';
import CryptoJS from 'crypto-js'; // v4.1.1

/**
 * Service class for managing health plan enrollments with LGPD compliance
 */
export class EnrollmentService {
  private readonly apiService: ApiService;
  private readonly sensitiveFields = ['cpf', 'rg', 'dateOfBirth', 'email', 'phone'];
  private readonly encryptionKey: string;

  constructor(apiService: ApiService) {
    this.apiService = apiService;
    this.encryptionKey = process.env.VITE_ENCRYPTION_KEY || '';
  }

  /**
   * Creates a new enrollment with proper validation and encryption
   */
  public async createEnrollment(
    beneficiary: Beneficiary,
    userRole: string
  ): Promise<ApiResponse<Enrollment>> {
    try {
      // Validate user role authorization
      this.validateUserRole(userRole, ['BROKER', 'HR_ADMIN']);

      // Validate beneficiary data
      if (!isValidBeneficiary(beneficiary)) {
        throw new Error('Invalid beneficiary data');
      }

      // Encrypt sensitive data
      const encryptedBeneficiary = this.encryptSensitiveData(beneficiary);

      const enrollmentData = {
        beneficiary: encryptedBeneficiary,
        status: EnrollmentStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: {},
        riskLevel: RiskLevel.LOW,
        lastModifiedBy: userRole
      };

      const response = await this.apiService.post<Enrollment>(
        API_ENDPOINTS.ENROLLMENT.CREATE,
        enrollmentData
      );

      return response;
    } catch (error) {
      this.handleEnrollmentError(error);
      throw error;
    }
  }

  /**
   * Updates enrollment with role-based validation and LGPD compliance
   */
  public async updateEnrollment(
    enrollmentId: string,
    updates: Partial<Enrollment>,
    userRole: string
  ): Promise<ApiResponse<Enrollment>> {
    try {
      // Validate user role and permissions
      this.validateUserRole(userRole, ['BROKER', 'HR_ADMIN', 'UNDERWRITER']);

      // Validate enrollment access
      await this.validateEnrollmentAccess(enrollmentId, userRole);

      // Encrypt sensitive updates if present
      const encryptedUpdates = this.encryptSensitiveData(updates);

      const response = await this.apiService.put<Enrollment>(
        `${API_ENDPOINTS.ENROLLMENT.UPDATE.replace(':id', enrollmentId)}`,
        {
          ...encryptedUpdates,
          updatedAt: new Date(),
          lastModifiedBy: userRole
        }
      );

      return response;
    } catch (error) {
      this.handleEnrollmentError(error);
      throw error;
    }
  }

  /**
   * Retrieves enrollment details with proper decryption
   */
  public async getEnrollment(
    enrollmentId: string,
    userRole: string
  ): Promise<ApiResponse<Enrollment>> {
    try {
      // Validate user role and permissions
      this.validateUserRole(userRole, ['BROKER', 'HR_ADMIN', 'UNDERWRITER', 'BENEFICIARY']);

      // Validate enrollment access
      await this.validateEnrollmentAccess(enrollmentId, userRole);

      const response = await this.apiService.get<Enrollment>(
        `${API_ENDPOINTS.ENROLLMENT.BASE}/${enrollmentId}`
      );

      // Decrypt sensitive data
      if (response.data) {
        response.data.beneficiary = this.decryptSensitiveData(response.data.beneficiary);
      }

      return response;
    } catch (error) {
      this.handleEnrollmentError(error);
      throw error;
    }
  }

  /**
   * Retrieves filtered list of enrollments with pagination
   */
  public async getEnrollments(
    filters: EnrollmentFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<EnrollmentSummary>> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...this.formatFilters(filters)
      });

      const response = await this.apiService.get<EnrollmentSummary[]>(
        `${API_ENDPOINTS.ENROLLMENT.BASE}?${queryParams.toString()}`
      );

      return response;
    } catch (error) {
      this.handleEnrollmentError(error);
      throw error;
    }
  }

  /**
   * Updates enrollment status with proper validation
   */
  public async updateEnrollmentStatus(
    enrollmentId: string,
    status: EnrollmentStatus,
    userRole: string
  ): Promise<ApiResponse<Enrollment>> {
    try {
      // Validate user role and permissions
      this.validateUserRole(userRole, ['BROKER', 'HR_ADMIN', 'UNDERWRITER']);

      // Validate status transition
      this.validateStatusTransition(status, userRole);

      const response = await this.apiService.put<Enrollment>(
        `${API_ENDPOINTS.ENROLLMENT.STATUS.replace(':id', enrollmentId)}`,
        { status, lastModifiedBy: userRole }
      );

      return response;
    } catch (error) {
      this.handleEnrollmentError(error);
      throw error;
    }
  }

  /**
   * Encrypts sensitive data using AES-256
   */
  private encryptSensitiveData<T extends Record<string, any>>(data: T): T {
    const encrypted = { ...data };
    for (const field of this.sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = CryptoJS.AES.encrypt(
          encrypted[field].toString(),
          this.encryptionKey
        ).toString();
      }
    }
    return encrypted;
  }

  /**
   * Decrypts sensitive data using AES-256
   */
  private decryptSensitiveData<T extends Record<string, any>>(data: T): T {
    const decrypted = { ...data };
    for (const field of this.sensitiveFields) {
      if (decrypted[field]) {
        const bytes = CryptoJS.AES.decrypt(decrypted[field], this.encryptionKey);
        decrypted[field] = bytes.toString(CryptoJS.enc.Utf8);
      }
    }
    return decrypted;
  }

  /**
   * Validates user role authorization
   */
  private validateUserRole(userRole: string, allowedRoles: string[]): void {
    if (!allowedRoles.includes(userRole)) {
      throw new Error('Unauthorized access');
    }
  }

  /**
   * Validates enrollment access based on user role
   */
  private async validateEnrollmentAccess(
    enrollmentId: string,
    userRole: string
  ): Promise<void> {
    const response = await this.apiService.get<{ authorized: boolean }>(
      `${API_ENDPOINTS.ENROLLMENT.BASE}/${enrollmentId}/access`,
      { params: { userRole } }
    );

    if (!response.data.authorized) {
      throw new Error('Unauthorized access to enrollment');
    }
  }

  /**
   * Validates enrollment status transitions
   */
  private validateStatusTransition(status: EnrollmentStatus, userRole: string): void {
    const allowedTransitions: Record<string, EnrollmentStatus[]> = {
      BROKER: [
        EnrollmentStatus.DRAFT,
        EnrollmentStatus.PENDING_DOCUMENTS,
        EnrollmentStatus.CANCELLED
      ],
      UNDERWRITER: [
        EnrollmentStatus.UNDER_REVIEW,
        EnrollmentStatus.APPROVED,
        EnrollmentStatus.REJECTED
      ]
    };

    if (!allowedTransitions[userRole]?.includes(status)) {
      throw new Error('Invalid status transition for user role');
    }
  }

  /**
   * Formats filters for API query
   */
  private formatFilters(filters: EnrollmentFilters): Record<string, string> {
    const formatted: Record<string, string> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (value instanceof Date) {
          formatted[key] = value.toISOString();
        } else {
          formatted[key] = value.toString();
        }
      }
    });

    return formatted;
  }

  /**
   * Handles enrollment-specific errors
   */
  private handleEnrollmentError(error: unknown): never {
    if (isApiError(error)) {
      throw error;
    }
    throw new Error('An unexpected error occurred during enrollment processing');
  }
}

// Default export for convenience
export default EnrollmentService;