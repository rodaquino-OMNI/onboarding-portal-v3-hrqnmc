import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, Typography, Button, IconButton, Tooltip } from '@mui/material';
import useWebSocket from 'react-use-websocket';
import { ErrorBoundary } from 'react-error-boundary';

import Card from '../../components/common/Card';
import EnrollmentList from '../../components/enrollment/EnrollmentList';
import { useEnrollment } from '../../hooks/useEnrollment';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

import { EnrollmentStatus } from '../../types/enrollment.types';
import { THEME } from '../../constants/app.constants';

// Temporary type definitions
interface DashboardStats {
  totalEnrollments: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  pending?: number;
  completed?: number;
  thisMonth?: number;
  commission?: number;
  trends?: {
    enrollments: number;
    conversion: number;
    revenue: number;
  };
  performance?: {
    avgProcessingTime: number;
    completionRate: number;
  };
}

interface FilterOptions {
  status?: EnrollmentStatus[];
  dateRange?: { start: Date | null; end: Date | null };
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// WebSocket configuration
const WS_URL = process.env.VITE_WS_URL || 'ws://localhost:8080';

const BrokerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showError } = useNotification();
  
  // State management
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: [],
    dateRange: { start: null, end: null },
    searchTerm: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Custom hooks
  const { enrollment, fetchEnrollmentList, isLoading } = useEnrollment();

  // WebSocket for real-time updates
  const { lastMessage, readyState } = useWebSocket(`${WS_URL}/broker/${user?.id}/stats`, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
    reconnectAttempts: 10
  });

  // Process WebSocket messages
  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const updatedStats = JSON.parse(lastMessage.data);
        setStats(updatedStats);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
        showError(t('dashboard.errors.websocketParse'));
      }
    }
  }, [lastMessage, showError, t]);

  // Fetch initial dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        await fetchEnrollmentList(1, 10, filterOptions);
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        showError(t('dashboard.errors.dataFetch'));
      }
    };

    fetchDashboardData();
  }, [fetchEnrollmentList, filterOptions, showError, t]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilterOptions(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Memoized statistics cards
  const StatisticsCards = useMemo(() => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card 
          testId="pending-enrollments-card"
          ariaLabel={t('dashboard.stats.pending.aria')}
        >
          <Typography variant="h6" color="textSecondary">
            {t('dashboard.stats.pending.title')}
          </Typography>
          <Typography variant="h3" color="primary">
            {stats?.pending || 0}
          </Typography>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card 
          testId="completed-enrollments-card"
          ariaLabel={t('dashboard.stats.completed.aria')}
        >
          <Typography variant="h6" color="textSecondary">
            {t('dashboard.stats.completed.title')}
          </Typography>
          <Typography variant="h3" color="success.main">
            {stats?.completed || 0}
          </Typography>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card 
          testId="monthly-enrollments-card"
          ariaLabel={t('dashboard.stats.monthly.aria')}
        >
          <Typography variant="h6" color="textSecondary">
            {t('dashboard.stats.monthly.title')}
          </Typography>
          <Typography variant="h3">
            {stats?.thisMonth || 0}
          </Typography>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card 
          testId="commission-card"
          ariaLabel={t('dashboard.stats.commission.aria')}
        >
          <Typography variant="h6" color="textSecondary">
            {t('dashboard.stats.commission.title')}
          </Typography>
          <Typography variant="h3" color="secondary.main">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(stats?.commission || 0)}
          </Typography>
        </Card>
      </Grid>
    </Grid>
  ), [stats, t]);

  // Memoized performance metrics
  const PerformanceMetrics = useMemo(() => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} md={6}>
        <Card 
          testId="trends-card"
          ariaLabel={t('dashboard.performance.trends.aria')}
        >
          <Typography variant="h6" gutterBottom>
            {t('dashboard.performance.trends.title')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                {t('dashboard.performance.trends.daily')}
              </Typography>
              <Typography variant="h6">
                {stats?.trends?.daily || 0}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                {t('dashboard.performance.trends.weekly')}
              </Typography>
              <Typography variant="h6">
                {stats?.trends?.weekly || 0}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                {t('dashboard.performance.trends.monthly')}
              </Typography>
              <Typography variant="h6">
                {stats?.trends?.monthly || 0}
              </Typography>
            </Grid>
          </Grid>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card 
          testId="metrics-card"
          ariaLabel={t('dashboard.performance.metrics.aria')}
        >
          <Typography variant="h6" gutterBottom>
            {t('dashboard.performance.metrics.title')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                {t('dashboard.performance.metrics.completionTime')}
              </Typography>
              <Typography variant="h6">
                {stats?.performance?.averageCompletionTime || 0}min
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                {t('dashboard.performance.metrics.successRate')}
              </Typography>
              <Typography variant="h6">
                {stats?.performance?.successRate || 0}%
              </Typography>
            </Grid>
          </Grid>
        </Card>
      </Grid>
    </Grid>
  ), [stats, t]);

  return (
    <ErrorBoundary
      fallback={
        <Typography color="error" align="center">
          {t('dashboard.errors.general')}
        </Typography>
      }
    >
      <div role="main" aria-label={t('dashboard.aria.main')}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h4" component="h1" gutterBottom>
              {t('dashboard.welcome', { name: user?.firstName })}
            </Typography>
          </Grid>

          {StatisticsCards}
          {PerformanceMetrics}

          <Grid item xs={12}>
            <Card 
              testId="enrollments-card"
              ariaLabel={t('dashboard.enrollments.aria')}
            >
              <EnrollmentList
                brokerId={user?.id}
                onEnrollmentSelect={(enrollment) => {
                  // Handle enrollment selection
                }}
                className="enrollment-list"
                initialFilters={filterOptions}
              />
            </Card>
          </Grid>
        </Grid>
      </div>
    </ErrorBoundary>
  );
};

export default BrokerDashboard;