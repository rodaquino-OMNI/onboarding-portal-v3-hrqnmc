// @version React ^18.0.0
// @version classnames ^2.3.2

import React, { useCallback, useMemo, useRef } from 'react';
import classNames from 'classnames';

// Type definitions
export type SortOrder = 'asc' | 'desc';

export interface TableColumn<T extends object> {
  key: keyof T;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  ariaLabel?: string;
}

export interface TableProps<T extends object> {
  columns: TableColumn<T>[];
  data: T[];
  sortBy?: keyof T;
  sortOrder?: SortOrder;
  onSort?: (key: keyof T, order: SortOrder) => void;
  onRowClick?: (row: T) => void;
  selectedRows?: Array<keyof T>;
  onRowSelect?: (rowKey: keyof T) => void;
  virtualizeRows?: boolean;
  ariaLabel?: string;
  className?: string;
  emptyMessage?: string;
}

export const Table = <T extends object>({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  selectedRows = [],
  onRowSelect,
  virtualizeRows = false,
  ariaLabel,
  className,
  emptyMessage = 'No data available'
}: TableProps<T>): React.ReactElement => {
  const tableRef = useRef<HTMLTableElement>(null);

  // Memoized sort indicator component
  const SortIndicator = useMemo(() => {
    return ({ active, direction }: { active: boolean; direction?: SortOrder }) => (
      <span 
        className={classNames('table-sort-indicator', { active })}
        aria-hidden="true"
      >
        {direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  }, []);

  // Header cell click handler with keyboard support
  const handleHeaderClick = useCallback((column: TableColumn<T>) => {
    if (!column.sortable || !onSort) return;

    const newOrder: SortOrder = 
      sortBy === column.key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newOrder);
  }, [sortBy, sortOrder, onSort]);

  // Render header cell with accessibility attributes
  const renderHeaderCell = useCallback((column: TableColumn<T>) => {
    const isSorted = sortBy === column.key;
    const ariaSort: 'ascending' | 'descending' | undefined =
      isSorted ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined;
    const headerProps: React.ThHTMLAttributes<HTMLTableHeaderCellElement> = {
      className: classNames('table-header-cell', {
        'sortable': column.sortable,
        'sorted': isSorted
      }),
      style: column.width ? { width: column.width } : undefined,
      onClick: () => column.sortable && handleHeaderClick(column),
      onKeyDown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          column.sortable && handleHeaderClick(column);
        }
      },
      role: column.sortable ? 'columnheader button' : 'columnheader',
      tabIndex: column.sortable ? 0 : undefined,
      'aria-sort': ariaSort,
      'aria-label': column.ariaLabel || column.header
    };

    return (
      <th key={String(column.key)} {...headerProps}>
        {column.header}
        {column.sortable && (
          <SortIndicator 
            active={isSorted} 
            direction={isSorted ? sortOrder : undefined} 
          />
        )}
      </th>
    );
  }, [sortBy, sortOrder, handleHeaderClick, SortIndicator]);

  // Row click handler with keyboard support
  const handleRowClick = useCallback((row: T, event: React.MouseEvent | React.KeyboardEvent) => {
    if (event.type === 'keydown' && (event as React.KeyboardEvent).key !== 'Enter') {
      return;
    }
    onRowClick?.(row);
  }, [onRowClick]);

  // Row selection handler
  const handleRowSelect = useCallback((row: T, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const firstKey = Object.keys(row)[0] as keyof T;
    onRowSelect?.(firstKey);
  }, [onRowSelect]);

  // Render table cell with custom rendering support
  const renderCell = useCallback((row: T, column: TableColumn<T>) => {
    const value = column.render ? column.render(row) : row[column.key];
    return (
      <td
        key={String(column.key)}
        className="table-cell"
        style={column.width ? { width: column.width } : undefined}
      >
        {value as React.ReactNode}
      </td>
    );
  }, []);

  // Render table row with selection and accessibility support
  const renderRow = useCallback((row: T, index: number) => {
    const rowKeyName = Object.keys(row)[0] as keyof T;
    const rowKey = row[rowKeyName];
    const isSelected = selectedRows.includes(rowKeyName);

    const rowProps: React.HTMLAttributes<HTMLTableRowElement> = {
      className: classNames('table-row', {
        'selected': isSelected,
        'clickable': !!onRowClick
      }),
      onClick: (e) => onRowClick && handleRowClick(row, e),
      onKeyDown: (e) => onRowClick && handleRowClick(row, e),
      role: onRowClick ? 'button' : undefined,
      tabIndex: onRowClick ? 0 : undefined,
      'aria-selected': isSelected
    };

    return (
      <tr key={String(rowKey)} {...rowProps}>
        {onRowSelect && (
          <td className="table-cell selection-cell">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleRowSelect(row, e)}
              aria-label={`Select row ${index + 1}`}
            />
          </td>
        )}
        {columns.map((column) => renderCell(row, column))}
      </tr>
    );
  }, [columns, selectedRows, onRowClick, onRowSelect, handleRowClick, handleRowSelect, renderCell]);

  // Empty state rendering
  const renderEmptyState = useCallback(() => (
    <tr>
      <td 
        colSpan={columns.length + (onRowSelect ? 1 : 0)}
        className="table-empty-state"
      >
        {emptyMessage}
      </td>
    </tr>
  ), [columns.length, onRowSelect, emptyMessage]);

  return (
    <div className="table-container">
      <table
        ref={tableRef}
        className={classNames('table', className)}
        role="grid"
        aria-label={ariaLabel}
      >
        <thead>
          <tr>
            {onRowSelect && (
              <th className="table-header-cell selection-cell">
                <span className="sr-only">Selection column</span>
              </th>
            )}
            {columns.map(renderHeaderCell)}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map((row, index) => renderRow(row, index)) : renderEmptyState()}
        </tbody>
      </table>
    </div>
  );
};

export default Table;