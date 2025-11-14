// @ts-check
import { z } from 'zod'; // v3.22.0 - Runtime type validation
import { ApiResponse } from './api.types';
import { Question, Questionnaire, RiskLevel } from './health.types';
import { BrazilianState } from '../utils/type-guards.utils';

/**
 * Enumeration of possible enrollment statuses with strict state management
 */
export enum EnrollmentStatus {
  DRAFT = 'DRAFT',
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  PENDING_HEALTH_ASSESSMENT = 'PENDING_HEALTH_ASSESSMENT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

/**
 * Types of beneficiaries supported by the system with role-based access control
 */
export enum BeneficiaryType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE',
  DEPENDENT = 'DEPENDENT'
}

/**
 * Brazilian address structure with format validation
 */
export interface Address {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: BrazilianState;
  zipCode: string; // CEP format: 00000-000
}

/**
 * Guardian information for minors with LGPD compliance
 */
export interface Guardian {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  email: string;
  phone: string;
  address: Address;
  relationshipToMinor: string;
  relationship: string; // Alias for relationshipToMinor
  dateOfBirth: Date;
  authorizationDocument?: string;
  documents?: string[]; // Array of document URLs
}

/**
 * Beneficiary information structure with LGPD compliance
 */
export interface Beneficiary {
  id: string;
  type: BeneficiaryType;
  name: string;
  cpf: string; // Format: 000.000.000-00
  rg: string;
  dateOfBirth: Date;
  email: string;
  phone: string; // Format: +55 (00) 00000-0000
  address: Address;
  guardianId: string | null; // Required for minors
  healthData?: {
    questionnaire?: Questionnaire;
    riskLevel?: RiskLevel;
    medicalHistory?: any;
  };
}

/**
 * Document requirements with format and size validation
 */
export interface RequiredDocument {
  type: string;
  description: string;
  required: boolean;
  allowedFormats: string[]; // e.g., ['pdf', 'jpg', 'png']
  maxSize: number; // in bytes
}

/**
 * Main enrollment data structure with audit trail and LGPD compliance
 */
export interface Enrollment {
  id: string;
  beneficiary: Beneficiary;
  brokerId: string;
  status: EnrollmentStatus;
  questionnaire: Questionnaire;
  documents: Record<string, string>; // Document type to file URL mapping
  requiredDocuments: RequiredDocument[];
  riskLevel: RiskLevel;
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: string;
  auditLog: Array<{
    timestamp: Date;
    action: string;
    userId: string;
  }>;
}

/**
 * Summary view of enrollment for listings with essential information
 */
export interface EnrollmentSummary {
  id: string;
  beneficiaryName: string;
  cpf: string;
  status: EnrollmentStatus;
  createdAt: Date;
  riskLevel: RiskLevel;
  brokerId: string;
  hasCompletedDocuments: boolean;
  hasCompletedHealthAssessment: boolean;
}

/**
 * Document types supported by the system
 */
export type DocumentType =
  | 'RG'
  | 'CPF'
  | 'PROOF_OF_ADDRESS'
  | 'MEDICAL_RECORD'
  | 'INCOME_PROOF'
  | 'CORPORATE_REGISTRATION'
  | 'GUARDIAN_AUTHORIZATION';

/**
 * Enrollment filtering options for queries
 */
export type EnrollmentFilters = {
  status?: EnrollmentStatus;
  startDate?: Date;
  endDate?: Date;
  brokerId?: string;
  searchTerm?: string;
  riskLevel?: RiskLevel;
  documentStatus?: 'complete' | 'incomplete';
  healthAssessmentStatus?: 'complete' | 'incomplete';
  page?: number;
  pageSize?: number;
};

/**
 * Enrollment error type for error handling
 */
export interface EnrollmentError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Zod schema for Address validation
 */
export const addressSchema = z.object({
  street: z.string().min(1).max(100),
  number: z.string().min(1).max(10),
  complement: z.string().max(50),
  neighborhood: z.string().min(1).max(50),
  city: z.string().min(1).max(50),
  state: z.enum(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']),
  zipCode: z.string().regex(/^\d{5}-\d{3}$/)
});

/**
 * Zod schema for Beneficiary validation with Brazilian-specific formats
 */
export const beneficiarySchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(BeneficiaryType),
  name: z.string().min(1).max(100),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
  rg: z.string().min(1).max(20),
  dateOfBirth: z.date(),
  email: z.string().email(),
  phone: z.string().regex(/^\+55 \(\d{2}\) \d{5}-\d{4}$/),
  address: addressSchema,
  guardianId: z.string().uuid().nullable()
});

/**
 * Zod schema for RequiredDocument validation
 */
export const requiredDocumentSchema = z.object({
  type: z.string(),
  description: z.string(),
  required: z.boolean(),
  allowedFormats: z.array(z.string()),
  maxSize: z.number().positive()
});

/**
 * Zod schema for Enrollment validation
 */
export const enrollmentSchema = z.object({
  id: z.string().uuid(),
  beneficiary: beneficiarySchema,
  brokerId: z.string().uuid(),
  status: z.nativeEnum(EnrollmentStatus),
  questionnaire: z.any(), // Defined in health.types.ts
  documents: z.record(z.string().url()),
  requiredDocuments: z.array(requiredDocumentSchema),
  riskLevel: z.nativeEnum(RiskLevel),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastModifiedBy: z.string().uuid(),
  auditLog: z.array(z.object({
    timestamp: z.date(),
    action: z.string(),
    userId: z.string().uuid()
  }))
});

/**
 * Type guard to validate Enrollment object
 */
export const isValidEnrollment = (enrollment: unknown): enrollment is Enrollment => {
  return enrollmentSchema.safeParse(enrollment).success;
};

/**
 * Type guard to validate Beneficiary object
 */
export const isValidBeneficiary = (beneficiary: unknown): beneficiary is Beneficiary => {
  return beneficiarySchema.safeParse(beneficiary).success;
};