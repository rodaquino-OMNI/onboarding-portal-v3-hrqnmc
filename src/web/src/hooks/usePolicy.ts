import { useState, useCallback, useEffect, useRef } from 'react'; // v18.0.0
import { PolicyService } from '../services/policy.service';
import {
  Policy,
  PolicyStatus,
  CoverageDetails,
  WaitingPeriod,
  PolicyValidationError
} from '../types/policy.types';
import { useNotification } from './useNotification';
import { API_CONFIG } from '../constants/app.constants';

// Error messages for different policy operations
const POLICY_ERROR_MESSAGES = {
  NOT_FOUND: 'Policy not found',
  CREATE_FAILED: 'Failed to create policy',
  UPDATE_FAILED: 'Failed to update policy',
  FETCH_FAILED: 'Failed to fetch policy data',
  VALIDATION_FAILED: 'Policy data validation failed',
  NETWORK_ERROR: 'Network error occurred',
  TIMEOUT: 'Operation timed out',
  UNAUTHORIZED: 'Unauthorized access to policy data'
} as const;

// Operation timeouts based on technical requirements
const POLICY_OPERATION_TIMEOUTS = {
  GET: 5000,
  CREATE: 5000,
  UPDATE: 5000,
  RETRY_DELAY: 1000
} as const;

/**
 * Custom hook for comprehensive policy management
 */
export const usePolicy = () => {
  // Initialize services and utilities
  const policyService = new PolicyService();
  const { showSuccess, showError, showWarning } = useNotification();
  
  // State management
  const [loadingStates, setLoadingStates] = useState({
    get: false,
    create: false,
    update: false,
    list: false
  });
  const [errors, setErrors] = useState<Record<string, Error | null>>({});
  
  // Request cancellation and retry management
  const abortControllers = useRef<Record<string, AbortController>>({});
  const retryAttempts = useRef<Record<string, number>>({});
  const maxRetries = API_CONFIG.RETRY.MAX_ATTEMPTS;

  /**
   * Handles cleanup of abort controllers
   */
  useEffect(() => {
    return () => {
      Object.values(abortControllers.current).forEach(controller => {
        controller.abort();
      });
    };
  }, []);

  /**
   * Retrieves a policy by ID with retry logic
   */
  const getPolicy = useCallback(async (policyId: string): Promise<Policy | null> => {
    const operationId = `get-${policyId}`;
    setLoadingStates(prev => ({ ...prev, get: true }));
    setErrors(prev => ({ ...prev, [operationId]: null }));

    try {
      abortControllers.current[operationId]?.abort();
      abortControllers.current[operationId] = new AbortController();

      const policy = await policyService.getPolicyById(policyId);
      return policy;
    } catch (error) {
      const retryCount = (retryAttempts.current[operationId] || 0) + 1;
      
      if (retryCount <= maxRetries) {
        retryAttempts.current[operationId] = retryCount;
        showWarning(`Retrying policy fetch (${retryCount}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, POLICY_OPERATION_TIMEOUTS.RETRY_DELAY));
        return getPolicy(policyId);
      }

      const errorMessage = error instanceof Error ? error.message : POLICY_ERROR_MESSAGES.FETCH_FAILED;
      setErrors(prev => ({ ...prev, [operationId]: new Error(errorMessage) }));
      showError(errorMessage);
      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, get: false }));
      delete retryAttempts.current[operationId];
      delete abortControllers.current[operationId];
    }
  }, [policyService, showError, showWarning]);

  /**
   * Retrieves policies for an enrollment
   */
  const getPoliciesForEnrollment = useCallback(async (enrollmentId: string): Promise<Policy[]> => {
    const operationId = `list-${enrollmentId}`;
    setLoadingStates(prev => ({ ...prev, list: true }));
    setErrors(prev => ({ ...prev, [operationId]: null }));

    try {
      const policies = await policyService.getPoliciesByEnrollmentId(enrollmentId);
      return policies;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : POLICY_ERROR_MESSAGES.FETCH_FAILED;
      setErrors(prev => ({ ...prev, [operationId]: new Error(errorMessage) }));
      showError(errorMessage);
      return [];
    } finally {
      setLoadingStates(prev => ({ ...prev, list: false }));
    }
  }, [policyService, showError]);

  /**
   * Creates a new policy with validation
   */
  const createNewPolicy = useCallback(async (policyData: Partial<Policy>): Promise<Policy | null> => {
    setLoadingStates(prev => ({ ...prev, create: true }));
    setErrors(prev => ({ ...prev, create: null }));

    try {
      const policy = await policyService.createPolicy(policyData);
      showSuccess('Policy created successfully');
      return policy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : POLICY_ERROR_MESSAGES.CREATE_FAILED;
      setErrors(prev => ({ ...prev, create: new Error(errorMessage) }));
      showError(errorMessage);
      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, create: false }));
    }
  }, [policyService, showSuccess, showError]);

  /**
   * Updates policy status with validation
   */
  const updateStatus = useCallback(async (policyId: string, status: PolicyStatus): Promise<Policy | null> => {
    const operationId = `update-status-${policyId}`;
    setLoadingStates(prev => ({ ...prev, update: true }));
    setErrors(prev => ({ ...prev, [operationId]: null }));

    try {
      const policy = await policyService.updatePolicyStatus(policyId, status);
      showSuccess('Policy status updated successfully');
      return policy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : POLICY_ERROR_MESSAGES.UPDATE_FAILED;
      setErrors(prev => ({ ...prev, [operationId]: new Error(errorMessage) }));
      showError(errorMessage);
      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, update: false }));
    }
  }, [policyService, showSuccess, showError]);

  /**
   * Updates policy coverage details with validation
   */
  const updateCoverage = useCallback(async (policyId: string, coverageDetails: CoverageDetails): Promise<Policy | null> => {
    const operationId = `update-coverage-${policyId}`;
    setLoadingStates(prev => ({ ...prev, update: true }));
    setErrors(prev => ({ ...prev, [operationId]: null }));

    try {
      const policy = await policyService.updateCoverageDetails(policyId, coverageDetails);
      showSuccess('Policy coverage updated successfully');
      return policy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : POLICY_ERROR_MESSAGES.UPDATE_FAILED;
      setErrors(prev => ({ ...prev, [operationId]: new Error(errorMessage) }));
      showError(errorMessage);
      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, update: false }));
    }
  }, [policyService, showSuccess, showError]);

  /**
   * Updates policy waiting periods with validation
   */
  const updateWaitingPeriods = useCallback(async (policyId: string, waitingPeriods: WaitingPeriod[]): Promise<Policy | null> => {
    const operationId = `update-waiting-${policyId}`;
    setLoadingStates(prev => ({ ...prev, update: true }));
    setErrors(prev => ({ ...prev, [operationId]: null }));

    try {
      const policy = await policyService.updateWaitingPeriods(policyId, waitingPeriods);
      showSuccess('Waiting periods updated successfully');
      return policy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : POLICY_ERROR_MESSAGES.UPDATE_FAILED;
      setErrors(prev => ({ ...prev, [operationId]: new Error(errorMessage) }));
      showError(errorMessage);
      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, update: false }));
    }
  }, [policyService, showSuccess, showError]);

  /**
   * Retries a failed operation
   */
  const retryOperation = useCallback(async (operationId: string): Promise<void> => {
    const error = errors[operationId];
    if (!error) return;

    setErrors(prev => ({ ...prev, [operationId]: null }));
    const [operation, id] = operationId.split('-');

    switch (operation) {
      case 'get':
        await getPolicy(id);
        break;
      case 'list':
        await getPoliciesForEnrollment(id);
        break;
      case 'update-status':
        // Additional handling required - need status
        break;
      case 'update-coverage':
        // Additional handling required - need coverage details
        break;
      case 'update-waiting':
        // Additional handling required - need waiting periods
        break;
      default:
        console.warn('Unknown operation type:', operation);
    }
  }, [errors, getPolicy, getPoliciesForEnrollment]);

  return {
    getPolicy,
    getPoliciesForEnrollment,
    createNewPolicy,
    updateStatus,
    updateCoverage,
    updateWaitingPeriods,
    retryOperation,
    loadingStates,
    errors
  };
};