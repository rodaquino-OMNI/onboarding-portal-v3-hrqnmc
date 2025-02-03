/**
 * Authentication Configuration File
 * Version: 1.0.0
 * 
 * This file defines core authentication settings, token management rules,
 * MFA requirements, and session timeouts for different user roles.
 * Implements LGPD compliance and robust security measures.
 */

import { UserRole } from '../types/auth.types';
import jwtDecode from 'jwt-decode'; // v3.1.2

// Secure storage keys for authentication data
export const TOKEN_KEY = 'austa_auth_token';
export const USER_KEY = 'austa_user_data';
export const MFA_SESSION_KEY = 'austa_mfa_session';

/**
 * Interface for password policy configuration
 */
interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number;
  preventReuse: number;
  complexityScore: number;
}

/**
 * Core authentication configuration object implementing security requirements
 * and role-based authentication settings as per technical specifications
 */
export const AUTH_CONFIG = {
  // Role-specific token expiration times in milliseconds
  tokenExpirationTime: {
    [UserRole.ADMINISTRATOR]: 4 * 60 * 60 * 1000,  // 4 hours
    [UserRole.UNDERWRITER]: 4 * 60 * 60 * 1000,    // 4 hours
    [UserRole.BROKER]: 8 * 60 * 60 * 1000,         // 8 hours
    [UserRole.HR_PERSONNEL]: 8 * 60 * 60 * 1000,   // 8 hours
    [UserRole.BENEFICIARY]: 30 * 60 * 1000,        // 30 minutes
    [UserRole.PARENT_GUARDIAN]: 30 * 60 * 1000     // 30 minutes
  },

  // Role-specific MFA requirements
  mfaSettings: {
    [UserRole.ADMINISTRATOR]: true,
    [UserRole.UNDERWRITER]: true,
    [UserRole.BROKER]: true,
    [UserRole.HR_PERSONNEL]: true,
    [UserRole.BENEFICIARY]: false,
    [UserRole.PARENT_GUARDIAN]: false
  },

  // MFA configuration
  mfaTimeoutSeconds: 300,           // 5 minutes to complete MFA
  mfaRetryLimit: 3,                 // Maximum MFA attempt failures
  mfaBlockDurationMinutes: 30,      // Block duration after max retries

  // Login security settings
  maxLoginAttempts: 5,              // Maximum failed login attempts
  lockoutDurationMinutes: 15,       // Account lockout duration

  // Password policy configuration
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90,                     // Password expiration in days
    preventReuse: 5,                // Number of previous passwords to prevent reuse
    complexityScore: 3              // Minimum password complexity score
  } as PasswordPolicyConfig,

  // Token and session management
  tokenRefreshThreshold: 5 * 60 * 1000,      // Refresh token 5 minutes before expiration
  sessionInactivityTimeout: 15 * 60 * 1000,  // Session timeout after 15 minutes of inactivity
  tokenRotationEnabled: true,                // Enable token rotation for enhanced security
  secureTokenStorage: true,                  // Use secure storage for tokens

  // Audit and logging
  auditLogEnabled: true                      // Enable authentication audit logging
} as const;

// Type assertion to ensure configuration object is read-only
Object.freeze(AUTH_CONFIG);