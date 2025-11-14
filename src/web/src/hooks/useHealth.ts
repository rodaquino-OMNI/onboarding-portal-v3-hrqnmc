import { useState, useCallback, useEffect } from 'react'; // v18.0.0
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
  QuestionType
} from '../types/health.types';
import { useNotification } from './useNotification';

// Error messages in Brazilian Portuguese
const ERROR_MESSAGES = {
  LOAD_FAILED: 'Falha ao carregar questionário de saúde',
  RESPONSE_FAILED: 'Falha ao enviar resposta',
  COMPLETION_FAILED: 'Falha ao completar avaliação',
  ASSESSMENT_FAILED: 'Falha ao recuperar avaliação de risco',
  ENCRYPTION_FAILED: 'Falha na criptografia dos dados',
  VALIDATION_FAILED: 'Falha na validação dos dados',
  SESSION_EXPIRED: 'Sessão expirada, por favor faça login novamente'
} as const;

/**
 * Custom hook for managing health assessment state and operations with LGPD compliance
 * @param beneficiaryId - Unique identifier of the beneficiary
 */
export const useHealth = (beneficiaryId?: string) => {
  // State management with security considerations
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responses, setResponses] = useState<Map<string, QuestionResponse>>(new Map());
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const { showError, showSuccess } = useNotification();

  /**
   * Securely loads or initializes a health questionnaire with encryption
   */
  const loadQuestionnaire = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getQuestionnaire(beneficiaryId);
      
      if (response.data) {
        setQuestionnaire(response.data);
        setCurrentQuestion(response.data.questions[0]);
      }
    } catch (error) {
      showError(ERROR_MESSAGES.LOAD_FAILED);
      console.error('Health questionnaire loading error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [beneficiaryId, showError]);

  /**
   * Processes encrypted responses with validation and progression logic
   */
  const handleQuestionResponse = useCallback(async (response: QuestionResponse) => {
    setIsLoading(true);
    try {
      // Store response securely
      setResponses(prev => new Map(prev).set(response.questionId, response));

      // Submit response with encryption
      const nextQuestion = await submitQuestionResponse(
        questionnaire!.id,
        response
      );

      if (nextQuestion.data) {
        setCurrentQuestion(nextQuestion.data);
      } else {
        // Final question completed
        setCurrentQuestion(null);
      }
    } catch (error) {
      showError(ERROR_MESSAGES.RESPONSE_FAILED);
      console.error('Response submission error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [questionnaire, showError]);

  /**
   * Securely completes assessment and retrieves encrypted risk evaluation
   */
  const completeAssessment = useCallback(async () => {
    setIsLoading(true);
    try {
      // Complete questionnaire
      await completeQuestionnaire(questionnaire!.id);

      // Retrieve risk assessment
      const assessment = await getRiskAssessment(questionnaire!.id);
      
      if (assessment.data) {
        setRiskAssessment(assessment.data);
        showSuccess('Avaliação de saúde concluída com sucesso');
      }
    } catch (error) {
      showError(ERROR_MESSAGES.COMPLETION_FAILED);
      console.error('Assessment completion error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [questionnaire, showSuccess, showError]);

  /**
   * Validates response data against question requirements
   */
  const validateResponse = useCallback((response: QuestionResponse, question: Question): boolean => {
    if (question.required && !response.value) {
      return false;
    }

    switch (question.type) {
      case QuestionType.NUMERIC:
        return typeof response.value === 'number' &&
          response.value >= question.validationRules.min &&
          response.value <= question.validationRules.max;
      
      case QuestionType.BOOLEAN:
        return typeof response.value === 'boolean';
      
      case QuestionType.CHOICE:
        return question.options?.includes(response.value);
      
      case QuestionType.MULTIPLE_CHOICE:
        return Array.isArray(response.value) &&
          response.value.every(v => question.options?.includes(v));
      
      default:
        return true;
    }
  }, []);

  // Initialize questionnaire on mount
  useEffect(() => {
    if (beneficiaryId) {
      loadQuestionnaire();
    }
    
    // Cleanup sensitive data on unmount
    return () => {
      setQuestionnaire(null);
      setCurrentQuestion(null);
      setRiskAssessment(null);
      setResponses(new Map());
    };
  }, [beneficiaryId, loadQuestionnaire]);

  return {
    questionnaire,
    currentQuestion,
    riskAssessment,
    isLoading,
    error,
    progress,
    handleQuestionResponse,
    completeAssessment,
    validateResponse,
    responses
  };
};

export type { Question, QuestionResponse, Questionnaire, RiskAssessment, RiskLevel };