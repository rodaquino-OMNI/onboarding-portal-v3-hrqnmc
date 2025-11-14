/**
 * Dependent Management Page
 * Version: 1.0.0
 *
 * Manage dependents including adding, guardian verification, health questionnaire, and documents
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  TextField,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Divider
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SaveIcon from '@mui/icons-material/Save';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import DatePicker from '../../components/common/DatePicker';
import FileUpload from '../../components/common/FileUpload';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

const STEPS = [
  'Dados do Dependente',
  'Verificação de Responsável',
  'Documentos',
  'Confirmação'
];

const RELATIONSHIP_TYPES = [
  'Filho(a)',
  'Enteado(a)',
  'Sobrinho(a)',
  'Neto(a)',
  'Outro'
] as const;

interface DependentFormData {
  name: string;
  cpf: string;
  dateOfBirth: Date | null;
  gender: string;
  relationship: typeof RELATIONSHIP_TYPES[number] | '';
  motherName: string;
  fatherName: string;
  guardianVerified: boolean;
  guardianDocument?: File;
  birthCertificate?: File;
  identityDocument?: File;
  addressProof?: File;
  consentConfirmed: boolean;
}

const DependentManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useNotification();

  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<DependentFormData>({
    name: '',
    cpf: '',
    dateOfBirth: null,
    gender: '',
    relationship: '',
    motherName: '',
    fatherName: '',
    guardianVerified: false,
    consentConfirmed: false
  });

  // Handle input change
  const handleInputChange = useCallback((field: keyof DependentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((field: keyof DependentFormData, files: File[]) => {
    if (files.length > 0) {
      handleInputChange(field, files[0]);
      showSuccess(t('guardian.dependentManagement.documentUploaded'));
    }
  }, [handleInputChange, showSuccess, t]);

  // Validate current step
  const validateStep = useCallback(() => {
    switch (activeStep) {
      case 0:
        if (!formData.name || !formData.cpf || !formData.dateOfBirth || !formData.relationship) {
          showError(t('guardian.dependentManagement.errors.requiredFields'));
          return false;
        }
        if (formData.cpf.replace(/\D/g, '').length !== 11) {
          showError(t('guardian.dependentManagement.errors.invalidCpf'));
          return false;
        }
        // Validate age < 18
        const age = new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear();
        if (age >= 18) {
          showError(t('guardian.dependentManagement.errors.dependentMustBeMinor'));
          return false;
        }
        return true;

      case 1:
        if (!formData.guardianVerified || !formData.guardianDocument) {
          showError(t('guardian.dependentManagement.errors.guardianVerificationRequired'));
          return false;
        }
        return true;

      case 2:
        if (!formData.birthCertificate || !formData.identityDocument || !formData.addressProof) {
          showError(t('guardian.dependentManagement.errors.documentsRequired'));
          return false;
        }
        return true;

      case 3:
        if (!formData.consentConfirmed) {
          showError(t('guardian.dependentManagement.errors.consentRequired'));
          return false;
        }
        return true;

      default:
        return true;
    }
  }, [activeStep, formData, showError, t]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (!validateStep()) return;
    setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  }, [validateStep]);

  // Handle back step
  const handleBack = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  }, []);

  // Handle guardian verification
  const handleGuardianVerification = useCallback(async () => {
    try {
      // Simulated verification process - replace with actual verification service
      await new Promise(resolve => setTimeout(resolve, 2000));
      handleInputChange('guardianVerified', true);
      showSuccess(t('guardian.dependentManagement.guardianVerified'));
    } catch (error) {
      showError(t('guardian.dependentManagement.errors.guardianVerificationFailed'));
      console.error('Guardian verification error:', error);
    }
  }, [handleInputChange, showSuccess, showError, t]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    try {
      // Simulated API call - replace with actual API service
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSuccess(t('guardian.dependentManagement.submitSuccess'));
      navigate('/guardian/dashboard');
    } catch (error) {
      showError(t('guardian.dependentManagement.errors.submitError'));
      console.error('Error submitting dependent:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, formData, navigate, showSuccess, showError, t]);

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info">
                {t('guardian.dependentManagement.dependentInfoAlert')}
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('guardian.dependentManagement.name')}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('guardian.dependentManagement.cpf')}
                value={formData.cpf}
                onChange={(e) =>
                  handleInputChange('cpf', e.target.value.replace(/\D/g, ''))
                }
                inputProps={{ maxLength: 11 }}
                helperText={t('guardian.dependentManagement.cpfHelper')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label={t('guardian.dependentManagement.dateOfBirth')}
                value={formData.dateOfBirth}
                onChange={(date) => handleInputChange('dateOfBirth', date)}
                maxDate={new Date()}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>{t('guardian.dependentManagement.gender')}</InputLabel>
                <Select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  label={t('guardian.dependentManagement.gender')}
                >
                  <MenuItem value="M">{t('common.male')}</MenuItem>
                  <MenuItem value="F">{t('common.female')}</MenuItem>
                  <MenuItem value="O">{t('common.other')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>{t('guardian.dependentManagement.relationship')}</InputLabel>
                <Select
                  value={formData.relationship}
                  onChange={(e) => handleInputChange('relationship', e.target.value)}
                  label={t('guardian.dependentManagement.relationship')}
                >
                  {RELATIONSHIP_TYPES.map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('guardian.dependentManagement.motherName')}
                value={formData.motherName}
                onChange={(e) => handleInputChange('motherName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('guardian.dependentManagement.fatherName')}
                value={formData.fatherName}
                onChange={(e) => handleInputChange('fatherName', e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="warning">
                {t('guardian.dependentManagement.guardianVerificationAlert')}
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('guardian.dependentManagement.guardianVerificationTitle')}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                {t('guardian.dependentManagement.guardianVerificationDescription')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FileUpload
                onUpload={(files) => handleFileUpload('guardianDocument', files)}
                acceptedFormats={['application/pdf', 'image/jpeg', 'image/png']}
                maxSizeMB={10}
                maxFiles={1}
                label={t('guardian.dependentManagement.uploadGuardianDocument')}
              />
            </Grid>
            {formData.guardianDocument && !formData.guardianVerified && (
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleGuardianVerification}
                >
                  {t('guardian.dependentManagement.verifyGuardian')}
                </Button>
              </Grid>
            )}
            {formData.guardianVerified && (
              <Grid item xs={12}>
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  {t('guardian.dependentManagement.guardianVerifiedSuccess')}
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info">
                {t('guardian.dependentManagement.documentsAlert')}
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('guardian.dependentManagement.birthCertificate')}
              </Typography>
              <FileUpload
                onUpload={(files) => handleFileUpload('birthCertificate', files)}
                acceptedFormats={['application/pdf', 'image/jpeg', 'image/png']}
                maxSizeMB={10}
                maxFiles={1}
              />
              {formData.birthCertificate && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  {t('guardian.dependentManagement.documentUploaded')}:{' '}
                  {formData.birthCertificate.name}
                </Alert>
              )}
            </Grid>
            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('guardian.dependentManagement.identityDocument')}
              </Typography>
              <FileUpload
                onUpload={(files) => handleFileUpload('identityDocument', files)}
                acceptedFormats={['application/pdf', 'image/jpeg', 'image/png']}
                maxSizeMB={10}
                maxFiles={1}
              />
              {formData.identityDocument && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  {t('guardian.dependentManagement.documentUploaded')}:{' '}
                  {formData.identityDocument.name}
                </Alert>
              )}
            </Grid>
            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('guardian.dependentManagement.addressProof')}
              </Typography>
              <FileUpload
                onUpload={(files) => handleFileUpload('addressProof', files)}
                acceptedFormats={['application/pdf', 'image/jpeg', 'image/png']}
                maxSizeMB={10}
                maxFiles={1}
              />
              {formData.addressProof && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  {t('guardian.dependentManagement.documentUploaded')}:{' '}
                  {formData.addressProof.name}
                </Alert>
              )}
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('guardian.dependentManagement.reviewTitle')}
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('guardian.dependentManagement.reviewAlert')}
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('guardian.dependentManagement.dependentInformation')}
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      {t('guardian.dependentManagement.name')}:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="bold">
                      {formData.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      {t('guardian.dependentManagement.cpf')}:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="bold">
                      {formData.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      {t('guardian.dependentManagement.dateOfBirth')}:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="bold">
                      {formData.dateOfBirth?.toLocaleDateString('pt-BR')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      {t('guardian.dependentManagement.relationship')}:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="bold">
                      {formData.relationship}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {t('guardian.dependentManagement.uploadedDocuments')}
                </Typography>
                <ul>
                  <li>
                    <Typography variant="body2">
                      {t('guardian.dependentManagement.guardianDocument')}:{' '}
                      {formData.guardianDocument?.name}
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      {t('guardian.dependentManagement.birthCertificate')}:{' '}
                      {formData.birthCertificate?.name}
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      {t('guardian.dependentManagement.identityDocument')}:{' '}
                      {formData.identityDocument?.name}
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      {t('guardian.dependentManagement.addressProof')}:{' '}
                      {formData.addressProof?.name}
                    </Typography>
                  </li>
                </ul>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.consentConfirmed}
                    onChange={(e) => handleInputChange('consentConfirmed', e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    {t('guardian.dependentManagement.consentText')}
                  </Typography>
                }
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, margin: '0 auto' }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Typography variant="h4" component="h1" gutterBottom>
            <PersonAddIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {t('guardian.dependentManagement.title')}
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            {t('guardian.dependentManagement.description')}
          </Typography>
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

        {/* Content */}
        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            {renderStepContent()}
          </Card>
        </Grid>

        {/* Navigation Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<NavigateBeforeIcon />}
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              {t('common.back')}
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeStep === STEPS.length - 1 ? (
                <Button
                  variant="contained"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.consentConfirmed}
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

export default DependentManagement;
