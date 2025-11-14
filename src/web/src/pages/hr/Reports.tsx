import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuditLog } from '../../hooks/useAuditLog';

import DataTable, { DataTableColumn } from '../../components/common/DataTable';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { EnrollmentService } from '../../services/enrollment.service';
import { ApiService } from '../../services/api.service';
import { EnrollmentSummary, EnrollmentStatus } from '../../types/enrollment.types';
import { PolicyStatus } from '../../types/policy.types';
import { THEME } from '../../constants/app.constants';

// Constants for data fetching and caching
const PAGE_SIZE = 10;
const CACHE_TTL = 300000; // 5 minutes
const MAX_EXPORT_ITEMS = 1000;
const RETRY_ATTEMPTS = 3;

// Interface for enrollment report filters
interface ReportFilters {
  status?: EnrollmentStatus;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const auditLog = useAuditLog();
  const apiService = new ApiService();
  const enrollmentService = new EnrollmentService(apiService);

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Data fetching with React Query
  const {
    data: enrollmentData,
    isLoading,
    error
  } = useQuery(
    ['enrollments', currentPage, filters],
    () => enrollmentService.getEnrollments(filters, currentPage, PAGE_SIZE),
    {
      keepPreviousData: true,
      staleTime: CACHE_TTL,
      retry: RETRY_ATTEMPTS,
      onError: (error) => {
        auditLog.logAccess('enrollment_report_fetch_failed', { error });
      }
    }
  );

  // Table columns configuration with LGPD compliance
  const columns: DataTableColumn<EnrollmentSummary>[] = useMemo(() => [
    {
      key: 'id',
      header: t('reports.columns.id'),
      width: '120px',
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'beneficiaryName',
      header: t('reports.columns.employeeName'),
      width: '200px',
      filterable: true,
      filterType: 'text',
      render: (row) => (
        <span className="employee-name" title={row.beneficiaryName}>
          {row.beneficiaryName}
        </span>
      )
    },
    {
      key: 'status',
      header: t('reports.columns.status'),
      width: '150px',
      filterable: true,
      filterType: 'status',
      render: (row) => (
        <span
          className={`status-badge status-${row.status.toLowerCase()}`}
          aria-label={t(`status.${row.status.toLowerCase()}`)}
        >
          {t(`status.${row.status.toLowerCase()}`)}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: t('reports.columns.submissionDate'),
      width: '150px',
      filterable: true,
      filterType: 'date',
      render: (row) => new Date(row.createdAt).toLocaleDateString('pt-BR')
    },
    {
      key: 'cpf',
      header: t('reports.columns.cpf'),
      width: '150px',
      filterable: true,
      filterType: 'text',
      render: (row) => row.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    },
    {
      key: 'riskLevel',
      header: t('reports.columns.riskLevel'),
      width: '150px',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'LOW', label: t('riskLevels.low') },
        { value: 'MEDIUM', label: t('riskLevels.medium') },
        { value: 'HIGH', label: t('riskLevels.high') }
      ]
    }
  ], [t]);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    auditLog.logAccess('enrollment_report_page_changed', { page });
  }, [auditLog]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
    setCurrentPage(1);
    auditLog.logAccess('enrollment_report_filters_changed', { filters: newFilters });
  }, [auditLog]);

  // Handle export functionality
  const handleExport = useCallback(async () => {
    try {
      auditLog.logAccess('enrollment_report_export_started');
      setExportProgress(0);

      // For now, export the current data as CSV
      const data = enrollmentData?.data || [];
      const csvContent = [
        ['ID', 'Beneficiary Name', 'CPF', 'Status', 'Created At', 'Risk Level', 'Broker ID'].join(','),
        ...data.map(row => [
          row.id,
          row.beneficiaryName || '',
          row.cpf || '',
          row.status,
          new Date(row.createdAt).toLocaleDateString('pt-BR'),
          row.riskLevel,
          row.brokerId || ''
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `enrollment-report-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setExportProgress(100);
      auditLog.logAccess('enrollment_report_export_completed');
    } catch (error) {
      auditLog.logAccess('enrollment_report_export_failed', { error });
      setExportProgress(0);
    }
  }, [enrollmentData, auditLog]);

  return (
    <ErrorBoundary>
      <div className="reports-container" style={{ padding: THEME.SPACING.LARGE }}>
        <header className="reports-header">
          <h1>{t('reports.title')}</h1>
          <div className="reports-actions">
            <button
              onClick={handleExport}
              disabled={isLoading || exportProgress > 0}
              className="export-button"
              aria-label={t('reports.exportButtonLabel')}
            >
              {exportProgress > 0 ? `${exportProgress}%` : t('reports.export')}
            </button>
          </div>
        </header>

        <DataTable<EnrollmentSummary>
          columns={columns}
          data={enrollmentData?.data || []}
          loading={isLoading}
          totalItems={enrollmentData?.total}
          pageSize={PAGE_SIZE}
          currentPage={currentPage}
          serverSide={true}
          onPageChange={handlePageChange}
          onFilterChange={handleFilterChange}
          emptyMessage={t('reports.noData')}
          className="enrollment-table"
          ariaLabel={t('reports.tableAriaLabel')}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Reports;