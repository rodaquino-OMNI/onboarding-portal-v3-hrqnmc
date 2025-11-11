/**
 * Type Guard Utilities
 * Version: 1.0.0
 *
 * Provides runtime type checking and conversion utilities for
 * UserRole enums and Brazilian state codes to ensure type safety.
 */

import { UserRole } from '../types/auth.types';

/**
 * Brazilian state codes as a const array for type inference
 */
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

/**
 * Brazilian state union type derived from the const array
 */
export type BrazilianState = typeof BRAZILIAN_STATES[number];

/**
 * Type guard to check if a value is a valid UserRole
 * @param value - Value to check
 * @returns True if value is a valid UserRole, with type predicate
 */
export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

/**
 * Type guard to check if a value is a valid Brazilian state code
 * @param value - Value to check
 * @returns True if value is a valid state code, with type predicate
 */
export function isBrazilianState(value: string): value is BrazilianState {
  return BRAZILIAN_STATES.includes(value as BrazilianState);
}

/**
 * Converts a string to UserRole if valid, otherwise returns null
 * @param value - String value to convert
 * @returns UserRole if valid, null otherwise
 */
export function toUserRole(value: string): UserRole | null {
  return isUserRole(value) ? value : null;
}

/**
 * Converts a string to BrazilianState if valid, otherwise returns null
 * @param value - String value to convert
 * @returns BrazilianState if valid, null otherwise
 */
export function toBrazilianState(value: string): BrazilianState | null {
  return isBrazilianState(value) ? value : null;
}

/**
 * Converts an array of strings to an array of UserRoles,
 * filtering out invalid values
 * @param values - Array of string values to convert
 * @returns Array of valid UserRole values
 */
export function toUserRoleArray(values: string[]): UserRole[] {
  return values
    .map(toUserRole)
    .filter((role): role is UserRole => role !== null);
}

/**
 * Converts an array of strings to an array of BrazilianStates,
 * filtering out invalid values
 * @param values - Array of string values to convert
 * @returns Array of valid BrazilianState values
 */
export function toBrazilianStateArray(values: string[]): BrazilianState[] {
  return values
    .map(toBrazilianState)
    .filter((state): state is BrazilianState => state !== null);
}

/**
 * Safely converts enum values to typed array
 * Useful for converting Object.values(UserRole) to UserRole[]
 * @param enumObj - Enum object (e.g., UserRole)
 * @returns Typed array of enum values
 */
export function enumToArray<T extends Record<string, string>>(enumObj: T): T[keyof T][] {
  return Object.values(enumObj) as T[keyof T][];
}

/**
 * Type guard to check if an array contains only valid UserRoles
 * @param values - Array to check
 * @returns True if all values are UserRole, with type predicate
 */
export function isUserRoleArray(values: unknown[]): values is UserRole[] {
  return Array.isArray(values) && values.every(v => typeof v === 'string' && isUserRole(v));
}

/**
 * Type guard to check if an array contains only valid BrazilianStates
 * @param values - Array to check
 * @returns True if all values are BrazilianState, with type predicate
 */
export function isBrazilianStateArray(values: unknown[]): values is BrazilianState[] {
  return Array.isArray(values) && values.every(v => typeof v === 'string' && isBrazilianState(v));
}
