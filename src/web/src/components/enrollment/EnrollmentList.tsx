import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // v13.0.0
import { useErrorBoundary } from 'react-error-boundary'; // v4.0.11
import { format } from 'date-fns'; // v2.30.0
import { useRoleBasedAccess } from '../../hooks/useRoleBasedAccess';

import DataTable, { DataTableColumn } from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';
import Loading from '../common/Loading';
import EnrollmentService from '../../services/enrollment.service';

import { 
  EnrollmentSummary, 
  EnrollmentStatus, 
  EnrollmentFilters 
} from '../../types/enrollment.types';
import { RiskLevel } from '../../types/health.types';

interface EnrollmentListProps {
  brokerId?: string;
  onEnrollmentSelect?: (enrollment: EnrollmentSummary) => void;
  className?: string;
  initialFilters?: EnrollmentFilters;
}

// Data masking patterns for LGPD compliance
const MASKING_PATTERNS = {
  CPF: (value: string) => value.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.***.***-$4'),
  NAME: (value: string) => {
    const parts = value.split(' ');
    return `${parts[0]} ${parts.slice(1).map(p => '*'.repeat(p.length)).join(' ')}`;
  }
};

export const EnrollmentList: React.FC<EnrollmentListProps> = ({
  brokerId,
  onEnrollmentSelect,
  className,
  initialFilters
}) => {
  const { t } = useTranslation();
  const { showBoundary } = useErrorBoundary();
  const { hasPermission } = useRoleBasedAccess();

  // State management
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<EnrollmentFilters>(initialFilters || {});

  // Services initialization
  const enrollmentService = useMemo(() => new EnrollmentService(), []);

  // Fetch enrollments with error handling and retry logic
  const fetchEnrollments = useCallback(async (page: number, currentFilters: EnrollmentFilters) => {
    try {
      setLoading(true);
      const response = await enrollmentService.getEnrollments(
        { ...currentFilters, brokerId },
        page,
        10
      );
      setEnrollments(response.data);
      setTotalItems(response.total);
    } catch (error) {
      showBoundary(error);
    } finally {
      setLoading(false);
    }
  }, [enrollmentService, brokerId, showBoundary]);

  // Initial data load
  useEffect(() => {
    fetchEnrollments(currentPage, filters);
  }, [fetchEnrollments, currentPage, filters]);

  // Table columns configuration with role-based access
  const columns: DataTableColumn<EnrollmentSummary>[] = useMemo(() => [
    {
      key: 'beneficiaryName',
      header: t('enrollment.list.name'),
      render: (row) => hasPermission('VIEW_FULL_NAME') 
        ? row.beneficiaryName 
        : MASKING_PATTERNS.NAME(row.beneficiaryName),
      filterable: true,
      filterType: 'text',
      sortable: true
    },
    {
      key: 'cpf',
      header: t('enrollment.list.cpf'),
      render: (row) => hasPermission('VIEW_CPF') 
        ? row.cpf 
        : MASKING_PATTERNS.CPF(row.cpf),
      filterable: true,
      filterType: 'text'
    },
    {
      key: 'status',
      header: t('enrollment.list.status'),
      render: (row) => (
        <StatusBadge 
          status={row.status} 
          type="enrollment"
          size="small"
        />
      ),
      filterable: true,
      filterType: 'select',
      filterOptions: Object.values(EnrollmentStatus).map(status => ({
        value: status,
        label: t(`enrollment.status.${status.toLowerCase()}`)
      }))
    },
    {
      key: 'createdAt',
      header: t('enrollment.list.createdAt'),
      render: (row) => format(new Date(row.createdAt), 'dd/MM/yyyy HH:mm'),
      filterable: true,
      filterType: 'date',
      sortable: true
    },
    {
      key: 'riskLevel',
      header: t('enrollment.list.riskLevel'),
      render: (row) => hasPermission('VIEW_RISK_LEVEL') ? (
        <span className={`risk-level risk-level--${row.riskLevel.toLowerCase()}`}>
          {t(`enrollment.riskLevel.${row.riskLevel.toLowerCase()}`)}
        </span>
      ) : null,
      filterable: hasPermission('VIEW_RISK_LEVEL'),
      filterType: 'select',
      filterOptions: Object.values(RiskLevel).map(level => ({
        value: level,
        label: t(`enrollment.riskLevel.${level.toLowerCase()}`)
      }))
    }
  ], [t, hasPermission]);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
    setCurrentPage(1);
  }, []);

  // Handle row selection
  const handleRowClick = useCallback((row: EnrollmentSummary) => {
    if (onEnrollmentSelect && hasPermission('VIEW_ENROLLMENT_DETAILS')) {
      onEnrollmentSelect(row);
    }
  }, [onEnrollmentSelect, hasPermission]);

  if (loading && !enrollments.length) {
    return <Loading size="lg" />;
  }

  return (
    <div className={className}>
      <DataTable<EnrollmentSummary>
        columns={columns}
        data={enrollments}
        loading={loading}
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={10}
        serverSide={true}
        onPageChange={handlePageChange}
        onFilterChange={handleFilterChange}
        onRowClick={handleRowClick}
        emptyMessage={t('enrollment.list.noData')}
        className="enrollment-list-table"
        ariaLabel={t('enrollment.list.ariaLabel')}
      />
    </div>
  );
};

export default EnrollmentList;