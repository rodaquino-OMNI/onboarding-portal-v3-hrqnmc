// @ts-check
import { JwtPayload } from 'jwt-decode'; // v3.1.2

/**
 * Enumeration of available user roles in the system with strict access levels
 */
export enum UserRole {
  ADMINISTRATOR = 'ADMINISTRATOR',
  UNDERWRITER = 'UNDERWRITER',
  BROKER = 'BROKER',
  HR_PERSONNEL = 'HR_PERSONNEL',
  BENEFICIARY = 'BENEFICIARY',
  PARENT_GUARDIAN = 'PARENT_GUARDIAN'
}

/**
 * Enumeration of possible authentication error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_INVALID = 'MFA_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SESSION_EXPIRED = 'SESSION_EXPIRED'
}

/**
 * Interface representing a user in the system with LGPD compliance fields
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string; // Full name (for display purposes)
  cpf: string;
  role: UserRole;
  mfaEnabled: boolean;
  phoneNumber: string;
  isActive: boolean;
  permissions: string[];
  dataConsentGiven: boolean;
  dataConsentDate: Date;
  lastLoginIp: string;
  deviceFingerprint: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  passwordLastChanged: Date;
  failedLoginAttempts: number;
  avatarUrl?: string;
  dateOfBirth?: Date; // Date of birth for beneficiaries
  address?: string; // User address
}

/**
 * Interface for login request payload with MFA support
 */
export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  deviceFingerprint: string;
  ipAddress: string;
}

/**
 * Interface for login response data with enhanced security
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requiresMFA: boolean;
  sessionExpiresIn: number;
  grantedPermissions: string[];
  sessionToken?: string;
}

/**
 * Interface for MFA verification request
 */
export interface MFARequest {
  mfaCode: string;
  sessionToken: string;
  deviceFingerprint: string;
}

/**
 * Interface for authentication state management
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  requiresMFA: boolean;
  error: AuthError | null;
  isSessionExpired: boolean;
  sessionExpiresAt: number;
}

/**
 * Interface extending JwtPayload for decoded auth tokens
 */
export interface DecodedToken extends JwtPayload {
  sub: string;
  role: UserRole;
  permissions: string[];
  sessionId: string;
  deviceFingerprint: string;
  exp: number;
  iat: number;
}

/**
 * Type for authentication error responses with detailed information
 */
export type AuthError = {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, string>;
  timestamp: Date;
  requestId: string;
};

/**
 * Type mapping roles to their permissions with hierarchical support
 */
export type RolePermissions = Record<UserRole, string[]>;

/**
 * Type for tracking session information
 */
export type SessionInfo = {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  deviceInfo: Record<string, string>;
};

/**
 * Security context for authentication with device tracking
 */
export interface SecurityContext {
  sessionId: string;
  deviceFingerprint: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  geolocation?: {
    country: string;
    city: string;
  };
}

/**
 * Device information for security tracking
 */
export interface DeviceInfo {
  fingerprint: string;
  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
  screenResolution: string;
}

/**
 * Session configuration options
 */
export interface SessionConfig {
  sessionTimeout: number;
  maxConcurrentSessions: number;
  requireMFA: boolean;
  allowRememberMe: boolean;
  idleTimeout: number;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  isValid: boolean;
  expired: boolean;
  requiresRefresh: boolean;
  user?: User;
  error?: string;
  remainingTime?: number;
}