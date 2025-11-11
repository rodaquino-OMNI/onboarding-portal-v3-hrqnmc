/**
 * Local audit logging hook to replace @austa/audit-logging
 */
import { useCallback } from 'react';

interface AuditLogEntry {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

export const useAuditLog = () => {
  const logAction = useCallback((entry: AuditLogEntry) => {
    console.log('[AUDIT]', {
      ...entry,
      timestamp: entry.timestamp || new Date(),
      userId: 'current-user', // Would be from auth context
    });
  }, []);

  return {
    logAction,
  };
};

export const auditLog = {
  log: (action: string, details?: Record<string, any>) => {
    console.log('[AUDIT]', {
      action,
      details,
      timestamp: new Date(),
    });
  },
};

export default useAuditLog;
