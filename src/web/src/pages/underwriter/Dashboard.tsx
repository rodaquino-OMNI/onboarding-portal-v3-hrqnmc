import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // v13.0.0
import { Grid } from '@mui/material'; // v5.0.0
import CircuitBreaker from 'opossum'; // v7.1.0
import Card from '../../components/common/Card';
import DataTable from '../../components/common/DataTable';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import StatusBadge from '../../components/common/StatusBadge';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { RiskLevel } from '../../types/health.types';
import { EnrollmentStatus } from '../../types/enrollment.types';
import { PolicyStatus } from '../../types/policy.types';

// Circuit breaker for API calls
const breakerAction = async (operation: () => Promise<any>) => operation();
const breaker = new CircuitBreaker(breakerAction, {
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  timeout: 10000,
  name: 'dashboardBreaker'
});

// Interfaces
interface DashboardMetrics {
  pendingAssessments: number;
  completedToday: number;
  averageRiskScore: number;
  highRiskCount: number;
}

interface PendingAssessment {
  enrollmentId: string;
  beneficiaryName: string;
  submissionDate: Date;
  riskScore: number;
  status: EnrollmentStatus;
  priority: number;
}

// Fetch dashboard metrics with circuit breaker protection
const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  return breaker.fire(async () => {
    const response = await fetch('/api/v1/underwriter/metrics', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch metrics');
    }
    
    return response.json();
  });
};

// Fetch pending assessments with pagination and filtering
const fetchPendingAssessments = async (
  page: number,
  pageSize: number,
  filters: Record<string, any>
): Promise<{ data: PendingAssessment[]; total: number }> => {
  return breaker.fire(async () => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...filters
    });

    const response = await fetch(`/api/v1/underwriter/pending-assessments?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch assessments');
    }

    return response.json();
  });
};

const UnderwriterDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotificationContext();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<PendingAssessment[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});

  // Table columns configuration with accessibility support
  const columns = [
    {
      key: 'beneficiaryName',
      header: t('dashboard.table.beneficiary'),
      width: '25%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      ariaLabel: t('aria.table.beneficiary')
    },
    {
      key: 'submissionDate',
      header: t('dashboard.table.submitted'),
      width: '20%',
      sortable: true,
      render: (row: PendingAssessment) => new Date(row.submissionDate).toLocaleDateString('pt-BR'),
      ariaLabel: t('aria.table.submissionDate')
    },
    {
      key: 'riskScore',
      header: t('dashboard.table.riskScore'),
      width: '15%',
      sortable: true,
      render: (row: PendingAssessment) => (
        <span role="text" aria-label={t('aria.riskScore', { score: row.riskScore })}>
          {row.riskScore.toFixed(1)}
        </span>
      )
    },
    {
      key: 'status',
      header: t('dashboard.table.status'),
      width: '20%',
      sortable: true,
      filterable: true,
      filterType: 'status',
      render: (row: PendingAssessment) => (
        <StatusBadge status={row.status} type="enrollment" />
      )
    },
    {
      key: 'priority',
      header: t('dashboard.table.priority'),
      width: '20%',
      sortable: true,
      render: (row: PendingAssessment) => (
        <span className={`priority-${row.priority}`} role="text">
          {t(`dashboard.priority.${row.priority}`)}
        </span>
      )
    }
  ];

  // Load dashboard metrics
  const loadMetrics = useCallback(async () => {
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      showNotification(t('dashboard.errors.metrics'), { severity: 'error' });
      console.error('Failed to load metrics:', error);
    }
  }, [showNotification, t]);

  // Load pending assessments
  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, total } = await fetchPendingAssessments(currentPage, 10, filters);
      setAssessments(data);
      setTotalItems(total);
    } catch (error) {
      showNotification(t('dashboard.errors.assessments'), { severity: 'error' });
      console.error('Failed to load assessments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, showNotification, t]);

  // Initial data load
  useEffect(() => {
    loadMetrics();
    loadAssessments();
  }, [loadMetrics, loadAssessments]);

  // Refresh metrics periodically
  useEffect(() => {
    const intervalId = setInterval(loadMetrics, 300000); // 5 minutes
    return () => clearInterval(intervalId);
  }, [loadMetrics]);

  return (
    <ErrorBoundary>
      <div 
        className="underwriter-dashboard"
        role="main"
        aria-label={t('dashboard.title')}
      >
        {/* Metrics Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              testId="pending-assessments-card"
              ariaLabel={t('dashboard.metrics.pending')}
            >
              <h3>{t('dashboard.metrics.pending')}</h3>
              <div className="metric-value" aria-live="polite">
                {metrics?.pendingAssessments || 0}
              </div>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              testId="completed-today-card"
              ariaLabel={t('dashboard.metrics.completed')}
            >
              <h3>{t('dashboard.metrics.completed')}</h3>
              <div className="metric-value" aria-live="polite">
                {metrics?.completedToday || 0}
              </div>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              testId="risk-score-card"
              ariaLabel={t('dashboard.metrics.averageRisk')}
            >
              <h3>{t('dashboard.metrics.averageRisk')}</h3>
              <div className="metric-value" aria-live="polite">
                {metrics?.averageRiskScore?.toFixed(1) || '0.0'}
              </div>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              testId="high-risk-card"
              ariaLabel={t('dashboard.metrics.highRisk')}
            >
              <h3>{t('dashboard.metrics.highRisk')}</h3>
              <div className="metric-value" aria-live="polite">
                {metrics?.highRiskCount || 0}
              </div>
            </Card>
          </Grid>
        </Grid>

        {/* Pending Assessments Table */}
        <Card
          testId="assessments-table-card"
          ariaLabel={t('dashboard.table.title')}
        >
          <h2>{t('dashboard.table.title')}</h2>
          <DataTable
            columns={columns}
            data={assessments}
            loading={loading}
            totalItems={totalItems}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onFilterChange={setFilters}
            serverSide={true}
            ariaLabel={t('dashboard.table.aria')}
            emptyMessage={t('dashboard.table.empty')}
          />
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default UnderwriterDashboard;