/**
 * Local role-based access control hook to replace @austa/rbac and @austa/role-based-access
 */
import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { UserRole } from '../types/auth.types';

export interface RoleAccess {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export const useRoleBasedAccess = (resource?: string) => {
  const { user } = useAuth();

  const access = useMemo((): RoleAccess => {
    if (!user) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
      };
    }

    // Define role-based permissions
    switch (user.role) {
      case UserRole.ADMINISTRATOR:
        return {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          canApprove: true,
        };
      case UserRole.UNDERWRITER:
        return {
          canCreate: false,
          canRead: true,
          canUpdate: true,
          canDelete: false,
          canApprove: true,
        };
      case UserRole.BROKER:
        return {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: false,
          canApprove: false,
        };
      case UserRole.HR_PERSONNEL:
        return {
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
          canApprove: false,
        };
      default:
        return {
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
          canApprove: false,
        };
    }
  }, [user]);

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  return {
    ...access,
    hasPermission,
    role: user?.role,
  };
};
