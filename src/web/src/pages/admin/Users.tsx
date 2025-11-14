/**
 * Users Management Page Component
 * Version: 1.0.0
 * 
 * Implements secure user management interface for administrators with
 * role-based access control and LGPD compliance features.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import debounce from 'lodash/debounce';

import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { authService } from '../../services/auth.service';
import { UserRole, User, AuthError } from '../../types/auth.types';
import { ApiError } from '../../types/api.types';
import { enumToArray } from '../../utils/type-guards.utils';

// Enhanced interface for user table data with LGPD compliance
interface UserTableData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  lastLogin: Date;
  mfaEnabled: boolean;
  dataConsentStatus: boolean;
  securityLevel: number;
}

// Security context for user management operations
interface SecurityContext {
  sessionId: string;
  deviceId: string;
  timestamp: number;
}

// Interface for audit log entries
interface AuditEntry {
  timestamp: Date;
  action: string;
  userId: string;
  details: Record<string, any>;
}

const Users: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserTableData[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [securityContext, setSecurityContext] = useState<SecurityContext | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<AuthError | null>(null);

  // Validate admin access and initialize security context
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser || !await authService.validateAdminAccess(currentUser.id)) {
          throw new Error('INSUFFICIENT_PERMISSIONS');
        }

        const context = await authService.getSecurityContext();
        setSecurityContext(context);
        
        await fetchUsers(1, {});
      } catch (error) {
        setError(error as AuthError);
        setLoading(false);
      }
    };

    initializeComponent();
  }, []);

  // Fetch users with security validation and LGPD compliance
  const fetchUsers = async (page: number, filterParams: Record<string, any>) => {
    try {
      setLoading(true);

      if (!securityContext) {
        throw new Error('INVALID_SECURITY_CONTEXT');
      }

      const response = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Security-Context': JSON.stringify(securityContext)
        },
        body: JSON.stringify({
          page,
          filters: filterParams,
          includeInactive: filterParams.showInactive || false
        })
      });

      if (!response.ok) {
        throw new Error('FETCH_USERS_FAILED');
      }

      const { data, total, audit } = await response.json();
      
      // Apply LGPD data masking
      const maskedData = data.map((user: UserTableData) => ({
        ...user,
        email: maskSensitiveData(user.email),
        name: maskSensitiveData(user.name)
      }));

      setUsers(maskedData);
      setTotalUsers(total);
      setAuditLog(audit);
      setCurrentPage(page);
    } catch (error) {
      setError(error as AuthError);
    } finally {
      setLoading(false);
    }
  };

  // Debounced filter handler
  const handleFilterChange = debounce((newFilters: Record<string, any>) => {
    setFilters(newFilters);
    fetchUsers(1, newFilters);
  }, 300);

  // Secure status change handler with audit logging
  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      if (!securityContext) {
        throw new Error('INVALID_SECURITY_CONTEXT');
      }

      await authService.updateUserStatus(userId, newStatus, securityContext);
      
      // Optimistic update with rollback
      const previousUsers = [...users];
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: newStatus as UserTableData['status'] } : user
      ));

      try {
        await fetchUsers(currentPage, filters);
      } catch {
        setUsers(previousUsers);
        throw new Error('STATUS_UPDATE_FAILED');
      }
    } catch (error) {
      setError(error as AuthError);
    }
  };

  // Table columns configuration with security controls
  const columns = [
    {
      key: 'name',
      header: t('users.name'),
      filterable: true,
      filterType: 'text' as const
    },
    {
      key: 'email',
      header: t('users.email'),
      filterable: true,
      filterType: 'text' as const
    },
    {
      key: 'role',
      header: t('users.role'),
      filterable: true,
      filterType: 'select' as const,
      filterOptions: enumToArray(UserRole).map(role => ({
        value: role,
        label: t(`roles.${role.toLowerCase()}`)
      }))
    },
    {
      key: 'status',
      header: t('users.status'),
      filterable: true,
      filterType: 'select' as const,
      render: (user: UserTableData) => (
        <StatusBadge
          status={user.status}
          type="enrollment"
          className="user-status-badge"
        />
      )
    },
    {
      key: 'mfaEnabled',
      header: t('users.mfa'),
      render: (user: UserTableData) => (
        <span className={`mfa-status ${user.mfaEnabled ? 'enabled' : 'disabled'}`}>
          {user.mfaEnabled ? t('common.enabled') : t('common.disabled')}
        </span>
      )
    },
    {
      key: 'lastLogin',
      header: t('users.lastLogin'),
      render: (user: UserTableData) => (
        new Date(user.lastLogin).toLocaleString()
      )
    }
  ];

  // Mask sensitive data according to LGPD requirements
  const maskSensitiveData = (data: string): string => {
    if (!data) return '';
    if (data.includes('@')) {
      const [local, domain] = data.split('@');
      return `${local.charAt(0)}***@${domain}`;
    }
    return `${data.charAt(0)}***${data.charAt(data.length - 1)}`;
  };

  return (
    <div className="users-page">
      <h1>{t('users.title')}</h1>
      
      {error && (
        <div className="error-message" role="alert">
          {t(`errors.${error.code.toLowerCase()}`, { default: error.message })}
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        totalItems={totalUsers}
        currentPage={currentPage}
        onPageChange={(page) => fetchUsers(page, filters)}
        onFilterChange={handleFilterChange}
        serverSide={true}
        emptyMessage={t('users.noUsers')}
        className="users-table"
        ariaLabel={t('users.tableAriaLabel')}
      />

      {auditLog.length > 0 && (
        <div className="audit-log" aria-label={t('users.auditLogAriaLabel')}>
          <h2>{t('users.auditLog')}</h2>
          <ul>
            {auditLog.map((entry, index) => (
              <li key={index}>
                {new Date(entry.timestamp).toLocaleString()} - {entry.action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Users;