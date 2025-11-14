/**
 * Policy Service for Pre-paid Health Plan Onboarding Portal
 * Version: 1.0.0
 * 
 * Implements comprehensive policy management with enhanced security,
 * performance optimization, and robust error handling.
 */

import dayjs from 'dayjs'; // ^1.11.0
import { ErrorHandler } from '../utils/error-handler.utils';
import { Logger } from 'winston'; // ^3.8.0

import { ApiService } from './api.service';
import {
  Policy,
  PolicyStatus,
  CoverageDetails,
  WaitingPeriod,
  isPolicyStatus,
  isCoverageTier
} from '../types/policy.types';
import { API_ENDPOINTS } from '../constants/api.constants';
import { ApiResponse, ApiError, isApiError } from '../types/api.types';

/**
 * Service class for managing health insurance policies
 */
export class PolicyService {
  private readonly policyCache: Map<string, { data: Policy; timestamp: number }>;
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  constructor(
    private readonly apiService: ApiService = new ApiService(),
    private readonly errorHandler: ErrorHandler = new ErrorHandler(),
    private readonly logger: Logger = console as any
  ) {
    this.policyCache = new Map();
  }

  /**
   * Retrieves a policy by its ID with caching
   * @param policyId - Unique identifier of the policy
   */
  public async getPolicyById(policyId: string): Promise<Policy> {
    try {
      // Check cache first
      const cached = this.getCachedPolicy(policyId);
      if (cached) return cached;

      const response = await this.apiService.get<Policy>(
        `${API_ENDPOINTS.POLICY.BASE}/${policyId}`
      );

      const policy = this.transformPolicyResponse(response.data);
      this.cachePolicy(policyId, policy);

      return policy;
    } catch (error) {
      this.logger.error('Error fetching policy', { policyId, error });
      throw this.handlePolicyError(error);
    }
  }

  /**
   * Retrieves all policies for a given enrollment
   * @param enrollmentId - Enrollment identifier
   */
  public async getPoliciesByEnrollmentId(enrollmentId: string): Promise<Policy[]> {
    try {
      const response = await this.apiService.get<Policy[]>(
        `${API_ENDPOINTS.POLICY.BASE}/enrollment/${enrollmentId}`
      );
      return response.data.map(policy => this.transformPolicyResponse(policy));
    } catch (error) {
      this.logger.error('Error fetching enrollment policies', { enrollmentId, error });
      throw this.handlePolicyError(error);
    }
  }

  /**
   * Creates a new policy with validation
   * @param policyData - Policy creation data
   */
  public async createPolicy(policyData: Partial<Policy>): Promise<Policy> {
    try {
      this.validatePolicyData(policyData);

      const response = await this.apiService.post<Policy>(
        API_ENDPOINTS.POLICY.CREATE,
        policyData
      );

      const policy = this.transformPolicyResponse(response.data);
      this.cachePolicy(policy.id.toString(), policy);

      return policy;
    } catch (error) {
      this.logger.error('Error creating policy', { policyData, error });
      throw this.handlePolicyError(error);
    }
  }

  /**
   * Updates policy status with validation
   * @param policyId - Policy identifier
   * @param status - New policy status
   */
  public async updatePolicyStatus(
    policyId: string,
    status: PolicyStatus
  ): Promise<Policy> {
    try {
      if (!isPolicyStatus(status)) {
        throw new Error(`Invalid policy status: ${status}`);
      }

      const response = await this.apiService.put<Policy>(
        `${API_ENDPOINTS.POLICY.STATUS.replace(':id', policyId)}`,
        { status }
      );

      const policy = this.transformPolicyResponse(response.data);
      this.cachePolicy(policyId, policy);

      return policy;
    } catch (error) {
      this.logger.error('Error updating policy status', { policyId, status, error });
      throw this.handlePolicyError(error);
    }
  }

  /**
   * Updates policy coverage details with validation
   * @param policyId - Policy identifier
   * @param coverageDetails - Updated coverage details
   */
  public async updateCoverageDetails(
    policyId: string,
    coverageDetails: CoverageDetails
  ): Promise<Policy> {
    try {
      if (!isCoverageTier(coverageDetails.coverageTier)) {
        throw new Error(`Invalid coverage tier: ${coverageDetails.coverageTier}`);
      }

      const response = await this.apiService.put<Policy>(
        `${API_ENDPOINTS.POLICY.COVERAGE.replace(':id', policyId)}`,
        { coverageDetails }
      );

      const policy = this.transformPolicyResponse(response.data);
      this.cachePolicy(policyId, policy);

      return policy;
    } catch (error) {
      this.logger.error('Error updating coverage details', { policyId, coverageDetails, error });
      throw this.handlePolicyError(error);
    }
  }

  /**
   * Updates policy waiting periods with validation
   * @param policyId - Policy identifier
   * @param waitingPeriods - Updated waiting periods
   */
  public async updateWaitingPeriods(
    policyId: string,
    waitingPeriods: WaitingPeriod[]
  ): Promise<Policy> {
    try {
      this.validateWaitingPeriods(waitingPeriods);

      const response = await this.apiService.put<Policy>(
        `${API_ENDPOINTS.POLICY.BASE}/${policyId}/waiting-periods`,
        { waitingPeriods }
      );

      const policy = this.transformPolicyResponse(response.data);
      this.cachePolicy(policyId, policy);

      return policy;
    } catch (error) {
      this.logger.error('Error updating waiting periods', { policyId, waitingPeriods, error });
      throw this.handlePolicyError(error);
    }
  }

  /**
   * Validates policy data before operations
   * @param policyData - Policy data to validate
   */
  private validatePolicyData(policyData: Partial<Policy>): void {
    if (!policyData.enrollmentId) {
      throw new Error('Enrollment ID is required');
    }

    if (policyData.monthlyPremium && policyData.monthlyPremium <= 0) {
      throw new Error('Monthly premium must be greater than zero');
    }

    if (policyData.effectiveDate) {
      const effectiveDate = dayjs(policyData.effectiveDate);
      if (effectiveDate.isBefore(dayjs(), 'day')) {
        throw new Error('Effective date cannot be in the past');
      }
    }
  }

  /**
   * Validates waiting periods data
   * @param waitingPeriods - Waiting periods to validate
   */
  private validateWaitingPeriods(waitingPeriods: WaitingPeriod[]): void {
    for (const period of waitingPeriods) {
      if (period.durationInDays <= 0) {
        throw new Error('Waiting period duration must be greater than zero');
      }

      const startDate = dayjs(period.startDate);
      const endDate = dayjs(period.endDate);

      if (endDate.isBefore(startDate)) {
        throw new Error('End date cannot be before start date');
      }
    }
  }

  /**
   * Transforms API response to policy object
   * @param apiResponse - Raw API response
   */
  private transformPolicyResponse(apiResponse: any): Policy {
    return {
      ...apiResponse,
      effectiveDate: new Date(apiResponse.effectiveDate),
      expiryDate: new Date(apiResponse.expiryDate),
      createdAt: new Date(apiResponse.createdAt),
      updatedAt: new Date(apiResponse.updatedAt),
      waitingPeriods: apiResponse.waitingPeriods?.map((wp: any) => ({
        ...wp,
        startDate: new Date(wp.startDate),
        endDate: new Date(wp.endDate)
      }))
    };
  }

  /**
   * Handles and transforms policy-related errors
   * @param error - Error to handle
   */
  private handlePolicyError(error: unknown): Error {
    if (isApiError(error)) {
      const err = new Error(error.message);
      ErrorHandler.handle(err);
      return err;
    }
    return new Error('An unexpected error occurred while processing the policy');
  }

  /**
   * Retrieves cached policy if valid
   * @param policyId - Policy identifier
   */
  private getCachedPolicy(policyId: string): Policy | null {
    const cached = this.policyCache.get(policyId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Caches policy data
   * @param policyId - Policy identifier
   * @param policy - Policy data to cache
   */
  private cachePolicy(policyId: string, policy: Policy): void {
    this.policyCache.set(policyId, {
      data: policy,
      timestamp: Date.now()
    });
  }
}