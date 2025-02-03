import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // ^13.0.0
import { Box, Typography, Card, CardContent, CircularProgress } from '@mui/material'; // ^5.0.0
import { DateRangePicker } from '@mui/x-date-pickers-pro'; // ^6.0.0
import { useDebounce } from 'use-debounce'; // ^9.0.0

import { DataTable, DataTableColumn } from '../../components/common/DataTable';
import BrokerLayout from '../../layouts/BrokerLayout';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { EnrollmentService } from '../../services/enrollment.service';
import { EnrollmentStatus, EnrollmentSummary } from '../../types/enrollment.types';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../contexts/NotificationContext';

// Interface for report filters
interface ReportFilters {
  dateRange: { start: Date; end: Date } | null;
  status: EnrollmentStatus[];
  searchTerm: string;
  commissionRange: { min: number; max: number } | null;
}

// Interface for export options
interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  includeHeaders: boolean;
  dateFormat: string;
}

const Reports: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();
  const enrollmentService = new EnrollmentService();

  // State management
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: null,
    status: [],
    searchTerm: '',
    commissionRange: null
  });

  // Debounced search term for performance
  const [debouncedSearchTerm] = useDebounce(filters.searchTerm, 300);

  // Table columns configuration
  const columns: DataTableColumn<EnrollmentSummary>[] = useMemo(() => [
    {
      key: 'beneficiaryName',
      header: t('reports.columns.beneficiary'),
      sortable: true,
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'cpf',
      header: t('reports.columns.cpf'),
      sortable: true,
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'status',
      header: t('reports.columns.status'),
      sortable: true,
      filterable: true,
      filterType: 'status',
      render: (row) => (
        <StatusBadge status={row.status} type="enrollment" />
      )
    },
    {
      key: 'createdAt',
      header: t('reports.columns.date'),
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (row) => new Date(row.createdAt).toLocaleDateString('pt-BR')
    },
    {
      key: 'riskLevel',
      header: t('reports.columns.risk'),
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

  // Fetch enrollments with filters
  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await enrollmentService.getEnrollments(
        {
          startDate: filters.dateRange?.start,
          endDate: filters.dateRange?.end,
          status: filters.status,
          searchTerm: debouncedSearchTerm,
          brokerId: user?.id
        },
        currentPage,
        10
      );

      setEnrollments(response.data);
      setTotalItems(response.total);
    } catch (error) {
      showNotification(t('reports.errors.fetch'), { severity: 'error' });
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, debouncedSearchTerm, user?.id, showNotification, t]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ReportFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  // Handle export
  const handleExport = useCallback(async (options: ExportOptions) => {
    try {
      setLoading(true);
      const response = await enrollmentService.exportReport(
        filters,
        options,
        user?.id
      );

      const blob = new Blob([response.data], { 
        type: `application/${options.format}` 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enrollments-report.${options.format}`;
      link.click();
      window.URL.revokeObjectURL(url);

      showNotification(t('reports.export.success'), { severity: 'success' });
    } catch (error) {
      showNotification(t('reports.export.error'), { severity: 'error' });
      console.error('Error exporting report:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, user?.id, showNotification, t]);

  // Fetch data on mount and filter changes
  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  return (
    <BrokerLayout>
      <ErrorBoundary>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            {t('reports.title')}
          </Typography>

          {/* Summary Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, mb: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">{t('reports.summary.total')}</Typography>
                <Typography variant="h4">{totalItems}</Typography>
              </CardContent>
            </Card>
            {/* Add more summary cards as needed */}
          </Box>

          {/* Filters and Table */}
          <Card>
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DataTable
                  columns={columns}
                  data={enrollments}
                  totalItems={totalItems}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  onFilterChange={handleFilterChange}
                  serverSide
                  virtualScroll={false}
                  emptyMessage={t('reports.noData')}
                  ariaLabel={t('reports.tableAriaLabel')}
                />
              )}
            </CardContent>
          </Card>
        </Box>
      </ErrorBoundary>
    </BrokerLayout>
  );
});

Reports.displayName = 'Reports';

export default Reports;