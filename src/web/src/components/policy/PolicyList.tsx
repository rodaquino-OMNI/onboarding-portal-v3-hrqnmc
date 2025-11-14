// @version React ^18.0.0
// @version react-i18next ^13.0.0
// @version date-fns ^2.30.0
// @version lodash ^4.17.21
// @version @rbac/core ^2.0.0

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isValid } from 'date-fns';
import { debounce } from 'lodash';
import DataTable, { DataTableColumn, DataTableProps } from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';
import { useNotification } from '../../hooks/useNotification';
import { Policy, PolicyStatus } from '../../types/policy.types';
import { DATE_TIME_FORMATS, THEME, ACCESSIBILITY } from '../../constants/app.constants';

// Constants
const PAGE_SIZE = 10;
const DEBOUNCE_DELAY = 300;
const MIN_SEARCH_CHARS = 3;

// Interfaces
interface PolicyListProps {
  enrollmentId: string;
  onPolicySelect: (policy: Policy) => void;
  className?: string;
  initialFilters?: PolicyFilters;
}

interface PolicyFilters {
  status?: PolicyStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

/**
 * PolicyList component displays a paginated, filterable list of health insurance policies
 * with role-based access controls and accessibility features.
 */
const PolicyList: React.FC<PolicyListProps> = ({
  enrollmentId,
  onPolicySelect,
  className,
  initialFilters
}) => {
  // Hooks
  const { t } = useTranslation();
  const { showError } = useNotification();
  const abortControllerRef = useRef<AbortController>();

  // State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<PolicyFilters>(initialFilters || {});

  // Memoized table columns with accessibility and role-based visibility
  const columns: DataTableColumn<Policy>[] = React.useMemo(() => [
    {
      key: 'policyNumber' as keyof Policy,
      header: t('policy.number'),
      width: '150px',
      sortable: true,
      filterable: true,
      filterType: 'text',
      ariaLabel: t('aria.policy.number'),
    },
    {
      key: 'status' as keyof Policy,
      header: t('policy.status'),
      width: '120px',
      sortable: true,
      filterable: true,
      filterType: 'status',
      render: (row: Policy) => (
        <StatusBadge
          status={row.status}
          type="policy"
          size="small"
        />
      ),
      ariaLabel: t('aria.policy.status'),
    },
    {
      key: 'effectiveDate' as keyof Policy,
      header: t('policy.effectiveDate'),
      width: '150px',
      sortable: true,
      filterable: true,
      filterType: 'date',
      render: (row: Policy) => (
        isValid(row.effectiveDate)
          ? format(row.effectiveDate, DATE_TIME_FORMATS.SHORT_DATE)
          : '-'
      ),
      ariaLabel: t('aria.policy.effectiveDate'),
    },
    {
      key: 'monthlyPremium' as keyof Policy,
      header: t('policy.premium'),
      width: '120px',
      sortable: true,
      render: (row: Policy) => (
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(row.monthlyPremium)
      ),
      ariaLabel: t('aria.policy.premium'),
    },
    {
      key: 'coverageDetails' as keyof Policy,
      header: t('policy.coverage'),
      width: '120px',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.values(PolicyStatus).map(status => ({
        value: status,
        label: t(`policy.status.${status.toLowerCase()}`)
      })),
      render: (row: Policy) => row.coverageDetails?.coverageTier || '-',
      ariaLabel: t('aria.policy.coverage'),
    }
  ], [t]);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      if (searchTerm.length >= MIN_SEARCH_CHARS || searchTerm.length === 0) {
        setFilters(prev => ({ ...prev, search: searchTerm }));
        setCurrentPage(1);
      }
    }, DEBOUNCE_DELAY),
    []
  );

  // Fetch policies with error handling
  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);

      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // API call would go here
      // const response = await fetchPoliciesAPI({
      //   enrollmentId,
      //   page: currentPage,
      //   pageSize: PAGE_SIZE,
      //   filters,
      //   signal: abortControllerRef.current.signal
      // });

      // Simulated response
      const mockPolicies: Policy[] = [];
      setTotalItems(mockPolicies.length);
      setPolicies(mockPolicies);
    } catch (error) {
      if (error.name !== 'AbortError') {
        showError(t('error.fetchPolicies'));
        console.error('Error fetching policies:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, currentPage, filters, showError, t]);

  // Initial fetch and cleanup
  useEffect(() => {
    fetchPolicies();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchPolicies]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  return (
    <div 
      className={className}
      role="region"
      aria-label={t('aria.policyList')}
    >
      <DataTable<Policy>
        columns={columns}
        data={policies}
        loading={loading}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onFilterChange={handleFilterChange}
        onRowClick={onPolicySelect}
        serverSide={true}
        emptyMessage={t('policy.noResults')}
        ariaLabel={t('aria.policyTable')}
      />
    </div>
  );
};

export default PolicyList;