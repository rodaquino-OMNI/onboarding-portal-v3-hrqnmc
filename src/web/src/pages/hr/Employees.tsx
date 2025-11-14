import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';
import DataTable, { DataTableColumn } from '../../components/common/DataTable';
import Card from '../../components/common/Card';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import EnrollmentService from '../../services/enrollment.service';
import { EnrollmentSummary, EnrollmentStatus } from '../../types/enrollment.types';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { THEME } from '../../constants/app.constants';

// Constants
const PAGE_SIZE = 10;
const DEBOUNCE_DELAY = 300;

// Interface for table filters
interface EmployeeTableFilters {
  status: EnrollmentStatus | null;
  searchTerm: string;
  department: string | null;
  enrollmentDate: {
    start: Date | null;
    end: Date | null;
  } | null;
}

// Initial filter state
const INITIAL_FILTERS: EmployeeTableFilters = {
  status: null,
  searchTerm: '',
  department: null,
  enrollmentDate: null,
};

/**
 * Custom hook for managing employee enrollment data
 */
const useEmployeeData = (
  filters: EmployeeTableFilters,
  page: number,
  pageSize: number
) => {
  const [data, setData] = useState<EnrollmentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const { showNotification } = useNotificationContext();
  const enrollmentService = useMemo(() => new EnrollmentService(), []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await enrollmentService.getEnrollments(
        {
          status: filters.status || undefined,
          searchTerm: filters.searchTerm,
          startDate: filters.enrollmentDate?.start || undefined,
          endDate: filters.enrollmentDate?.end || undefined,
        },
        page,
        pageSize
      );
      setData(response.data);
      setTotal(response.total);
      setError(null);
    } catch (err) {
      setError(err as Error);
      showNotification('Erro ao carregar dados dos funcionários', {
        severity: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, enrollmentService, showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, total, error, refetch: fetchData };
};

/**
 * HR Employees page component for managing employee health plan enrollments
 */
const Employees: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<EmployeeTableFilters>(INITIAL_FILTERS);
  const [debouncedFilters] = useDebounce(filters, DEBOUNCE_DELAY);
  const { data, loading, total, error } = useEmployeeData(debouncedFilters, page, PAGE_SIZE);

  // Memoized table columns with proper accessibility and formatting
  const columns = useMemo<DataTableColumn<EnrollmentSummary>[]>(() => [
    {
      key: 'beneficiaryName' as keyof EnrollmentSummary,
      header: t('employees.table.name'),
      width: '25%',
      sortable: true,
      filterable: true,
      filterType: 'text',
      ariaLabel: t('employees.aria.name'),
    },
    {
      key: 'cpf' as keyof EnrollmentSummary,
      header: t('employees.table.cpf'),
      width: '15%',
      sortable: true,
      render: (row) => row.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    },
    {
      key: 'status' as keyof EnrollmentSummary,
      header: t('employees.table.status'),
      width: '20%',
      sortable: true,
      filterable: true,
      filterType: 'status',
      filterOptions: Object.values(EnrollmentStatus).map(status => ({
        value: status,
        label: t(`enrollment.status.${status.toLowerCase()}`),
      })),
    },
    {
      key: 'createdAt' as keyof EnrollmentSummary,
      header: t('employees.table.enrollmentDate'),
      width: '20%',
      sortable: true,
      render: (row) => new Intl.DateTimeFormat('pt-BR').format(new Date(row.createdAt)),
    },
    {
      key: 'id' as keyof EnrollmentSummary,
      header: t('employees.table.actions'),
      width: '20%',
      render: (row) => (
        <div className="table-actions">
          <button
            onClick={() => handleViewDetails(row.id)}
            aria-label={t('employees.aria.viewDetails', { name: row.beneficiaryName })}
            className="action-button"
          >
            {t('employees.actions.view')}
          </button>
        </div>
      ),
    },
  ], [t]);

  // Handlers
  const handleViewDetails = useCallback((id: string) => {
    // Navigate to details page - implementation depends on routing solution
    console.log('View details:', id);
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<EmployeeTableFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page on filter change
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <ErrorBoundary>
      <div className="employees-page">
        <h1 className="page-title" tabIndex={0}>
          {t('employees.title')}
        </h1>
        
        <Card
          elevation={1}
          className="employees-table-card"
          testId="employees-table-container"
          ariaLabel={t('employees.aria.tableContainer')}
        >
          <DataTable<EnrollmentSummary>
            columns={columns}
            data={data}
            loading={loading}
            totalItems={total}
            pageSize={PAGE_SIZE}
            currentPage={page}
            serverSide={true}
            onPageChange={handlePageChange}
            onFilterChange={handleFilterChange}
            emptyMessage={t('employees.table.noData')}
            ariaLabel={t('employees.aria.table')}
          />
        </Card>
      </div>

      <style>{`
        .employees-page {
          padding: ${THEME.SPACING.LARGE};
        }

        .page-title {
          font-size: ${THEME.TYPOGRAPHY.FONT_SIZES.XLARGE};
          font-weight: ${THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM};
          color: ${THEME.COLORS.TEXT};
          margin-bottom: ${THEME.SPACING.LARGE};
        }

        .employees-table-card {
          background-color: ${THEME.COLORS.BACKGROUND};
        }

        .table-actions {
          display: flex;
          gap: ${THEME.SPACING.SMALL};
        }

        .action-button {
          min-height: 44px;
          padding: ${THEME.SPACING.SMALL} ${THEME.SPACING.MEDIUM};
          border-radius: ${THEME.SPACING.SMALL};
          background-color: ${THEME.COLORS.PRIMARY};
          color: ${THEME.COLORS.CONTRAST.PRIMARY};
          border: none;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .action-button:hover {
          background-color: ${THEME.COLORS.PRIMARY_DARK};
        }

        .action-button:focus-visible {
          outline: 2px solid ${THEME.COLORS.PRIMARY};
          outline-offset: 2px;
        }

        @media (max-width: ${THEME.BREAKPOINTS.MOBILE}) {
          .employees-page {
            padding: ${THEME.SPACING.MEDIUM};
          }
        }
      `}</style>
    </ErrorBoundary>
  );
};

export default Employees;