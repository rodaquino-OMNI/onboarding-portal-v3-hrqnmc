/**
 * Policy Management Page
 * Version: 1.0.0
 *
 * Policy review and approval with coverage adjustments, waiting periods, and risk assessment
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  Alert,
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';

import DataTable from '../../components/common/DataTable';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { usePolicy } from '../../hooks/usePolicy';

// Policy status types
const POLICY_STATUS = [
  'PENDING_REVIEW',
  'UNDER_ANALYSIS',
  'APPROVED',
  'REJECTED',
  'WAITING_DOCUMENTS',
  'WAITING_PERIOD'
] as const;

// Risk levels
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;

interface Policy {
  id: string;
  policyNumber: string;
  beneficiaryName: string;
  beneficiaryCpf: string;
  planType: string;
  coverageAmount: number;
  premium: number;
  status: typeof POLICY_STATUS[number];
  riskLevel: typeof RISK_LEVELS[number];
  submittedDate: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  waitingPeriod?: number;
  notes?: string;
  hasAggravations: boolean;
}

interface ReviewDecision {
  action: 'approve' | 'reject';
  notes: string;
  coverageAdjustment?: number;
  waitingPeriod?: number;
  premiumAdjustment?: number;
}

const PolicyManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();

  // State management
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [riskFilter, setRiskFilter] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>({
    action: 'approve',
    notes: '',
    coverageAdjustment: 0,
    waitingPeriod: 0,
    premiumAdjustment: 0
  });

  // Details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Table columns configuration
  const columns = [
    {
      id: 'policyNumber',
      label: t('underwriter.policies.policyNumber'),
      minWidth: 120
    },
    {
      id: 'beneficiaryName',
      label: t('underwriter.policies.beneficiary'),
      minWidth: 170
    },
    {
      id: 'planType',
      label: t('underwriter.policies.planType'),
      minWidth: 130
    },
    {
      id: 'coverageAmount',
      label: t('underwriter.policies.coverage'),
      minWidth: 130,
      format: (value: number) => `R$ ${value.toLocaleString('pt-BR')}`
    },
    {
      id: 'premium',
      label: t('underwriter.policies.premium'),
      minWidth: 120,
      format: (value: number) => `R$ ${value.toFixed(2)}`
    },
    {
      id: 'riskLevel',
      label: t('underwriter.policies.risk'),
      minWidth: 120,
      format: (value: string) => {
        const colors: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
          LOW: 'success',
          MEDIUM: 'info',
          HIGH: 'warning',
          VERY_HIGH: 'error'
        };
        return (
          <Chip
            label={t(`underwriter.policies.riskLevels.${value.toLowerCase()}`)}
            size="small"
            color={colors[value] || 'default'}
          />
        );
      }
    },
    {
      id: 'hasAggravations',
      label: t('underwriter.policies.aggravations'),
      minWidth: 100,
      format: (value: boolean) => (
        <Chip
          label={value ? t('common.yes') : t('common.no')}
          size="small"
          color={value ? 'warning' : 'default'}
          variant="outlined"
        />
      )
    },
    {
      id: 'submittedDate',
      label: t('underwriter.policies.submittedDate'),
      minWidth: 130,
      format: (value: Date) => new Date(value).toLocaleDateString('pt-BR')
    },
    {
      id: 'actions',
      label: t('common.actions'),
      minWidth: 150,
      format: (_value: any, row: Policy) => (
        <Box>
          <Tooltip title={t('underwriter.policies.viewDetails')}>
            <IconButton
              size="small"
              onClick={() => handleViewDetails(row)}
              aria-label={t('underwriter.policies.viewDetails')}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          {row.status === 'PENDING_REVIEW' && (
            <>
              <Tooltip title={t('underwriter.policies.approve')}>
                <IconButton
                  size="small"
                  onClick={() => handleReviewClick(row, 'approve')}
                  color="success"
                  aria-label={t('underwriter.policies.approve')}
                >
                  <CheckCircleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('underwriter.policies.reject')}>
                <IconButton
                  size="small"
                  onClick={() => handleReviewClick(row, 'reject')}
                  color="error"
                  aria-label={t('underwriter.policies.reject')}
                >
                  <CancelIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )
    }
  ];

  // Fetch policies
  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulated API call - replace with actual API service
      const mockPolicies: Policy[] = Array.from({ length: 30 }, (_, i) => ({
        id: `policy-${i}`,
        policyNumber: `POL-${String(i + 1).padStart(6, '0')}`,
        beneficiaryName: `Beneficiário ${i + 1}`,
        beneficiaryCpf: `${String(i + 1).padStart(11, '0')}`,
        planType: ['Individual', 'Familiar', 'Empresarial'][Math.floor(Math.random() * 3)],
        coverageAmount: Math.floor(Math.random() * 500000) + 50000,
        premium: Math.random() * 1000 + 100,
        status: POLICY_STATUS[Math.floor(Math.random() * POLICY_STATUS.length)],
        riskLevel: RISK_LEVELS[Math.floor(Math.random() * RISK_LEVELS.length)],
        submittedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        hasAggravations: Math.random() > 0.7,
        waitingPeriod: Math.random() > 0.5 ? Math.floor(Math.random() * 180) : 0
      }));

      setPolicies(mockPolicies);
      setTotalCount(mockPolicies.length);
    } catch (error) {
      showError(t('underwriter.policies.fetchError'));
      console.error('Error fetching policies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, riskFilter, showError, t]);

  // Initial load
  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Handle view details
  const handleViewDetails = useCallback((policy: Policy) => {
    setSelectedPolicy(policy);
    setDetailsDialogOpen(true);
  }, []);

  // Handle review click
  const handleReviewClick = useCallback((policy: Policy, action: 'approve' | 'reject') => {
    setSelectedPolicy(policy);
    setReviewDecision({
      action,
      notes: '',
      coverageAdjustment: 0,
      waitingPeriod: action === 'approve' && policy.hasAggravations ? 30 : 0,
      premiumAdjustment: 0
    });
    setReviewDialogOpen(true);
  }, []);

  // Handle review submit
  const handleReviewSubmit = useCallback(async () => {
    if (!selectedPolicy) return;

    try {
      // Simulated API call - replace with actual API service
      await new Promise(resolve => setTimeout(resolve, 1000));

      const actionText = reviewDecision.action === 'approve'
        ? t('underwriter.policies.approved')
        : t('underwriter.policies.rejected');

      showSuccess(
        t('underwriter.policies.reviewSuccess', {
          action: actionText,
          policyNumber: selectedPolicy.policyNumber
        })
      );

      setReviewDialogOpen(false);
      setSelectedPolicy(null);
      fetchPolicies();
    } catch (error) {
      showError(t('underwriter.policies.reviewError'));
      console.error('Error submitting review:', error);
    }
  }, [selectedPolicy, reviewDecision, fetchPolicies, showSuccess, showError, t]);

  // Handle view risk assessment
  const handleViewRiskAssessment = useCallback((policy: Policy) => {
    navigate(`/underwriter/risk-assessment/${policy.id}`);
  }, [navigate]);

  // Filter policies by tab
  const filteredPolicies = policies.filter(policy => {
    if (activeTab === 0) return policy.status === 'PENDING_REVIEW';
    if (activeTab === 1) return policy.status === 'APPROVED';
    if (activeTab === 2) return policy.status === 'REJECTED';
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Typography variant="h4" component="h1">
            {t('underwriter.policies.title')}
          </Typography>
        </Grid>

        {/* Tabs */}
        <Grid item xs={12}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label={t('underwriter.policies.tabs.pending')} />
            <Tab label={t('underwriter.policies.tabs.approved')} />
            <Tab label={t('underwriter.policies.tabs.rejected')} />
            <Tab label={t('underwriter.policies.tabs.all')} />
          </Tabs>
        </Grid>

        {/* Filters */}
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={t('underwriter.policies.search')}
                  placeholder={t('underwriter.policies.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    endAdornment: <SearchIcon />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('underwriter.policies.filterByRisk')}</InputLabel>
                  <Select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    label={t('underwriter.policies.filterByRisk')}
                  >
                    <MenuItem value="">{t('common.all')}</MenuItem>
                    {RISK_LEVELS.map(level => (
                      <MenuItem key={level} value={level}>
                        {t(`underwriter.policies.riskLevels.${level.toLowerCase()}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Policies Table */}
        <Grid item xs={12}>
          <Card>
            <DataTable
              columns={columns}
              data={filteredPolicies}
              loading={isLoading}
              page={page}
              rowsPerPage={rowsPerPage}
              totalCount={totalCount}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              emptyMessage={t('underwriter.policies.noPolicies')}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('underwriter.policies.policyDetails')}
          {selectedPolicy && (
            <Chip
              label={selectedPolicy.policyNumber}
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {selectedPolicy && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {t('underwriter.policies.beneficiaryInfo')}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('underwriter.policies.name')}:</strong> {selectedPolicy.beneficiaryName}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('underwriter.policies.cpf')}:</strong> {selectedPolicy.beneficiaryCpf}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {t('underwriter.policies.policyInfo')}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('underwriter.policies.planType')}:</strong> {selectedPolicy.planType}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('underwriter.policies.coverage')}:</strong> R$ {selectedPolicy.coverageAmount.toLocaleString('pt-BR')}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('underwriter.policies.premium')}:</strong> R$ {selectedPolicy.premium.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('underwriter.policies.waitingPeriod')}:</strong> {selectedPolicy.waitingPeriod || 0} {t('common.days')}
                </Typography>
              </Grid>
              {selectedPolicy.notes && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      {t('underwriter.policies.notes')}
                    </Typography>
                    <Typography variant="body2">{selectedPolicy.notes}</Typography>
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={() => handleViewRiskAssessment(selectedPolicy)}
                  fullWidth
                >
                  {t('underwriter.policies.viewRiskAssessment')}
                </Button>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewDecision.action === 'approve'
            ? t('underwriter.policies.approvePolicy')
            : t('underwriter.policies.rejectPolicy')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {selectedPolicy && (
              <Grid item xs={12}>
                <Alert severity="info">
                  {t('underwriter.policies.reviewingPolicy', {
                    policyNumber: selectedPolicy.policyNumber,
                    beneficiary: selectedPolicy.beneficiaryName
                  })}
                </Alert>
              </Grid>
            )}
            {reviewDecision.action === 'approve' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('underwriter.policies.coverageAdjustment')}
                    value={reviewDecision.coverageAdjustment}
                    onChange={(e) =>
                      setReviewDecision({
                        ...reviewDecision,
                        coverageAdjustment: Number(e.target.value)
                      })
                    }
                    helperText={t('underwriter.policies.coverageAdjustmentHelp')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('underwriter.policies.waitingPeriodDays')}
                    value={reviewDecision.waitingPeriod}
                    onChange={(e) =>
                      setReviewDecision({
                        ...reviewDecision,
                        waitingPeriod: Number(e.target.value)
                      })
                    }
                    helperText={t('underwriter.policies.waitingPeriodHelp')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('underwriter.policies.premiumAdjustment')}
                    value={reviewDecision.premiumAdjustment}
                    onChange={(e) =>
                      setReviewDecision({
                        ...reviewDecision,
                        premiumAdjustment: Number(e.target.value)
                      })
                    }
                    helperText={t('underwriter.policies.premiumAdjustmentHelp')}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label={t('underwriter.policies.reviewNotes')}
                value={reviewDecision.notes}
                onChange={(e) =>
                  setReviewDecision({ ...reviewDecision, notes: e.target.value })
                }
                placeholder={t('underwriter.policies.reviewNotesPlaceholder')}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color={reviewDecision.action === 'approve' ? 'success' : 'error'}
            onClick={handleReviewSubmit}
            disabled={!reviewDecision.notes}
          >
            {reviewDecision.action === 'approve'
              ? t('underwriter.policies.confirmApproval')
              : t('underwriter.policies.confirmRejection')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PolicyManagement;
