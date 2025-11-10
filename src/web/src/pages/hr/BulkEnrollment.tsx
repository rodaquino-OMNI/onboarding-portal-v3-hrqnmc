/**
 * Bulk Enrollment Page
 * Version: 1.0.0
 *
 * Bulk CSV upload for corporate enrollments with validation, preview, and progress tracking
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  Link
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DeleteIcon from '@mui/icons-material/Delete';

import FileUpload from '../../components/common/FileUpload';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

const STEPS = ['Upload CSV', 'Validação', 'Revisão', 'Processamento'];

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  cpf: string;
  dateOfBirth: string;
  department: string;
  position: string;
  salary: string;
  dependents?: string;
  errors?: string[];
  status: 'valid' | 'error' | 'processing' | 'success' | 'failed';
}

interface ProcessingResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

const BulkEnrollment: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useNotification();

  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);

  // CSV Template columns
  const csvTemplate = `nome,email,cpf,data_nascimento,departamento,cargo,salario,dependentes
João Silva,joao.silva@empresa.com,12345678901,1990-01-15,TI,Desenvolvedor,5000,0
Maria Santos,maria.santos@empresa.com,98765432109,1985-05-20,RH,Gerente,8000,2
`;

  // Handle download template
  const handleDownloadTemplate = useCallback(() => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template-cadastro-funcionarios.csv';
    link.click();
    showSuccess(t('hr.bulk.templateDownloaded'));
  }, [csvTemplate, showSuccess, t]);

  // Parse CSV file
  const parseCSV = useCallback((file: File): Promise<EmployeeRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim());

          const data = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim());
            return {
              id: `row-${index}`,
              name: values[0] || '',
              email: values[1] || '',
              cpf: values[2] || '',
              dateOfBirth: values[3] || '',
              department: values[4] || '',
              position: values[5] || '',
              salary: values[6] || '',
              dependents: values[7],
              errors: [],
              status: 'valid' as const
            };
          });

          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }, []);

  // Validate employee data
  const validateEmployee = useCallback((employee: EmployeeRow): string[] => {
    const errors: string[] = [];

    if (!employee.name) {
      errors.push(t('hr.bulk.errors.nameRequired'));
    }

    if (!employee.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
      errors.push(t('hr.bulk.errors.invalidEmail'));
    }

    if (!employee.cpf || !/^\d{11}$/.test(employee.cpf.replace(/\D/g, ''))) {
      errors.push(t('hr.bulk.errors.invalidCpf'));
    }

    if (!employee.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(employee.dateOfBirth)) {
      errors.push(t('hr.bulk.errors.invalidDate'));
    }

    if (!employee.department) {
      errors.push(t('hr.bulk.errors.departmentRequired'));
    }

    return errors;
  }, [t]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.csv')) {
      showError(t('hr.bulk.errors.invalidFileType'));
      return;
    }

    setUploadedFile(file);
    setIsValidating(true);

    try {
      const parsedData = await parseCSV(file);

      // Validate all rows
      const validatedData = parsedData.map(employee => {
        const errors = validateEmployee(employee);
        return {
          ...employee,
          errors,
          status: errors.length > 0 ? ('error' as const) : ('valid' as const)
        };
      });

      setEmployees(validatedData);

      const errorCount = validatedData.filter(e => e.status === 'error').length;
      if (errorCount > 0) {
        setValidationErrors([
          t('hr.bulk.validationWarning', { count: errorCount, total: validatedData.length })
        ]);
      }

      setActiveStep(1);
      showSuccess(t('hr.bulk.uploadSuccess'));
    } catch (error) {
      showError(t('hr.bulk.errors.parseError'));
      console.error('Error parsing CSV:', error);
    } finally {
      setIsValidating(false);
    }
  }, [parseCSV, validateEmployee, showError, showSuccess, t]);

  // Handle remove file
  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setEmployees([]);
    setValidationErrors([]);
    setActiveStep(0);
  }, []);

  // Handle continue to review
  const handleContinueToReview = useCallback(() => {
    const validEmployees = employees.filter(e => e.status === 'valid');
    if (validEmployees.length === 0) {
      showError(t('hr.bulk.noValidEmployees'));
      return;
    }
    setActiveStep(2);
  }, [employees, showError, t]);

  // Handle process enrollments
  const handleProcessEnrollments = useCallback(async () => {
    setActiveStep(3);
    setIsProcessing(true);
    setProcessingProgress(0);

    const validEmployees = employees.filter(e => e.status === 'valid');
    const result: ProcessingResult = {
      total: validEmployees.length,
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      // Process each employee
      for (let i = 0; i < validEmployees.length; i++) {
        // Simulated API call - replace with actual API service
        await new Promise(resolve => setTimeout(resolve, 500));

        const success = Math.random() > 0.1; // 90% success rate for simulation

        if (success) {
          result.success++;
          validEmployees[i].status = 'success';
        } else {
          result.failed++;
          validEmployees[i].status = 'failed';
          result.errors.push({
            row: i + 1,
            message: t('hr.bulk.errors.processingFailed')
          });
        }

        setProcessingProgress(((i + 1) / validEmployees.length) * 100);
        setEmployees([...employees]);
      }

      setProcessingResult(result);

      if (result.failed === 0) {
        showSuccess(t('hr.bulk.processingSuccess', { count: result.success }));
      } else {
        showInfo(t('hr.bulk.processingPartial', { success: result.success, failed: result.failed }));
      }
    } catch (error) {
      showError(t('hr.bulk.errors.processingError'));
      console.error('Error processing enrollments:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [employees, showError, showSuccess, showInfo, t]);

  // Handle download error report
  const handleDownloadErrorReport = useCallback(() => {
    if (!processingResult) return;

    const csv = [
      'Linha,Nome,Email,Erro',
      ...processingResult.errors.map(err => {
        const employee = employees[err.row - 1];
        return `${err.row},${employee.name},${employee.email},"${err.message}"`;
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `erros-processamento-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showSuccess(t('hr.bulk.errorReportDownloaded'));
  }, [processingResult, employees, showSuccess, t]);

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('hr.bulk.uploadTitle')}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {t('hr.bulk.uploadDescription')}
            </Typography>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
              sx={{ mb: 3 }}
            >
              {t('hr.bulk.downloadTemplate')}
            </Button>

            <FileUpload
              onUpload={handleFileUpload}
              acceptedFormats={['text/csv']}
              maxSizeMB={10}
              maxFiles={1}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('hr.bulk.validationTitle')}
            </Typography>

            {validationErrors.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {validationErrors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </Alert>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('hr.bulk.status')}</TableCell>
                    <TableCell>{t('hr.bulk.name')}</TableCell>
                    <TableCell>{t('hr.bulk.email')}</TableCell>
                    <TableCell>{t('hr.bulk.cpf')}</TableCell>
                    <TableCell>{t('hr.bulk.department')}</TableCell>
                    <TableCell>{t('hr.bulk.errors')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((employee, index) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        {employee.status === 'valid' ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                      </TableCell>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.cpf}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>
                        {employee.errors && employee.errors.length > 0 && (
                          <Box>
                            {employee.errors.map((error, i) => (
                              <Chip
                                key={i}
                                label={error}
                                size="small"
                                color="error"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button onClick={handleRemoveFile}>
                {t('hr.bulk.uploadDifferentFile')}
              </Button>
              <Button
                variant="contained"
                onClick={handleContinueToReview}
                disabled={employees.filter(e => e.status === 'valid').length === 0}
              >
                {t('hr.bulk.continueToReview')}
              </Button>
            </Box>
          </Box>
        );

      case 2:
        const validCount = employees.filter(e => e.status === 'valid').length;
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('hr.bulk.reviewTitle')}
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              {t('hr.bulk.reviewDescription', { count: validCount })}
            </Alert>

            <Card sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    {t('hr.bulk.totalRows')}
                  </Typography>
                  <Typography variant="h6">{employees.length}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    {t('hr.bulk.validRows')}
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {validCount}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="textSecondary">
                    {t('hr.bulk.invalidRows')}
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {employees.filter(e => e.status === 'error').length}
                  </Typography>
                </Grid>
              </Grid>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button onClick={() => setActiveStep(1)}>
                {t('common.back')}
              </Button>
              <Button
                variant="contained"
                onClick={handleProcessEnrollments}
                disabled={validCount === 0}
              >
                {t('hr.bulk.startProcessing')}
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('hr.bulk.processingTitle')}
            </Typography>

            {isProcessing ? (
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {t('hr.bulk.processingInProgress')}
                </Typography>
                <LinearProgress variant="determinate" value={processingProgress} />
                <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                  {Math.round(processingProgress)}%
                </Typography>
              </Box>
            ) : processingResult ? (
              <Box>
                <Alert
                  severity={processingResult.failed === 0 ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                >
                  {t('hr.bulk.processingComplete', {
                    success: processingResult.success,
                    failed: processingResult.failed
                  })}
                </Alert>

                {processingResult.failed > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadErrorReport}
                    sx={{ mb: 2 }}
                  >
                    {t('hr.bulk.downloadErrorReport')}
                  </Button>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/hr/employees')}
                  >
                    {t('hr.bulk.viewEmployees')}
                  </Button>
                </Box>
              </Box>
            ) : null}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('hr.bulk.title')}
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            {t('hr.bulk.description')}
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
      </Grid>
    </Box>
  );
};

export default BulkEnrollment;
