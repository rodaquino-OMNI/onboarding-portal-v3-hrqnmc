// @version React ^18.0.0
// @version classnames ^2.3.2
// @version react-i18next ^13.0.0
// @version @tanstack/react-virtual ^3.0.0
// @version use-debounce ^9.0.0

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from 'use-debounce';
import type { TableColumn } from './Table';
import { Table } from './Table';
import Loading from './Loading';
import StatusBadge from './StatusBadge';

// Extended column interface with filtering and accessibility support
export interface DataTableColumn<T> extends TableColumn<T> {
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date' | 'status' | 'number';
  filterOptions?: Array<{ value: string; label: string }>;
  ariaLabel?: string;
  virtualizable?: boolean;
}

// Props interface for the DataTable component
export interface DataTableProps<T extends object> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  totalItems?: number;
  pageSize?: number;
  currentPage?: number;
  serverSide?: boolean;
  onPageChange?: (page: number) => void;
  onFilterChange?: (filters: Record<string, any>) => void;
  onSortChange?: (sortBy: keyof T, sortOrder: 'asc' | 'desc') => void;
  virtualScroll?: boolean;
  emptyMessage?: string;
  className?: string;
  ariaLabel?: string;
}

// Custom hook for managing table state
const useDataTableState = <T extends object>({
  onFilterChange,
  onSortChange,
  onPageChange,
  serverSide,
  pageSize = 10,
}: Pick<DataTableProps<T>, 'onFilterChange' | 'onSortChange' | 'onPageChange' | 'serverSide' | 'pageSize'>) => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [debouncedFilters] = useDebounce(filters, 300);
  const [sortBy, setSortBy] = useState<keyof T | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Handle filter changes with debounce
  useEffect(() => {
    if (serverSide && onFilterChange) {
      onFilterChange(debouncedFilters);
    }
  }, [debouncedFilters, onFilterChange, serverSide]);

  // Handle sort changes
  const handleSort = useCallback((key: keyof T, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    if (serverSide && onSortChange) {
      onSortChange(key, order);
    }
  }, [serverSide, onSortChange]);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    if (serverSide && onPageChange) {
      onPageChange(page);
    }
  }, [serverSide, onPageChange]);

  return {
    filters,
    setFilters,
    sortBy,
    sortOrder,
    handleSort,
    currentPage,
    handlePageChange,
    pageSize,
  };
};

// Filter input renderer with accessibility support
const renderFilter = <T extends object>({
  column,
  currentFilters,
  onFilterChange,
}: {
  column: DataTableColumn<T>;
  currentFilters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
}) => {
  const { t } = useTranslation();
  const key = String(column.key);

  if (!column.filterable) return null;

  const handleFilterChange = (value: any) => {
    onFilterChange({ ...currentFilters, [key]: value });
  };

  switch (column.filterType) {
    case 'select':
      return (
        <select
          value={currentFilters[key] || ''}
          onChange={(e) => handleFilterChange(e.target.value)}
          aria-label={t('aria.filter.select', { column: column.ariaLabel || column.header })}
          className="data-table-filter-select"
        >
          <option value="">{t('filter.all')}</option>
          {column.filterOptions?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'status':
      return (
        <StatusBadge
          status={currentFilters[key]}
          type="enrollment"
          className="data-table-filter-status"
          size="small"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={currentFilters[key] || ''}
          onChange={(e) => handleFilterChange(e.target.value)}
          aria-label={t('aria.filter.date', { column: column.ariaLabel || column.header })}
          className="data-table-filter-date"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={currentFilters[key] || ''}
          onChange={(e) => handleFilterChange(e.target.value)}
          aria-label={t('aria.filter.number', { column: column.ariaLabel || column.header })}
          className="data-table-filter-number"
        />
      );

    default:
      return (
        <input
          type="text"
          value={currentFilters[key] || ''}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder={t('filter.search')}
          aria-label={t('aria.filter.text', { column: column.ariaLabel || column.header })}
          className="data-table-filter-text"
        />
      );
  }
};

export const DataTable = <T extends object>({
  columns,
  data,
  loading = false,
  totalItems,
  pageSize = 10,
  currentPage: controlledPage,
  serverSide = false,
  onPageChange,
  onFilterChange,
  onSortChange,
  virtualScroll = false,
  emptyMessage,
  className,
  ariaLabel,
}: DataTableProps<T>): React.ReactElement => {
  const { t } = useTranslation();
  const parentRef = React.useRef<HTMLDivElement>(null);

  const {
    filters,
    setFilters,
    sortBy,
    sortOrder,
    handleSort,
    currentPage,
    handlePageChange,
  } = useDataTableState({
    onFilterChange,
    onSortChange,
    onPageChange,
    serverSide,
    pageSize,
  });

  // Virtual scroll configuration
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Estimated row height
    overscan: 5,
  });

  // Memoized filtered and sorted data for client-side operations
  const processedData = useMemo(() => {
    if (serverSide) return data;

    let result = [...data];

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter((item) => {
          const itemValue = item[key as keyof T];
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        return sortOrder === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }

    return result;
  }, [data, filters, sortBy, sortOrder, serverSide]);

  // Render loading state
  if (loading) {
    return <Loading size="lg" />;
  }

  return (
    <div className={classNames('data-table-container', className)}>
      {/* Filter section */}
      <div className="data-table-filters">
        {columns
          .filter((column) => column.filterable)
          .map((column) => (
            <div key={String(column.key)} className="data-table-filter">
              <label className="data-table-filter-label">
                {column.header}
                {renderFilter({ column, currentFilters: filters, onFilterChange: setFilters })}
              </label>
            </div>
          ))}
      </div>

      {/* Table section */}
      <div
        ref={parentRef}
        className={classNames('data-table-content', { 'data-table-virtual': virtualScroll })}
      >
        <Table<T>
          columns={columns}
          data={processedData}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          virtualizeRows={virtualScroll}
          ariaLabel={ariaLabel}
          emptyMessage={emptyMessage || t('table.noData')}
        />
      </div>

      {/* Pagination section */}
      {!virtualScroll && (
        <div className="data-table-pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={t('pagination.previous')}
            className="data-table-pagination-button"
          >
            {t('pagination.previous')}
          </button>
          <span className="data-table-pagination-info">
            {t('pagination.info', {
              current: currentPage,
              total: Math.ceil((totalItems || processedData.length) / pageSize),
            })}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage * pageSize >= (totalItems || processedData.length)}
            aria-label={t('pagination.next')}
            className="data-table-pagination-button"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
};

export default DataTable;