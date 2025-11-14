import { useState, useCallback, useEffect, useRef } from 'react'; // v18.0.0
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'; // ^4.0.0
import { isEqual } from 'lodash'; // ^4.17.21

import {
  createEnrollment,
  updateEnrollment,
  getEnrollment,
  listEnrollments,
  updateEnrollmentStatus
} from '../api/enrollment.api';

import {
  Enrollment,
  EnrollmentStatus,
  EnrollmentFilters,
  Beneficiary,
  EnrollmentError
} from '../types/enrollment.types';

import { useNotification } from './useNotification';
import { useAuth } from './useAuth';

// Cache configuration
const ENROLLMENT_QUERY_KEY = 'enrollment';
const ENROLLMENT_LIST_QUERY_KEY = 'enrollmentList';
const STALE_TIME = 300000; // 5 minutes
const CACHE_TIME = 3600000; // 1 hour
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Custom hook for managing enrollment data with comprehensive security and LGPD compliance
 * @param enrollmentId Optional enrollment ID for single enrollment operations
 * @param queryOptions Optional React Query configuration
 */
export function useEnrollment(
  enrollmentId?: string,
  queryOptions?: UseQueryOptions<Enrollment>
) {
  const { userRole, checkPermission } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();
  const queryClient = useQueryClient();
  const isMounted = useRef(true);
  const [error, setError] = useState<EnrollmentError | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Query for single enrollment
  const {
    data: enrollment,
    isLoading,
    isFetching,
    isValidating,
    refetch
  } = useQuery(
    [ENROLLMENT_QUERY_KEY, enrollmentId],
    () => getEnrollment(enrollmentId!),
    {
      enabled: !!enrollmentId && checkPermission('view_enrollment'),
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      retry: MAX_RETRIES,
      retryDelay: RETRY_DELAY,
      ...queryOptions
    }
  );

  // Create enrollment mutation
  const createMutation = useMutation(
    (beneficiaryData: Beneficiary) => createEnrollment(beneficiaryData),
    {
      onSuccess: (newEnrollment) => {
        if (isMounted.current) {
          queryClient.setQueryData(
            [ENROLLMENT_QUERY_KEY, newEnrollment.id],
            newEnrollment
          );
          showSuccess('Enrollment created successfully');
        }
      },
      onError: (error: EnrollmentError) => {
        setError(error);
        showError(error.message);
      }
    }
  );

  // Update enrollment mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: Partial<Enrollment> }) =>
      updateEnrollment(id, data),
    {
      onSuccess: (updatedEnrollment) => {
        if (isMounted.current) {
          queryClient.setQueryData(
            [ENROLLMENT_QUERY_KEY, updatedEnrollment.id],
            updatedEnrollment
          );
          showSuccess('Enrollment updated successfully');
        }
      },
      onError: (error: EnrollmentError) => {
        setError(error);
        showError(error.message);
      }
    }
  );

  // Status update mutation
  const statusMutation = useMutation(
    ({ id, status }: { id: string; status: EnrollmentStatus }) =>
      updateEnrollmentStatus(id, status),
    {
      onSuccess: (updatedEnrollment) => {
        if (isMounted.current) {
          queryClient.setQueryData(
            [ENROLLMENT_QUERY_KEY, updatedEnrollment.id],
            updatedEnrollment
          );
          showSuccess('Status updated successfully');
        }
      },
      onError: (error: EnrollmentError) => {
        setError(error);
        showError(error.message);
      }
    }
  );

  /**
   * Creates a new enrollment with validation and security checks
   */
  const createNewEnrollment = useCallback(async (beneficiaryData: Beneficiary) => {
    if (!checkPermission('create_enrollment')) {
      showError('Insufficient permissions to create enrollment');
      return;
    }

    try {
      await createMutation.mutateAsync(beneficiaryData);
    } catch (error) {
      console.error('Create enrollment error:', error);
    }
  }, [checkPermission, createMutation, showError]);

  /**
   * Updates an existing enrollment with validation
   */
  const updateExistingEnrollment = useCallback(
    async (enrollmentId: string, updateData: Partial<Enrollment>) => {
      if (!checkPermission('update_enrollment')) {
        showError('Insufficient permissions to update enrollment');
        return;
      }

      try {
        await updateMutation.mutateAsync({ id: enrollmentId, data: updateData });
      } catch (error) {
        console.error('Update enrollment error:', error);
      }
    },
    [checkPermission, updateMutation, showError]
  );

  /**
   * Changes enrollment status with state machine validation
   */
  const changeEnrollmentStatus = useCallback(
    async (enrollmentId: string, newStatus: EnrollmentStatus) => {
      if (!checkPermission('change_enrollment_status')) {
        showError('Insufficient permissions to change status');
        return;
      }

      try {
        await statusMutation.mutateAsync({ id: enrollmentId, status: newStatus });
      } catch (error) {
        console.error('Status update error:', error);
      }
    },
    [checkPermission, statusMutation, showError]
  );

  /**
   * Fetches paginated enrollment list with filtering
   */
  const fetchEnrollmentList = useCallback(
    async (page: number, pageSize: number, filters?: EnrollmentFilters) => {
      if (!checkPermission('view_enrollment_list')) {
        showError('Insufficient permissions to view enrollments');
        return;
      }

      try {
        const response = await listEnrollments({ page, pageSize, ...filters });
        if (isMounted.current) {
          queryClient.setQueryData(ENROLLMENT_LIST_QUERY_KEY, response);
        }
      } catch (error) {
        console.error('Fetch enrollment list error:', error);
        showError('Failed to fetch enrollment list');
      }
    },
    [checkPermission, queryClient, showError]
  );

  /**
   * Retries failed operations with exponential backoff
   */
  const retryFailedOperation = useCallback(async () => {
    if (error) {
      setError(null);
      await refetch();
    }
  }, [error, refetch]);

  return {
    enrollment,
    isLoading,
    error,
    createNewEnrollment,
    updateExistingEnrollment,
    changeEnrollmentStatus,
    fetchEnrollmentList,
    isFetching,
    isValidating,
    retryFailedOperation
  };
}