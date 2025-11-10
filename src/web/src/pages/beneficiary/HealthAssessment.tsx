/**
 * Health Assessment Page
 * Version: 1.0.0
 *
 * Dynamic health questionnaire with multi-step flow, document upload, and AI-powered follow-up questions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Checkbox,
  FormGroup,
  LinearProgress,
  Alert,
  Chip,
  Grid,
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SaveIcon from '@mui/icons-material/Save';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { useAuth } from '../../hooks/useAuth';
import { useHealth } from '../../hooks/useHealth';
import { useNotification } from '../../hooks/useNotification';
import FileUpload from '../../components/common/FileUpload';

// Question types
type QuestionType = 'yes_no' | 'multiple_choice' | 'text' | 'multiple_select';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[];
  triggersUpload?: boolean;
  followUpQuestionId?: string;
  category: string;
}

interface Answer {
  questionId: string;
  value: string | string[];
  documents?: File[];
}

// Sample questions - in production, these would come from the health service
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    type: 'yes_no',
    text: 'Você possui alguma condição médica pré-existente?',
    required: true,
    category: 'pre_existing'
  },
  {
    id: 'q2',
    type: 'yes_no',
    text: 'Você faz uso contínuo de medicamentos?',
    required: true,
    category: 'medications',
    triggersUpload: true
  },
  {
    id: 'q3',
    type: 'multiple_select',
    text: 'Você possui ou já teve alguma das seguintes condições?',
    required: true,
    options: [
      'Diabetes',
      'Hipertensão',
      'Problemas cardíacos',
      'Problemas respiratórios',
      'Câncer',
      'Doenças autoimunes',
      'Nenhuma das anteriores'
    ],
    category: 'conditions',
    triggersUpload: true
  },
  {
    id: 'q4',
    type: 'yes_no',
    text: 'Você realizou alguma cirurgia nos últimos 5 anos?',
    required: true,
    category: 'surgeries',
    triggersUpload: true
  },
  {
    id: 'q5',
    type: 'yes_no',
    text: 'Você pratica atividades físicas regularmente?',
    required: true,
    category: 'lifestyle'
  },
  {
    id: 'q6',
    type: 'yes_no',
    text: 'Você é fumante ou já foi fumante?',
    required: true,
    category: 'lifestyle'
  }
];

const STEPS = ['Dados Pessoais', 'Condições de Saúde', 'Medicamentos', 'Histórico', 'Documentos', 'Revisão'];

const HealthAssessment: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useNotification();

  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(SAMPLE_QUESTIONS);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiresGuardian, setRequiresGuardian] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);

  // Calculate progress
  const progress = (answers.size / questions.length) * 100;

  // Check if user is minor
  useEffect(() => {
    if (user?.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
      setRequiresGuardian(age < 18);
    }
  }, [user]);

  // Load questions for current step
  useEffect(() => {
    const startIdx = activeStep * 2;
    const endIdx = startIdx + 2;
    setCurrentQuestions(questions.slice(startIdx, endIdx));
  }, [activeStep, questions]);

  // Handle answer change
  const handleAnswerChange = useCallback((questionId: string, value: string | string[]) => {
    setAnswers(prev => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionId, { questionId, value });
      return newAnswers;
    });

    // Check if answer triggers AI follow-up
    const question = questions.find(q => q.id === questionId);
    if (question && value === 'yes' && question.followUpQuestionId) {
      showInfo(t('health.assessment.aiFollowUp'));
      // In production, fetch AI-generated follow-up questions
    }
  }, [questions, showInfo, t]);

  // Handle document upload
  const handleDocumentUpload = useCallback((files: File[]) => {
    setUploadedDocuments(prev => [...prev, ...files]);
    showSuccess(t('health.assessment.documentUploaded'));
  }, [showSuccess, t]);

  // Handle save draft
  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      // Simulated API call - replace with actual API service
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccess(t('health.assessment.draftSaved'));
    } catch (error) {
      showError(t('health.assessment.saveDraftError'));
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [answers, showSuccess, showError, t]);

  // Handle next step
  const handleNext = useCallback(() => {
    // Validate current step answers
    const allAnswered = currentQuestions.every(q => {
      if (!q.required) return true;
      const answer = answers.get(q.id);
      return answer && answer.value !== '';
    });

    if (!allAnswered) {
      showError(t('health.assessment.completeRequired'));
      return;
    }

    setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  }, [currentQuestions, answers, showError, t]);

  // Handle back step
  const handleBack = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (requiresGuardian) {
      showError(t('health.assessment.guardianRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulated API call - replace with actual API service
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSuccess(t('health.assessment.submitSuccess'));
      navigate('/beneficiary/dashboard');
    } catch (error) {
      showError(t('health.assessment.submitError'));
      console.error('Error submitting assessment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [requiresGuardian, answers, uploadedDocuments, navigate, showSuccess, showError, t]);

  // Render question based on type
  const renderQuestion = useCallback((question: Question) => {
    const answer = answers.get(question.id);

    switch (question.type) {
      case 'yes_no':
        return (
          <RadioGroup
            value={answer?.value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          >
            <FormControlLabel value="yes" control={<Radio />} label={t('common.yes')} />
            <FormControlLabel value="no" control={<Radio />} label={t('common.no')} />
          </RadioGroup>
        );

      case 'multiple_choice':
        return (
          <RadioGroup
            value={answer?.value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          >
            {question.options?.map(option => (
              <FormControlLabel
                key={option}
                value={option}
                control={<Radio />}
                label={option}
              />
            ))}
          </RadioGroup>
        );

      case 'multiple_select':
        return (
          <FormGroup>
            {question.options?.map(option => (
              <FormControlLabel
                key={option}
                control={
                  <Checkbox
                    checked={(answer?.value as string[] || []).includes(option)}
                    onChange={(e) => {
                      const currentValues = (answer?.value as string[]) || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter(v => v !== option);
                      handleAnswerChange(question.id, newValues);
                    }}
                  />
                }
                label={option}
              />
            ))}
          </FormGroup>
        );

      case 'text':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            value={answer?.value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={t('health.assessment.textPlaceholder')}
          />
        );

      default:
        return null;
    }
  }, [answers, handleAnswerChange, t]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('health.assessment.title')}
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            {t('health.assessment.description')}
          </Typography>
          {requiresGuardian && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('health.assessment.guardianNotice')}
            </Alert>
          )}
        </Grid>

        {/* Progress Bar */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="textSecondary">
                {t('health.assessment.progress')}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} />
          </Paper>
        </Grid>

        {/* Stepper */}
        <Grid item xs={12}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Grid>

        {/* Questions */}
        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            {currentQuestions.map((question, index) => (
              <Box key={question.id} sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  {index + 1}. {question.text}
                  {question.required && (
                    <Chip label={t('common.required')} size="small" color="error" sx={{ ml: 1 }} />
                  )}
                </Typography>
                {renderQuestion(question)}

                {/* Document upload for flagged conditions */}
                {question.triggersUpload && answers.get(question.id)?.value === 'yes' && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {t('health.assessment.documentRequired')}
                    </Alert>
                    <FileUpload
                      onUpload={handleDocumentUpload}
                      acceptedFormats={['application/pdf', 'image/jpeg', 'image/png']}
                      maxSizeMB={10}
                      maxFiles={5}
                    />
                  </Box>
                )}
              </Box>
            ))}
          </Card>
        </Grid>

        {/* Navigation Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Button
                variant="outlined"
                startIcon={<NavigateBeforeIcon />}
                onClick={handleBack}
                disabled={activeStep === 0}
              >
                {t('common.back')}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? t('common.saving') : t('common.saveDraft')}
              </Button>
              {activeStep === STEPS.length - 1 ? (
                <Button
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('common.submitting') : t('common.submit')}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  endIcon={<NavigateNextIcon />}
                  onClick={handleNext}
                >
                  {t('common.next')}
                </Button>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HealthAssessment;
