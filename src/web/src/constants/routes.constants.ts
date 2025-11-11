/**
 * @fileoverview Route path constants and access control configurations for the Pre-paid Health Plan Onboarding Portal.
 * Implements role-based routing, MFA support, and secure path management.
 * @version 1.0.0
 */

import { UserRole } from '../types/auth.types';

/**
 * Interface defining route configuration structure with access control
 */
interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
  requiresMFA: boolean;
  isPublic: boolean;
}

/**
 * Authentication related route paths
 */
export const AUTH = {
  ROOT: '/auth',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  RESET_PASSWORD: '/auth/reset-password',
  MFA_SETUP: '/auth/mfa-setup',
  MFA_VERIFICATION: '/auth/mfa-verification',
  SESSION_EXPIRED: '/auth/session-expired',
  LOGOUT: '/auth/logout'
} as const;

/**
 * Administrator route paths
 */
export const ADMIN = {
  ROOT: '/admin',
  DASHBOARD: '/admin/dashboard',
  USERS: '/admin/users',
  USER_DETAILS: '/admin/users/:id',
  SETTINGS: '/admin/settings',
  SYSTEM_LOGS: '/admin/logs',
  ANALYTICS: '/admin/analytics',
  CONFIGURATIONS: '/admin/configurations'
} as const;

/**
 * Broker route paths
 */
export const BROKER = {
  ROOT: '/broker',
  DASHBOARD: '/broker/dashboard',
  ENROLLMENTS: '/broker/enrollments',
  NEW_ENROLLMENT: '/broker/enrollments/new',
  ENROLLMENT_DETAILS: '/broker/enrollments/:id',
  REPORTS: '/broker/reports',
  COMMISSION: '/broker/commission',
  CLIENTS: '/broker/clients',
  CLIENT_DETAILS: '/broker/clients/:id'
} as const;

/**
 * Beneficiary route paths
 */
export const BENEFICIARY = {
  ROOT: '/beneficiary',
  DASHBOARD: '/beneficiary/dashboard',
  HEALTH_ASSESSMENT: '/beneficiary/health-assessment',
  DOCUMENTS: '/beneficiary/documents',
  DOCUMENT_UPLOAD: '/beneficiary/documents/upload',
  PROFILE: '/beneficiary/profile',
  PAYMENT: '/beneficiary/payment',
  COVERAGE: '/beneficiary/coverage',
  DEPENDENTS: '/beneficiary/dependents'
} as const;

/**
 * HR Personnel route paths
 */
export const HR = {
  ROOT: '/hr',
  DASHBOARD: '/hr/dashboard',
  EMPLOYEES: '/hr/employees',
  EMPLOYEE_DETAILS: '/hr/employees/:id',
  REPORTS: '/hr/reports',
  BULK_ENROLLMENT: '/hr/bulk-enrollment',
  COMPANY_PROFILE: '/hr/company-profile',
  PLAN_MANAGEMENT: '/hr/plans'
} as const;

/**
 * Underwriter route paths
 */
export const UNDERWRITER = {
  ROOT: '/underwriter',
  DASHBOARD: '/underwriter/dashboard',
  RISK_ASSESSMENT: '/underwriter/risk-assessment',
  CASE_DETAILS: '/underwriter/cases/:id',
  POLICIES: '/underwriter/policies',
  POLICY_DETAILS: '/underwriter/policies/:id',
  REPORTS: '/underwriter/reports',
  GUIDELINES: '/underwriter/guidelines'
} as const;

/**
 * Parent/Guardian route paths
 */
export const PARENT_GUARDIAN = {
  ROOT: '/guardian',
  DASHBOARD: '/guardian/dashboard',
  DEPENDENTS: '/guardian/dependents',
  DEPENDENT_DETAILS: '/guardian/dependents/:id',
  HEALTH_ASSESSMENT: '/guardian/health-assessment/:id',
  DOCUMENTS: '/guardian/documents/:id',
  COVERAGE: '/guardian/coverage/:id'
} as const;

/**
 * Policy route paths
 */
export const POLICY_ROUTES = {
  BASE: '/policies',
  LIST: '/policies',
  DETAILS: '/policies/:id',
  CREATE: '/policies/new',
  EDIT: '/policies/:id/edit'
} as const;

/**
 * Error and system route paths
 */
export const ERROR = {
  NOT_FOUND: '/error/404',
  SERVER_ERROR: '/error/500',
  UNAUTHORIZED: '/error/403',
  FORBIDDEN: '/error/401',
  MAINTENANCE: '/error/maintenance',
  SESSION_TIMEOUT: '/error/session-timeout'
} as const;

/**
 * Combined route constants for export
 */
export const ROUTES = {
  ROOT: '/',
  AUTH,
  ADMIN,
  BROKER,
  BENEFICIARY,
  HR,
  UNDERWRITER,
  PARENT_GUARDIAN,
  POLICY_ROUTES,
  ERROR
} as const;

/**
 * Route access control configuration mapping paths to allowed roles
 */
export const ROUTE_ROLES: Record<string, RouteConfig> = {
  // Auth routes
  [AUTH.LOGIN]: {
    path: AUTH.LOGIN,
    allowedRoles: [],
    requiresMFA: false,
    isPublic: true
  },
  [AUTH.REGISTER]: {
    path: AUTH.REGISTER,
    allowedRoles: [],
    requiresMFA: false,
    isPublic: true
  },
  [AUTH.MFA_VERIFICATION]: {
    path: AUTH.MFA_VERIFICATION,
    allowedRoles: Object.values(UserRole),
    requiresMFA: false,
    isPublic: false
  },

  // Admin routes
  [ADMIN.ROOT]: {
    path: ADMIN.ROOT,
    allowedRoles: [UserRole.ADMINISTRATOR],
    requiresMFA: true,
    isPublic: false
  },
  [ADMIN.DASHBOARD]: {
    path: ADMIN.DASHBOARD,
    allowedRoles: [UserRole.ADMINISTRATOR],
    requiresMFA: true,
    isPublic: false
  },

  // Broker routes
  [BROKER.ROOT]: {
    path: BROKER.ROOT,
    allowedRoles: [UserRole.BROKER],
    requiresMFA: true,
    isPublic: false
  },
  [BROKER.ENROLLMENTS]: {
    path: BROKER.ENROLLMENTS,
    allowedRoles: [UserRole.BROKER],
    requiresMFA: true,
    isPublic: false
  },

  // Beneficiary routes
  [BENEFICIARY.ROOT]: {
    path: BENEFICIARY.ROOT,
    allowedRoles: [UserRole.BENEFICIARY],
    requiresMFA: false,
    isPublic: false
  },
  [BENEFICIARY.HEALTH_ASSESSMENT]: {
    path: BENEFICIARY.HEALTH_ASSESSMENT,
    allowedRoles: [UserRole.BENEFICIARY],
    requiresMFA: false,
    isPublic: false
  },

  // HR routes
  [HR.ROOT]: {
    path: HR.ROOT,
    allowedRoles: [UserRole.HR_PERSONNEL],
    requiresMFA: true,
    isPublic: false
  },
  [HR.EMPLOYEES]: {
    path: HR.EMPLOYEES,
    allowedRoles: [UserRole.HR_PERSONNEL],
    requiresMFA: true,
    isPublic: false
  },

  // Underwriter routes
  [UNDERWRITER.ROOT]: {
    path: UNDERWRITER.ROOT,
    allowedRoles: [UserRole.UNDERWRITER],
    requiresMFA: true,
    isPublic: false
  },
  [UNDERWRITER.RISK_ASSESSMENT]: {
    path: UNDERWRITER.RISK_ASSESSMENT,
    allowedRoles: [UserRole.UNDERWRITER],
    requiresMFA: true,
    isPublic: false
  },

  // Parent/Guardian routes
  [PARENT_GUARDIAN.ROOT]: {
    path: PARENT_GUARDIAN.ROOT,
    allowedRoles: [UserRole.PARENT_GUARDIAN],
    requiresMFA: false,
    isPublic: false
  },
  [PARENT_GUARDIAN.DEPENDENTS]: {
    path: PARENT_GUARDIAN.DEPENDENTS,
    allowedRoles: [UserRole.PARENT_GUARDIAN],
    requiresMFA: false,
    isPublic: false
  },

  // Error routes
  [ERROR.NOT_FOUND]: {
    path: ERROR.NOT_FOUND,
    allowedRoles: [],
    requiresMFA: false,
    isPublic: true
  },
  [ERROR.SERVER_ERROR]: {
    path: ERROR.SERVER_ERROR,
    allowedRoles: [],
    requiresMFA: false,
    isPublic: true
  }
} as const;