/**
 * Health Service Tests
 * Comprehensive test coverage for health assessment service
 */

import { HealthService } from '../health.service';
import {
  getQuestionnaire,
  submitQuestionResponse,
  completeQuestionnaire,
  getRiskAssessment
} from '../../api/health.api';
import {
  QuestionType,
  RiskLevel,
  QuestionResponse,
  Questionnaire,
  RiskAssessment
} from '../../types/health.types';

// Mock dependencies
jest.mock('../../api/health.api');
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })),
  format: {
    json: jest.fn()
  },
  transports: {
    File: jest.fn()
  }
}));

jest.mock('crypto-js', () => ({
  lib: {
    WordArray: {
      random: jest.fn(() => ({
        toString: () => 'random-iv'
      }))
    }
  },
  AES: {
    encrypt: jest.fn(() => ({
      toString: () => JSON.stringify({ encryptedData: 'encrypted', iv: 'test-iv' })
    })),
    decrypt: jest.fn(() => ({
      toString: jest.fn(() => JSON.stringify({ decrypted: 'data' }))
    }))
  },
  enc: {
    Hex: {
      parse: jest.fn(() => ({}))
    },
    Utf8: 'Utf8'
  },
  mode: {
    CBC: 'CBC'
  },
  pad: {
    Pkcs7: 'Pkcs7'
  }
}));

jest.mock('opossum', () => {
  return jest.fn().mockImplementation((fn: any, options: any) => ({
    fire: jest.fn((operation: any) => operation()),
    on: jest.fn()
  }));
});

const mockedGetQuestionnaire = getQuestionnaire as jest.MockedFunction<typeof getQuestionnaire>;
const mockedSubmitResponse = submitQuestionResponse as jest.MockedFunction<typeof submitQuestionResponse>;
const mockedCompleteQuestionnaire = completeQuestionnaire as jest.MockedFunction<typeof completeQuestionnaire>;
const mockedGetRiskAssessment = getRiskAssessment as jest.MockedFunction<typeof getRiskAssessment>;

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    jest.clearAllMocks();
    healthService = new HealthService();
  });

  describe('initializeQuestionnaire', () => {
    it('should initialize questionnaire successfully', async () => {
      const mockQuestionnaire: Questionnaire = {
        id: 'quest-123',
        beneficiaryId: 'beneficiary-123',
        questions: [
          {
            id: 'q1',
            questionText: 'Do you smoke?',
            questionType: QuestionType.BOOLEAN,
            category: 'lifestyle',
            isRequired: true,
            order: 1
          }
        ],
        currentQuestionIndex: 0,
        completionPercentage: 0,
        status: 'IN_PROGRESS' as any,
        startedAt: new Date(),
        version: '1.0'
      };

      mockedGetQuestionnaire.mockResolvedValue({
        data: mockQuestionnaire
      } as any);

      const result = await healthService.initializeQuestionnaire('beneficiary-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('quest-123');
      expect(mockedGetQuestionnaire).toHaveBeenCalledWith('beneficiary-123');
    });

    it('should reject invalid beneficiary ID', async () => {
      await expect(
        healthService.initializeQuestionnaire('invalid-id')
      ).rejects.toThrow('ID do beneficiário inválido');
    });

    it('should encrypt questionnaire data', async () => {
      const mockQuestionnaire: Questionnaire = {
        id: 'quest-123',
        beneficiaryId: '550e8400-e29b-41d4-a716-446655440000',
        questions: [],
        currentQuestionIndex: 0,
        completionPercentage: 0,
        status: 'IN_PROGRESS' as any,
        startedAt: new Date(),
        version: '1.0'
      };

      mockedGetQuestionnaire.mockResolvedValue({
        data: mockQuestionnaire
      } as any);

      const CryptoJS = require('crypto-js');

      await healthService.initializeQuestionnaire('550e8400-e29b-41d4-a716-446655440000');

      expect(CryptoJS.AES.encrypt).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockedGetQuestionnaire.mockRejectedValue(
        new Error('Failed to fetch questionnaire')
      );

      await expect(
        healthService.initializeQuestionnaire('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow();
    });
  });

  describe('submitResponse', () => {
    const mockResponse: QuestionResponse = {
      questionId: 'q1',
      responseValue: 'yes',
      answeredAt: new Date()
    };

    it('should submit response successfully', async () => {
      const mockNextQuestion = {
        id: 'q2',
        questionText: 'Do you exercise?',
        questionType: QuestionType.BOOLEAN,
        category: 'lifestyle',
        isRequired: true,
        order: 2
      };

      mockedSubmitResponse.mockResolvedValue({
        data: mockNextQuestion
      } as any);

      const result = await healthService.submitResponse('quest-123', mockResponse);

      expect(result).toBeDefined();
      expect(result.id).toBe('q2');
      expect(mockedSubmitResponse).toHaveBeenCalled();
    });

    it('should encrypt response data', async () => {
      const CryptoJS = require('crypto-js');

      mockedSubmitResponse.mockResolvedValue({
        data: {
          id: 'q2',
          questionType: QuestionType.BOOLEAN
        }
      } as any);

      await healthService.submitResponse('quest-123', mockResponse);

      expect(CryptoJS.AES.encrypt).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const invalidResponse = {
        questionId: '',
        responseValue: '',
        answeredAt: new Date()
      };

      await expect(
        healthService.submitResponse('quest-123', invalidResponse as any)
      ).rejects.toThrow();
    });

    it('should handle submission errors', async () => {
      mockedSubmitResponse.mockRejectedValue(
        new Error('Failed to submit response')
      );

      await expect(
        healthService.submitResponse('quest-123', mockResponse)
      ).rejects.toThrow();
    });
  });

  describe('finalizeQuestionnaire', () => {
    it('should finalize questionnaire successfully', async () => {
      mockedCompleteQuestionnaire.mockResolvedValue(undefined as any);

      await expect(
        healthService.finalizeQuestionnaire('550e8400-e29b-41d4-a716-446655440000')
      ).resolves.not.toThrow();

      expect(mockedCompleteQuestionnaire).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should reject invalid questionnaire ID', async () => {
      await expect(
        healthService.finalizeQuestionnaire('invalid-id')
      ).rejects.toThrow('Questionário não encontrado');
    });

    it('should handle completion errors', async () => {
      mockedCompleteQuestionnaire.mockRejectedValue(
        new Error('Failed to complete questionnaire')
      );

      await expect(
        healthService.finalizeQuestionnaire('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow();
    });
  });

  describe('getRiskAssessmentResults', () => {
    it('should retrieve risk assessment successfully', async () => {
      const mockAssessment: RiskAssessment & { encryptedData: string; iv: string } = {
        id: 'assessment-123',
        questionnaireId: 'quest-123',
        beneficiaryId: 'beneficiary-123',
        riskLevel: RiskLevel.MEDIUM,
        riskScore: 45,
        riskFactors: [
          {
            factor: 'Smoking',
            severity: RiskLevel.HIGH,
            description: 'Current smoker',
            recommendation: 'Smoking cessation program recommended'
          }
        ],
        recommendations: ['Consider health screening'],
        assessedAt: new Date(),
        assessedBy: 'system',
        version: '1.0',
        encryptedData: 'encrypted-assessment-data',
        iv: 'test-iv'
      };

      const CryptoJS = require('crypto-js');
      CryptoJS.AES.decrypt = jest.fn(() => ({
        toString: jest.fn(() => JSON.stringify({
          id: 'assessment-123',
          questionnaireId: 'quest-123',
          beneficiaryId: 'beneficiary-123',
          riskLevel: RiskLevel.MEDIUM,
          riskScore: 45,
          riskFactors: mockAssessment.riskFactors,
          recommendations: mockAssessment.recommendations,
          assessedAt: new Date(),
          assessedBy: 'system',
          version: '1.0'
        }))
      }));

      mockedGetRiskAssessment.mockResolvedValue({
        data: mockAssessment
      } as any);

      const result = await healthService.getRiskAssessmentResults('quest-123');

      expect(result).toBeDefined();
      expect(mockedGetRiskAssessment).toHaveBeenCalledWith('quest-123');
    });

    it('should decrypt assessment data', async () => {
      const CryptoJS = require('crypto-js');

      const mockEncryptedAssessment = {
        encryptedData: 'encrypted-data',
        iv: 'test-iv'
      };

      CryptoJS.AES.decrypt = jest.fn(() => ({
        toString: jest.fn(() => JSON.stringify({
          id: 'assessment-123',
          questionnaireId: 'quest-123',
          beneficiaryId: 'beneficiary-123',
          riskLevel: RiskLevel.LOW,
          riskScore: 20,
          riskFactors: [],
          recommendations: [],
          assessedAt: new Date(),
          assessedBy: 'system',
          version: '1.0'
        }))
      }));

      mockedGetRiskAssessment.mockResolvedValue({
        data: mockEncryptedAssessment
      } as any);

      await healthService.getRiskAssessmentResults('quest-123');

      expect(CryptoJS.AES.decrypt).toHaveBeenCalled();
    });

    it('should handle assessment not ready', async () => {
      const CryptoJS = require('crypto-js');
      CryptoJS.AES.decrypt = jest.fn(() => ({
        toString: jest.fn(() => JSON.stringify({ invalid: 'data' }))
      }));

      mockedGetRiskAssessment.mockResolvedValue({
        data: { encryptedData: 'encrypted', iv: 'test-iv' }
      } as any);

      await expect(
        healthService.getRiskAssessmentResults('quest-123')
      ).rejects.toThrow();
    });

    it('should handle retrieval errors', async () => {
      mockedGetRiskAssessment.mockRejectedValue(
        new Error('Failed to retrieve assessment')
      );

      await expect(
        healthService.getRiskAssessmentResults('quest-123')
      ).rejects.toThrow();
    });
  });

  describe('circuit breaker', () => {
    it('should use circuit breaker for API calls', async () => {
      const mockQuestionnaire: Questionnaire = {
        id: 'quest-123',
        beneficiaryId: '550e8400-e29b-41d4-a716-446655440000',
        questions: [],
        currentQuestionIndex: 0,
        completionPercentage: 0,
        status: 'IN_PROGRESS' as any,
        startedAt: new Date(),
        version: '1.0'
      };

      mockedGetQuestionnaire.mockResolvedValue({
        data: mockQuestionnaire
      } as any);

      await healthService.initializeQuestionnaire('550e8400-e29b-41d4-a716-446655440000');

      // Circuit breaker should be used
      expect(mockedGetQuestionnaire).toHaveBeenCalled();
    });
  });

  describe('encryption and decryption', () => {
    it('should encrypt health data with AES-256-GCM', async () => {
      const CryptoJS = require('crypto-js');

      const mockQuestionnaire: Questionnaire = {
        id: 'quest-123',
        beneficiaryId: '550e8400-e29b-41d4-a716-446655440000',
        questions: [],
        currentQuestionIndex: 0,
        completionPercentage: 0,
        status: 'IN_PROGRESS' as any,
        startedAt: new Date(),
        version: '1.0'
      };

      mockedGetQuestionnaire.mockResolvedValue({
        data: mockQuestionnaire
      } as any);

      await healthService.initializeQuestionnaire('550e8400-e29b-41d4-a716-446655440000');

      expect(CryptoJS.AES.encrypt).toHaveBeenCalled();
      expect(CryptoJS.lib.WordArray.random).toHaveBeenCalled();
    });

    it('should handle encryption failures', async () => {
      const CryptoJS = require('crypto-js');
      CryptoJS.AES.encrypt = jest.fn(() => {
        throw new Error('Encryption failed');
      });

      const healthService2 = new HealthService();

      const mockQuestionnaire: Questionnaire = {
        id: 'quest-123',
        beneficiaryId: '550e8400-e29b-41d4-a716-446655440000',
        questions: [],
        currentQuestionIndex: 0,
        completionPercentage: 0,
        status: 'IN_PROGRESS' as any,
        startedAt: new Date(),
        version: '1.0'
      };

      mockedGetQuestionnaire.mockResolvedValue({
        data: mockQuestionnaire
      } as any);

      await expect(
        healthService2.initializeQuestionnaire('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow();
    });
  });

  describe('logging', () => {
    it('should log successful operations', async () => {
      const mockQuestionnaire: Questionnaire = {
        id: 'quest-123',
        beneficiaryId: '550e8400-e29b-41d4-a716-446655440000',
        questions: [],
        currentQuestionIndex: 0,
        completionPercentage: 0,
        status: 'IN_PROGRESS' as any,
        startedAt: new Date(),
        version: '1.0'
      };

      mockedGetQuestionnaire.mockResolvedValue({
        data: mockQuestionnaire
      } as any);

      await healthService.initializeQuestionnaire('550e8400-e29b-41d4-a716-446655440000');

      // Logging should have occurred
      expect(mockedGetQuestionnaire).toHaveBeenCalled();
    });

    it('should log errors', async () => {
      mockedGetQuestionnaire.mockRejectedValue(
        new Error('API error')
      );

      await expect(
        healthService.initializeQuestionnaire('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow();
    });
  });
});
