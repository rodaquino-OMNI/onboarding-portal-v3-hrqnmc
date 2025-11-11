/**
 * Health Assessment API Client Module
 * Version: 1.0.0
 * 
 * Implements secure API client for health assessment functionality with LGPD compliance,
 * comprehensive error handling, and audit logging.
 */

import axios from 'axios'; // ^1.5.0
import type {
  ApiResponse,
  ApiError,
  ApiRequestConfig
} from '../types/api.types';
import type {
  Question,
  QuestionResponse,
  RiskAssessment,
  Questionnaire
} from '../types/health.types';
import {
  RiskLevel,
  questionResponseSchema,
  riskAssessmentSchema
} from '../types/health.types';
import { apiConfig } from '../config/api.config';
import {
  createApiClient,
  handleApiError,
  createRequestConfig
} from '../utils/api.utils';
import { validateHealthData } from '../utils/validation.utils';

/**
 * API endpoints for health assessment operations
 */
const API_ENDPOINTS = {
  QUESTIONNAIRE: '/health-assessment/questionnaire',
  RESPONSE: '/health-assessment/response',
  COMPLETE: '/health-assessment/complete',
  RISK: '/health-assessment/risk'
} as const;

/**
 * Error messages for health assessment operations
 */
const ERROR_MESSAGES = {
  INVALID_BENEFICIARY: 'ID do beneficiário inválido',
  INVALID_RESPONSE: 'Formato de resposta inválido',
  QUESTIONNAIRE_NOT_FOUND: 'Questionário não encontrado',
  ASSESSMENT_NOT_READY: 'Avaliação de risco não disponível',
  VALIDATION_ERROR: 'Falha na validação dos dados',
  SECURITY_ERROR: 'Falha na verificação de segurança',
  ENCRYPTION_ERROR: 'Falha na criptografia dos dados',
  INTEGRITY_ERROR: 'Falha na verificação de integridade'
} as const;

/**
 * Security headers for LGPD compliance
 */
const SECURITY_HEADERS = {
  'X-LGPD-CONSENT': 'required',
  'X-CONTENT-SECURITY': 'strict',
  'X-DATA-ENCRYPTION': 'aes-256-gcm',
  'X-AUDIT-TRAIL': 'enabled'
} as const;

/**
 * Retrieves or initializes a health questionnaire for a beneficiary
 * @param beneficiaryId - Unique identifier of the beneficiary
 * @returns Promise with questionnaire data
 */
export async function getQuestionnaire(beneficiaryId: string): Promise<ApiResponse<Questionnaire>> {
  try {
    // Validate beneficiary ID
    if (!beneficiaryId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(beneficiaryId)) {
      throw new Error(ERROR_MESSAGES.INVALID_BENEFICIARY);
    }

    // Create API client with security headers
    const client = createApiClient({
      headers: {
        ...SECURITY_HEADERS,
        'X-Beneficiary-ID': beneficiaryId
      }
    });

    // Make request with retry and circuit breaker
    const response = await client.get<ApiResponse<Questionnaire>>(
      `${API_ENDPOINTS.QUESTIONNAIRE}/${beneficiaryId}`,
      createRequestConfig({
        timeout: apiConfig.timeout,
        validateStatus: (status) => status === 200
      })
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Submits a response to the current question with validation and audit logging
 * @param questionnaireId - Unique identifier of the questionnaire
 * @param response - Question response data
 * @returns Promise with next question data
 */
export async function submitQuestionResponse(
  questionnaireId: string,
  response: QuestionResponse
): Promise<ApiResponse<Question>> {
  try {
    // Validate response data
    const validationResult = questionResponseSchema.safeParse(response);
    if (!validationResult.success) {
      throw new Error(ERROR_MESSAGES.INVALID_RESPONSE);
    }

    // Sanitize and validate health data
    const sanitizedResponse = validateHealthData(response);
    if (!sanitizedResponse.isValid) {
      throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
    }

    // Create API client with enhanced security
    const client = createApiClient({
      headers: {
        ...SECURITY_HEADERS,
        'X-Questionnaire-ID': questionnaireId
      }
    });

    // Submit response with encryption
    const apiResponse = await client.post<ApiResponse<Question>>(
      `${API_ENDPOINTS.RESPONSE}/${questionnaireId}`,
      response,
      createRequestConfig({
        headers: {
          'X-Encryption-Version': '2',
          'X-Data-Sensitivity': 'high'
        }
      })
    );

    return apiResponse.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Marks a questionnaire as complete with final validation and security checks
 * @param questionnaireId - Unique identifier of the questionnaire
 * @returns Promise indicating completion status
 */
export async function completeQuestionnaire(questionnaireId: string): Promise<ApiResponse<void>> {
  try {
    // Create API client with completion-specific headers
    const client = createApiClient({
      headers: {
        ...SECURITY_HEADERS,
        'X-Completion-Request': 'true'
      }
    });

    // Submit completion request with integrity check
    const response = await client.post<ApiResponse<void>>(
      `${API_ENDPOINTS.COMPLETE}/${questionnaireId}`,
      {
        completedAt: new Date().toISOString(),
        securityChecksum: await generateSecurityChecksum(questionnaireId)
      },
      createRequestConfig({
        timeout: apiConfig.timeout * 2 // Extended timeout for completion
      })
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Retrieves risk assessment results with enhanced security measures
 * @param questionnaireId - Unique identifier of the questionnaire
 * @returns Promise with risk assessment data
 */
export async function getRiskAssessment(questionnaireId: string): Promise<ApiResponse<RiskAssessment>> {
  try {
    // Create API client with assessment-specific headers
    const client = createApiClient({
      headers: {
        ...SECURITY_HEADERS,
        'X-Assessment-Request': 'true'
      }
    });

    // Retrieve assessment with validation
    const response = await client.get<ApiResponse<RiskAssessment>>(
      `${API_ENDPOINTS.RISK}/${questionnaireId}`,
      createRequestConfig({
        validateStatus: (status) => status === 200,
        headers: {
          'X-Data-Classification': 'health-sensitive'
        }
      })
    );

    // Validate assessment data
    const validationResult = riskAssessmentSchema.safeParse(response.data);
    if (!validationResult.success) {
      throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
    }

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Generates security checksum for data integrity verification
 * @param data - Data to generate checksum for
 * @returns Security checksum string
 */
async function generateSecurityChecksum(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}