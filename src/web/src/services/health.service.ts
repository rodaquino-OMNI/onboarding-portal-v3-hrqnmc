/**
 * Health Assessment Service
 * Version: 1.0.0
 * 
 * Implements secure health assessment functionality with LGPD compliance,
 * performance monitoring, and comprehensive error handling.
 */

import { 
  getQuestionnaire, 
  submitQuestionResponse, 
  completeQuestionnaire,
  getRiskAssessment 
} from '../api/health.api';
import {
  Question,
  QuestionResponse,
  Questionnaire,
  RiskAssessment,
  RiskLevel,
  QuestionType,
  RiskFactor,
  questionResponseSchema,
  riskAssessmentSchema
} from '../types/health.types';
import { z } from 'zod'; // v3.22.0
import { retry } from 'axios-retry'; // v3.8.0
import CryptoJS from 'crypto-js'; // v4.1.1
import CircuitBreaker from 'circuit-breaker-js'; // v0.0.1
import winston from 'winston'; // v3.10.0

/**
 * Validation schemas for health assessment data
 */
const VALIDATION_SCHEMAS = {
  beneficiaryId: z.string().uuid(),
  questionnaireId: z.string().uuid(),
  questionResponse: questionResponseSchema,
  riskAssessment: riskAssessmentSchema
};

/**
 * Error messages in Brazilian Portuguese
 */
const ERROR_MESSAGES = {
  INVALID_BENEFICIARY: 'ID do beneficiário inválido',
  INVALID_RESPONSE: 'Formato de resposta inválido',
  ENCRYPTION_FAILED: 'Falha na criptografia dos dados',
  QUESTIONNAIRE_NOT_FOUND: 'Questionário não encontrado',
  ASSESSMENT_NOT_READY: 'Avaliação de risco não disponível'
};

/**
 * Security configuration for health data encryption
 */
const SECURITY_CONFIG = {
  ENCRYPTION_KEY: process.env.HEALTH_DATA_KEY || '',
  IV_LENGTH: 16,
  ALGORITHM: 'AES-256-GCM'
};

/**
 * Circuit breaker configuration for API calls
 */
const CIRCUIT_BREAKER_CONFIG = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

/**
 * Logger configuration for audit trail
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'health-service' },
  transports: [
    new winston.transports.File({ filename: 'health-service-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'health-service-audit.log' })
  ]
});

/**
 * Health Service class implementing secure health assessment operations
 */
export class HealthService {
  private readonly circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      ...CIRCUIT_BREAKER_CONFIG,
      onOpen: () => this.handleCircuitBreakerOpen(),
      onClose: () => this.handleCircuitBreakerClose()
    });
  }

  /**
   * Initializes or retrieves a health questionnaire for a beneficiary
   * @param beneficiaryId - Unique identifier of the beneficiary
   * @returns Promise with initialized questionnaire
   */
  public async initializeQuestionnaire(beneficiaryId: string): Promise<Questionnaire> {
    try {
      // Validate beneficiary ID
      const validationResult = VALIDATION_SCHEMAS.beneficiaryId.safeParse(beneficiaryId);
      if (!validationResult.success) {
        throw new Error(ERROR_MESSAGES.INVALID_BENEFICIARY);
      }

      // Execute request through circuit breaker
      const response = await this.circuitBreaker.execute(async () => {
        const result = await getQuestionnaire(beneficiaryId);
        return this.encryptHealthData(result.data);
      });

      // Log successful initialization
      logger.info('Questionnaire initialized', {
        beneficiaryId,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      logger.error('Failed to initialize questionnaire', {
        beneficiaryId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Submits a response to the current question with encryption
   * @param questionnaireId - Unique identifier of the questionnaire
   * @param response - Question response data
   * @returns Promise with next question
   */
  public async submitResponse(
    questionnaireId: string,
    response: QuestionResponse
  ): Promise<Question> {
    try {
      // Validate input data
      const validationResult = VALIDATION_SCHEMAS.questionResponse.safeParse(response);
      if (!validationResult.success) {
        throw new Error(ERROR_MESSAGES.INVALID_RESPONSE);
      }

      // Encrypt response data
      const encryptedResponse = this.encryptHealthData(response);

      // Submit through retry mechanism
      const result = await retry(
        async () => {
          const apiResponse = await submitQuestionResponse(questionnaireId, encryptedResponse);
          return apiResponse.data;
        },
        { retries: 3 }
      );

      // Log response submission
      logger.info('Question response submitted', {
        questionnaireId,
        questionId: response.questionId,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      logger.error('Failed to submit response', {
        questionnaireId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Finalizes the questionnaire and triggers risk assessment
   * @param questionnaireId - Unique identifier of the questionnaire
   * @returns Promise indicating completion status
   */
  public async finalizeQuestionnaire(questionnaireId: string): Promise<void> {
    try {
      // Validate questionnaire ID
      const validationResult = VALIDATION_SCHEMAS.questionnaireId.safeParse(questionnaireId);
      if (!validationResult.success) {
        throw new Error(ERROR_MESSAGES.QUESTIONNAIRE_NOT_FOUND);
      }

      await this.circuitBreaker.execute(() => completeQuestionnaire(questionnaireId));

      logger.info('Questionnaire finalized', {
        questionnaireId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to finalize questionnaire', {
        questionnaireId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Retrieves risk assessment results with decryption
   * @param questionnaireId - Unique identifier of the questionnaire
   * @returns Promise with risk assessment results
   */
  public async getRiskAssessmentResults(questionnaireId: string): Promise<RiskAssessment> {
    try {
      const response = await this.circuitBreaker.execute(() => getRiskAssessment(questionnaireId));
      const decryptedAssessment = this.decryptHealthData(response.data);

      // Validate decrypted assessment
      const validationResult = VALIDATION_SCHEMAS.riskAssessment.safeParse(decryptedAssessment);
      if (!validationResult.success) {
        throw new Error(ERROR_MESSAGES.ASSESSMENT_NOT_READY);
      }

      logger.info('Risk assessment retrieved', {
        questionnaireId,
        riskLevel: decryptedAssessment.riskLevel,
        timestamp: new Date().toISOString()
      });

      return decryptedAssessment;
    } catch (error) {
      logger.error('Failed to retrieve risk assessment', {
        questionnaireId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Encrypts sensitive health data using AES-256-GCM
   * @param data - Data to encrypt
   * @returns Encrypted data
   */
  private encryptHealthData<T>(data: T): T {
    try {
      const iv = CryptoJS.lib.WordArray.random(SECURITY_CONFIG.IV_LENGTH);
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        SECURITY_CONFIG.ENCRYPTION_KEY,
        {
          iv: iv,
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.Pkcs7
        }
      );

      return {
        ...data,
        encryptedData: encrypted.toString(),
        iv: iv.toString()
      } as T;
    } catch (error) {
      logger.error('Encryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw new Error(ERROR_MESSAGES.ENCRYPTION_FAILED);
    }
  }

  /**
   * Decrypts health data using AES-256-GCM
   * @param data - Encrypted data
   * @returns Decrypted data
   */
  private decryptHealthData<T>(data: T & { encryptedData: string; iv: string }): T {
    try {
      const decrypted = CryptoJS.AES.decrypt(
        data.encryptedData,
        SECURITY_CONFIG.ENCRYPTION_KEY,
        {
          iv: CryptoJS.enc.Hex.parse(data.iv),
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.Pkcs7
        }
      );

      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      logger.error('Decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw new Error(ERROR_MESSAGES.ENCRYPTION_FAILED);
    }
  }

  private handleCircuitBreakerOpen(): void {
    logger.warn('Circuit breaker opened', {
      timestamp: new Date().toISOString()
    });
  }

  private handleCircuitBreakerClose(): void {
    logger.info('Circuit breaker closed', {
      timestamp: new Date().toISOString()
    });
  }
}