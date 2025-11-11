// @ts-check
import { z } from 'zod'; // v3.22.0 - Runtime type validation
import { ApiResponse } from '../types/api.types';

/**
 * Enumeration of possible question types in health assessment questionnaire
 */
export enum QuestionType {
  TEXT = 'TEXT',
  NUMERIC = 'NUMERIC',
  BOOLEAN = 'BOOLEAN',
  CHOICE = 'CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE'
}

/**
 * Enumeration of risk levels from health assessment
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Constants for questionnaire status tracking
 */
export const QUESTIONNAIRE_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

/**
 * Maximum number of questions allowed in a questionnaire
 */
export const MAX_QUESTIONS = 50;

/**
 * Interface for health questionnaire questions with enhanced validation
 */
export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  validationRules: Record<string, any>;
  required: boolean;
  dependencies: string[];
}

/**
 * Interface for question responses with security features
 */
export interface QuestionResponse {
  questionId: string;
  value: any;
  timestamp: string;
  encryptedValue: string; // AES-256 encrypted value
  auditTrail: Record<string, any>;
}

/**
 * Interface for identified risk factors with detailed metrics
 */
export interface RiskFactor {
  code: string;
  description: string;
  severity: number;
  relatedQuestions: string[];
  impactScore: number;
  mitigationRequired: boolean;
  confidenceLevel: number;
}

/**
 * Interface for health questionnaire with validation and security
 */
export interface Questionnaire {
  id: string;
  enrollmentId: string;
  questions: Question[];
  responses: QuestionResponse[];
  status: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  riskAssessment?: RiskAssessment;
}

/**
 * Interface for health risk assessment results with security and audit features
 */
export interface RiskAssessment {
  questionnaireId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  assessmentDate: string;
  assessmentVersion: string;
  algorithmConfidence: number;
  securityHash: string; // SHA-256 hash for data integrity
  auditLog: Record<string, any>;
}

/**
 * Zod schema for Question validation
 */
export const questionSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  type: z.nativeEnum(QuestionType),
  options: z.array(z.string()).optional(),
  validationRules: z.record(z.any()),
  required: z.boolean(),
  dependencies: z.array(z.string().uuid())
});

/**
 * Zod schema for QuestionResponse validation with security checks
 */
export const questionResponseSchema = z.object({
  questionId: z.string().uuid(),
  value: z.any(),
  timestamp: z.string().datetime(),
  encryptedValue: z.string(),
  auditTrail: z.record(z.any())
});

/**
 * Zod schema for RiskFactor validation
 */
export const riskFactorSchema = z.object({
  code: z.string(),
  description: z.string(),
  severity: z.number().min(0).max(10),
  relatedQuestions: z.array(z.string().uuid()),
  impactScore: z.number().min(0).max(100),
  mitigationRequired: z.boolean(),
  confidenceLevel: z.number().min(0).max(1)
});

/**
 * Zod schema for RiskAssessment validation with security features
 */
export const riskAssessmentSchema = z.object({
  questionnaireId: z.string().uuid(),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.nativeEnum(RiskLevel),
  riskFactors: z.array(riskFactorSchema),
  assessmentDate: z.string().datetime(),
  assessmentVersion: z.string(),
  algorithmConfidence: z.number().min(0).max(1),
  securityHash: z.string().length(64), // SHA-256 hash length
  auditLog: z.record(z.any())
});

/**
 * Type definitions for API responses
 */
export type QuestionnaireResponse = ApiResponse<Question[]>;
export type RiskAssessmentResponse = ApiResponse<RiskAssessment>;
export type QuestionResponseSubmission = ApiResponse<QuestionResponse>;

/**
 * Type guard to validate Question object
 */
export const isValidQuestion = (question: unknown): question is Question => {
  return questionSchema.safeParse(question).success;
};

/**
 * Type guard to validate RiskAssessment object
 */
export const isValidRiskAssessment = (assessment: unknown): assessment is RiskAssessment => {
  return riskAssessmentSchema.safeParse(assessment).success;
};