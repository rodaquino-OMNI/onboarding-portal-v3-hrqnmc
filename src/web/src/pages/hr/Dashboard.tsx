import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Grid, Typography, Box, Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next';

import MainLayout from '../../layouts/MainLayout';
import DataTable, { DataTableColumn } from '../../components/common/DataTable';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useEnrollment } from '../../hooks/useEnrollment';
import { EnrollmentStatus, EnrollmentSummary } from '../../types/enrollment.types';
import { useAuth } from '../../hooks/useAuth';

// Constants for dashboard configuration
const ITEMS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;
const AUTO_REFRESH_INTERVAL = 30000;
const MAX_RETRIES = 3;

interface EnrollmentStats {
  total: number;
  pending: number;
  completed: number;
  inProgress: number;
  processingTime: number;
  accuracy: number;
}

interface DashboardFilters {
  status: EnrollmentStatus[];
  dateRange: { start: Date; end: Date };
  search: string;
  department: string[];
  priority: ('high' | 'medium' | 'low')[];
}

const HRDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    fetchEnrollmentList,
    changeEnrollmentStatus,
    isLoading,
    error
  } = useEnrollment();

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState<EnrollmentStats | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    status: [],
    dateRange: { start: new Date(), end: new Date() },
    search: '',
    department: [],
    priority: []
  });

  // Memoized table columns configuration
  const columns: DataTableColumn<EnrollmentSummary>[] = useMemo(() => [
    {
      key: 'beneficiaryName',
      header: t('dashboard.columns.beneficiary'),
      sortable: true,
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'cpf',
      header: t('dashboard.columns.cpf'),
      sortable: true,
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'status',
      header: t('dashboard.columns.status'),
      sortable: true,
      filterable: true,
      filterType: 'status',
      render: (row) => (
        <StatusBadge
          status={row.status}
          type="enrollment"
          size="small"
        />
      )
    },
    {
      key: 'createdAt',
      header: t('dashboard.columns.date'),
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (row) => new Date(row.createdAt).toLocaleDateString('pt-BR')
    },
    {
      key: 'riskLevel',
      header: t('dashboard.columns.risk'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'LOW', label: t('risk.low') },
        { value: 'MEDIUM', label: t('risk.medium') },
        { value: 'HIGH', label: t('risk.high') }
      ]
    }
  ], [t]);

  // Handle page changes with debouncing
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  // Fetch data with auto-refresh
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchEnrollmentList(currentPage, ITEMS_PER_PAGE, filters);
      } catch (error) {
        console.error('Failed to fetch enrollments:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [currentPage, filters, fetchEnrollmentList]);

  // Render statistics cards
  const renderStats = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {stats ? (
        <>
          <Grid item xs={12} sm={6} md={3}>
            <Box className="stats-card">
              <Typography variant="h6">{t('dashboard.stats.total')}</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box className="stats-card">
              <Typography variant="h6">{t('dashboard.stats.pending')}</Typography>
              <Typography variant="h4">{stats.pending}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box className="stats-card">
              <Typography variant="h6">{t('dashboard.stats.completed')}</Typography>
              <Typography variant="h4">{stats.completed}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box className="stats-card">
              <Typography variant="h6">{t('dashboard.stats.processing')}</Typography>
              <Typography variant="h4">{`${stats.processingTime}min`}</Typography>
            </Box>
          </Grid>
        </>
      ) : (
        Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Skeleton variant="rectangular" height={120} />
          </Grid>
        ))
      )}
    </Grid>
  );

  return (
    <MainLayout>
      <ErrorBoundary>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" sx={{ mb: 4 }}>
            {t('dashboard.title')}
          </Typography>

          {renderStats()}

          <DataTable<EnrollmentSummary>
            columns={columns}
            data={[]} // Data will be provided by the API
            loading={isLoading}
            totalItems={stats?.total || 0}
            pageSize={ITEMS_PER_PAGE}
            currentPage={currentPage}
            serverSide={true}
            onPageChange={handlePageChange}
            onFilterChange={handleFilterChange}
            virtualScroll={false}
            emptyMessage={t('dashboard.noData')}
            className="enrollment-table"
            ariaLabel={t('dashboard.tableAriaLabel')}
          />
        </Box>
      </ErrorBoundary>
    </MainLayout>
  );
};

export default HRDashboard;