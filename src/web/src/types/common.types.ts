/**
 * Common TypeScript types used across the application
 * Version: 1.0.0
 */

/**
 * Generic Result type for operations that can succeed or fail
 * Provides a discriminated union for type-safe error handling
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Generic success result
 */
export type Success<T> = { success: true; data: T };

/**
 * Generic failure result
 */
export type Failure<E = Error> = { success: false; error: E };

/**
 * Void result for operations that don't return data
 */
export type VoidResult<E = Error> = Result<void, E>;

/**
 * Optional result that can be null
 */
export type OptionalResult<T, E = Error> = Result<T | null, E>;

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard to check if result is failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Sort order type
 */
export type SortOrder = 'asc' | 'desc' | 'none';

/**
 * Sort configuration
 */
export interface SortConfig<T = any> {
  field: keyof T;
  order: SortOrder;
}

/**
 * Filter operator type
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';

/**
 * Filter configuration
 */
export interface FilterConfig<T = any> {
  field: keyof T;
  operator: FilterOperator;
  value: any;
}

/**
 * Generic entity with ID
 */
export interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generic audit fields
 */
export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Loading state type
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Async operation state
 */
export interface AsyncState<T = any, E = Error> {
  data: T | null;
  loading: boolean;
  error: E | null;
}

/**
 * Key-value pair type
 */
export interface KeyValuePair<K = string, V = any> {
  key: K;
  value: V;
}

/**
 * Generic options type
 */
export interface Option<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null;

/**
 * Optional type helper
 */
export type Optional<T> = T | undefined;

/**
 * Deep partial type helper
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Required fields type helper
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Omit multiple fields type helper
 */
export type OmitMultiple<T, K extends keyof T> = Omit<T, K>;

/**
 * Pick multiple fields type helper
 */
export type PickMultiple<T, K extends keyof T> = Pick<T, K>;
