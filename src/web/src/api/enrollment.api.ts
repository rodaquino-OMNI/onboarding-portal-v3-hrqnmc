/**
 * Enrollment API Client Module
 * Version: 1.0.0
 * 
 * Implements comprehensive API client for managing health plan enrollments
 * with LGPD compliance, performance monitoring, and security features.
 */

import axios from 'axios'; // ^1.5.0
import retry from 'axios-retry'; // ^3.8.0
import { trace } from '@opentelemetry/api'; // ^1.4.0
import CryptoJS from 'crypto-js'; // ^4.1.1

import type {
  ApiResponse,
  ApiError,
  PaginatedResponse
} from '../types/api.types';

import type {
  Enrollment,
  EnrollmentFilters,
  Beneficiary,
  RequiredDocument
} from '../types/enrollment.types';
import {
  EnrollmentStatus,
  isValidBeneficiary,
  isValidEnrollment
} from '../types/enrollment.types';

import {
  createApiClient,
  handleApiError,
  createRequestConfig
} from '../utils/api.utils';

import { API_ENDPOINTS } from '../constants/api.constants';

// Initialize tracer for performance monitoring
const tracer = trace.getTracer('enrollment-api');

/**
 * Creates a new enrollment application with comprehensive validation and monitoring
 * @param beneficiaryData Beneficiary information
 * @param config Optional request configuration
 * @returns Promise with created enrollment data
 */
export async function createEnrollment(
  beneficiaryData: Beneficiary,
  config = createRequestConfig()
): Promise<ApiResponse<Enrollment>> {
  const span = tracer.startSpan('createEnrollment');
  
  try {
    // Validate beneficiary data
    if (!isValidBeneficiary(beneficiaryData)) {
      throw new Error('Invalid beneficiary data');
    }

    // Encrypt sensitive health information
    const encryptedHealth = CryptoJS.AES.encrypt(
      JSON.stringify(beneficiaryData.healthData),
      process.env.VITE_ENCRYPTION_KEY!
    ).toString();

    const apiClient = createApiClient(config);
    const response = await apiClient.post<ApiResponse<Enrollment>>(
      API_ENDPOINTS.ENROLLMENT.CREATE,
      {
        ...beneficiaryData,
        healthData: encryptedHealth,
        status: EnrollmentStatus.DRAFT
      }
    );

    span.setStatus({ code: 0 });
    return response.data;
  } catch (error) {
    span.setStatus({ code: 1, message: (error as Error).message });
    throw handleApiError(error);
  } finally {
    span.end();
  }
}

/**
 * Updates an existing enrollment with validation
 * @param enrollmentId Enrollment ID
 * @param updateData Updated enrollment data
 * @param config Optional request configuration
 * @returns Promise with updated enrollment data
 */
export async function updateEnrollment(
  enrollmentId: string,
  updateData: Partial<Enrollment>,
  config = createRequestConfig()
): Promise<ApiResponse<Enrollment>> {
  const span = tracer.startSpan('updateEnrollment');
  
  try {
    const apiClient = createApiClient(config);
    const response = await apiClient.put<ApiResponse<Enrollment>>(
      API_ENDPOINTS.ENROLLMENT.UPDATE.replace(':id', enrollmentId),
      updateData
    );

    span.setStatus({ code: 0 });
    return response.data;
  } catch (error) {
    span.setStatus({ code: 1, message: (error as Error).message });
    throw handleApiError(error);
  } finally {
    span.end();
  }
}

/**
 * Retrieves enrollment details with security checks
 * @param enrollmentId Enrollment ID
 * @param config Optional request configuration
 * @returns Promise with enrollment data
 */
export async function getEnrollment(
  enrollmentId: string,
  config = createRequestConfig()
): Promise<ApiResponse<Enrollment>> {
  const span = tracer.startSpan('getEnrollment');
  
  try {
    const apiClient = createApiClient(config);
    const response = await apiClient.get<ApiResponse<Enrollment>>(
      API_ENDPOINTS.ENROLLMENT.BASE + `/${enrollmentId}`
    );

    if (!isValidEnrollment(response.data.data)) {
      throw new Error('Invalid enrollment data received');
    }

    span.setStatus({ code: 0 });
    return response.data;
  } catch (error) {
    span.setStatus({ code: 1, message: (error as Error).message });
    throw handleApiError(error);
  } finally {
    span.end();
  }
}

/**
 * Retrieves paginated list of enrollments with filtering
 * @param filters Optional enrollment filters
 * @param config Optional request configuration
 * @returns Promise with paginated enrollment data
 */
export async function listEnrollments(
  filters?: EnrollmentFilters,
  config = createRequestConfig()
): Promise<PaginatedResponse<Enrollment>> {
  const span = tracer.startSpan('listEnrollments');
  
  try {
    const apiClient = createApiClient(config);
    const response = await apiClient.get<PaginatedResponse<Enrollment>>(
      API_ENDPOINTS.ENROLLMENT.BASE,
      { params: filters }
    );

    span.setStatus({ code: 0 });
    return response.data;
  } catch (error) {
    span.setStatus({ code: 1, message: (error as Error).message });
    throw handleApiError(error);
  } finally {
    span.end();
  }
}

/**
 * Updates enrollment status with transition validation
 * @param enrollmentId Enrollment ID
 * @param newStatus New enrollment status
 * @param config Optional request configuration
 * @returns Promise with updated enrollment data
 */
export async function updateEnrollmentStatus(
  enrollmentId: string,
  newStatus: EnrollmentStatus,
  config = createRequestConfig()
): Promise<ApiResponse<Enrollment>> {
  const span = tracer.startSpan('updateEnrollmentStatus');
  
  try {
    if (!validateStatusTransition(newStatus)) {
      throw new Error('Invalid status transition');
    }

    const apiClient = createApiClient(config);
    const response = await apiClient.patch<ApiResponse<Enrollment>>(
      API_ENDPOINTS.ENROLLMENT.STATUS.replace(':id', enrollmentId),
      { status: newStatus }
    );

    span.setStatus({ code: 0 });
    return response.data;
  } catch (error) {
    span.setStatus({ code: 1, message: (error as Error).message });
    throw handleApiError(error);
  } finally {
    span.end();
  }
}

/**
 * Handles secure document upload with progress tracking
 * @param enrollmentId Enrollment ID
 * @param file Document file
 * @param documentType Document type
 * @param config Optional request configuration
 * @returns Promise with upload result
 */
export async function uploadEnrollmentDocument(
  enrollmentId: string,
  file: File,
  documentType: string,
  config = createRequestConfig()
): Promise<ApiResponse<RequiredDocument>> {
  const span = tracer.startSpan('uploadEnrollmentDocument');
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('enrollmentId', enrollmentId);

    const apiClient = createApiClient({
      ...config,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data'
      }
    });

    const response = await apiClient.post<ApiResponse<RequiredDocument>>(
      API_ENDPOINTS.DOCUMENT.UPLOAD,
      formData,
      {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 0)
          );
          span.addEvent('upload_progress', { percentCompleted });
        }
      }
    );

    span.setStatus({ code: 0 });
    return response.data;
  } catch (error) {
    span.setStatus({ code: 1, message: (error as Error).message });
    throw handleApiError(error);
  } finally {
    span.end();
  }
}

/**
 * Validates enrollment status transitions
 * @param newStatus New status to validate
 * @returns boolean indicating if transition is valid
 */
export function validateStatusTransition(newStatus: EnrollmentStatus): boolean {
  const validTransitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
    [EnrollmentStatus.DRAFT]: [
      EnrollmentStatus.PENDING_DOCUMENTS,
      EnrollmentStatus.CANCELLED
    ],
    [EnrollmentStatus.PENDING_DOCUMENTS]: [
      EnrollmentStatus.PENDING_HEALTH_ASSESSMENT,
      EnrollmentStatus.CANCELLED
    ],
    [EnrollmentStatus.PENDING_HEALTH_ASSESSMENT]: [
      EnrollmentStatus.PENDING_PAYMENT,
      EnrollmentStatus.UNDER_REVIEW,
      EnrollmentStatus.CANCELLED
    ],
    [EnrollmentStatus.PENDING_PAYMENT]: [
      EnrollmentStatus.UNDER_REVIEW,
      EnrollmentStatus.CANCELLED
    ],
    [EnrollmentStatus.UNDER_REVIEW]: [
      EnrollmentStatus.APPROVED,
      EnrollmentStatus.REJECTED,
      EnrollmentStatus.CANCELLED
    ],
    [EnrollmentStatus.APPROVED]: [EnrollmentStatus.CANCELLED],
    [EnrollmentStatus.REJECTED]: [EnrollmentStatus.CANCELLED],
    [EnrollmentStatus.CANCELLED]: []
  };

  return Object.values(validTransitions).some(transitions => 
    transitions.includes(newStatus)
  );
}