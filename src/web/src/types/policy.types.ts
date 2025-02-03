/**
 * @fileoverview TypeScript type definitions for policy-related data structures.
 * @version 1.0.0
 */

// External imports
import { UUID } from 'crypto';

/**
 * Represents the status of a health insurance policy.
 * @enum {string}
 */
export enum PolicyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

/**
 * Represents the coverage tier level of a policy.
 * @enum {string}
 */
export enum CoverageTier {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ELITE = 'ELITE'
}

/**
 * Represents different types of medical procedures covered.
 * @enum {string}
 */
export enum CoverageProcedureType {
  CONSULTATION = 'CONSULTATION',
  SURGERY = 'SURGERY',
  DIAGNOSTIC = 'DIAGNOSTIC',
  EMERGENCY = 'EMERGENCY',
  DENTAL = 'DENTAL',
  MATERNITY = 'MATERNITY',
  MENTAL_HEALTH = 'MENTAL_HEALTH'
}

/**
 * Represents the status of a waiting period.
 * @enum {string}
 */
export enum WaitingPeriodStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

/**
 * Represents coverage limits for specific procedures.
 * @interface
 */
export interface CoverageLimit {
  annualLimit: number;
  lifetimeLimit: number;
  copaymentPercentage: number;
  requiresPreAuthorization: boolean;
}

/**
 * Represents detailed coverage information for a policy.
 * @interface
 */
export interface CoverageDetails {
  hospitalCoverage: boolean;
  outpatientCoverage: boolean;
  dentalCoverage: boolean;
  maternityCoverage: boolean;
  mentalHealthCoverage: boolean;
  coverageLimits: Record<CoverageProcedureType, CoverageLimit>;
  coverageTier: CoverageTier;
}

/**
 * Represents a waiting period for specific procedures.
 * @interface
 */
export interface WaitingPeriod {
  procedureType: string;
  durationInDays: number;
  startDate: Date;
  endDate: Date;
  status: WaitingPeriodStatus;
}

/**
 * Represents a policy exclusion for specific conditions.
 * @interface
 */
export interface Exclusion {
  condition: string;
  reason: string;
  appliedDate: Date;
}

/**
 * Represents an audit entry for policy changes.
 * @interface
 */
export interface PolicyAuditEntry {
  timestamp: Date;
  userId: UUID;
  action: string;
  changes: Record<string, unknown>;
  reason?: string;
}

/**
 * Main interface representing a health insurance policy.
 * @interface
 */
export interface Policy {
  /** Unique identifier for the policy */
  id: UUID;
  /** Reference to the enrollment that generated this policy */
  enrollmentId: UUID;
  /** Reference to the underwriter who approved the policy */
  underwriterId: UUID;
  /** Human-readable policy number */
  policyNumber: string;
  /** Current status of the policy */
  status: PolicyStatus;
  /** Monthly premium amount in the local currency */
  monthlyPremium: number;
  /** Detailed coverage information */
  coverageDetails: CoverageDetails;
  /** List of waiting periods for different procedures */
  waitingPeriods: WaitingPeriod[];
  /** List of specific exclusions applied to the policy */
  exclusions: Exclusion[];
  /** Date when the policy becomes effective */
  effectiveDate: Date;
  /** Date when the policy expires */
  expiryDate: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Policy version number for optimistic locking */
  version: number;
  /** History of changes made to the policy */
  auditTrail: PolicyAuditEntry[];
}

/**
 * Type guard to check if a value is a valid PolicyStatus
 * @param value - Value to check
 */
export function isPolicyStatus(value: unknown): value is PolicyStatus {
  return Object.values(PolicyStatus).includes(value as PolicyStatus);
}

/**
 * Type guard to check if a value is a valid CoverageTier
 * @param value - Value to check
 */
export function isCoverageTier(value: unknown): value is CoverageTier {
  return Object.values(CoverageTier).includes(value as CoverageTier);
}