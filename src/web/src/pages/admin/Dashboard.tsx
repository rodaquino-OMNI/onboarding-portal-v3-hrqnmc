import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Grid, Typography, CircularProgress, Skeleton, Alert } from '@mui/material'; // ^5.0.0
import { BarChart, LineChart, PieChart, ResponsiveContainer } from '@mui/x-charts'; // ^6.0.0

import AdminLayout from '../../layouts/AdminLayout';
import Card from '../../components/common/Card';
import { useAuth } from '../../hooks/useAuth';
import { ApiService } from '../../services/api.service';

// Constants for dashboard configuration
const REFRESH_INTERVAL = 30000; // 30 seconds
const CHART_HEIGHT = 300;
const STATUS_COLORS = {
  healthy: '#4caf50',
  warning: '#ff9800',
  error: '#f44336'
};
const ERROR_RETRY_ATTEMPTS = 3;
const CACHE_DURATION = 60000; // 1 minute
const PERFORMANCE_THRESHOLDS = {
  responseTime: 200,
  errorRate: 0.01,
  dataAccuracy: 0.999
};

// Interface for dashboard metrics
interface DashboardMetrics {
  totalEnrollments: number;
  pendingEnrollments: number;
  completedEnrollments: number;
  systemHealth: {
    apiGateway: string;
    services: Record<string, string>;
    databaseStatus: string;
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
  dataAccuracy: {
    percentage: number;
    validationErrors: number;
    lastValidation: Date;
  };
  processingTime: {
    average: number;
    peak: number;
    current: number;
  };
  lgpdCompliance: {
    status: string;
    violations: number;
    lastAudit: Date;
  };
}

const AdminDashboard: React.FC = React.memo(() => {
  const { user, validateAdminRole } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize API service
  const apiService = useMemo(() => new ApiService(), []);

  // Fetch dashboard metrics with error handling and caching
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await apiService.getCached<DashboardMetrics>(
        '/api/v1/admin/metrics',
        { duration: CACHE_DURATION }
      );

      setMetrics(response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      if (retryCount < ERROR_RETRY_ATTEMPTS) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchMetrics, 1000 * (retryCount + 1));
      } else {
        setError('Failed to load dashboard metrics');
        setLoading(false);
      }
    }
  }, [apiService, retryCount]);

  // Initial load and refresh interval
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // System health status indicator
  const getHealthStatus = useCallback((value: number, threshold: number) => {
    if (value >= threshold) return 'healthy';
    if (value >= threshold * 0.8) return 'warning';
    return 'error';
  }, []);

  // Render enrollment statistics
  const renderEnrollmentStats = () => (
    <Card testId="enrollment-stats">
      <Typography variant="h6" gutterBottom>
        Estatísticas de Inscrições
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1">Total</Typography>
          <Typography variant="h4">{metrics?.totalEnrollments || 0}</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1">Pendentes</Typography>
          <Typography variant="h4" color="warning.main">
            {metrics?.pendingEnrollments || 0}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1">Concluídas</Typography>
          <Typography variant="h4" color="success.main">
            {metrics?.completedEnrollments || 0}
          </Typography>
        </Grid>
      </Grid>
    </Card>
  );

  // Render system health metrics
  const renderSystemHealth = () => (
    <Card testId="system-health">
      <Typography variant="h6" gutterBottom>
        Saúde do Sistema
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">API Gateway</Typography>
          <Typography
            color={STATUS_COLORS[metrics?.systemHealth.apiGateway as keyof typeof STATUS_COLORS]}
          >
            {metrics?.systemHealth.apiGateway || 'N/A'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Tempo de Resposta</Typography>
          <Typography
            color={STATUS_COLORS[getHealthStatus(
              metrics?.systemHealth.responseTime || 0,
              PERFORMANCE_THRESHOLDS.responseTime
            )]}
          >
            {metrics?.systemHealth.responseTime || 0}ms
          </Typography>
        </Grid>
      </Grid>
    </Card>
  );

  // Render LGPD compliance status
  const renderLGPDCompliance = () => (
    <Card testId="lgpd-compliance">
      <Typography variant="h6" gutterBottom>
        Conformidade LGPD
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert
            severity={metrics?.lgpdCompliance.violations === 0 ? 'success' : 'error'}
            variant="outlined"
          >
            {metrics?.lgpdCompliance.violations === 0
              ? 'Sistema em conformidade com LGPD'
              : `${metrics?.lgpdCompliance.violations} violações detectadas`}
          </Alert>
        </Grid>
      </Grid>
    </Card>
  );

  // Loading state
  if (loading) {
    return (
      <AdminLayout>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(index => (
            <Grid item xs={12} md={6} key={index}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </AdminLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminLayout>
        <Alert
          severity="error"
          action={
            <Button onClick={fetchMetrics} color="inherit" size="small">
              Tentar novamente
            </Button>
          }
        >
          {error}
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Dashboard Administrativo
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          {renderEnrollmentStats()}
        </Grid>

        <Grid item xs={12} md={6}>
          {renderSystemHealth()}
        </Grid>

        <Grid item xs={12} md={6}>
          <Card testId="performance-metrics">
            <Typography variant="h6" gutterBottom>
              Métricas de Performance
            </Typography>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart
                data={[
                  {
                    time: metrics?.processingTime.average || 0,
                    peak: metrics?.processingTime.peak || 0,
                    current: metrics?.processingTime.current || 0
                  }
                ]}
              />
            </ResponsiveContainer>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          {renderLGPDCompliance()}
        </Grid>
      </Grid>
    </AdminLayout>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;