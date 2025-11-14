/**
 * System Logs Page
 * Version: 1.0.0
 *
 * System audit logs viewer with filtering, search, and export capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

import DataTable from '../../components/common/DataTable';
import DatePicker from '../../components/common/DatePicker';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

// Log action types
const ACTION_TYPES = [
  'LOGIN',
  'LOGOUT',
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'EXPORT',
  'IMPORT',
  'MFA_VERIFY'
] as const;

// Entity types
const ENTITY_TYPES = [
  'USER',
  'ENROLLMENT',
  'POLICY',
  'DOCUMENT',
  'PAYMENT',
  'HEALTH_ASSESSMENT'
] as const;

interface LogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: typeof ACTION_TYPES[number];
  entity: typeof ENTITY_TYPES[number];
  entityId: string;
  ipAddress: string;
  userAgent: string;
  details?: string;
  status: 'SUCCESS' | 'FAILURE';
}

interface LogFilters {
  startDate: Date | null;
  endDate: Date | null;
  userId: string;
  action: string;
  entity: string;
  searchTerm: string;
}

const SystemLogs: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();

  // State management
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<LogFilters>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    endDate: new Date(),
    userId: '',
    action: '',
    entity: '',
    searchTerm: ''
  });
  const [showFilters, setShowFilters] = useState(true);

  // Table columns configuration
  const columns = [
    {
      key: 'timestamp' as keyof LogEntry,
      header: t('admin.logs.timestamp'),
      width: '180px',
      render: (row: LogEntry) => new Date(row.timestamp).toLocaleString('pt-BR')
    },
    {
      key: 'userName' as keyof LogEntry,
      header: t('admin.logs.user'),
      width: '150px'
    },
    {
      key: 'action' as keyof LogEntry,
      header: t('admin.logs.action'),
      width: '120px',
      render: (row: LogEntry) => (
        <Chip
          label={t(`admin.logs.actions.${row.action.toLowerCase()}`)}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      key: 'entity' as keyof LogEntry,
      header: t('admin.logs.entity'),
      width: '150px'
    },
    {
      key: 'entityId' as keyof LogEntry,
      header: t('admin.logs.entityId'),
      width: '120px'
    },
    {
      key: 'ipAddress' as keyof LogEntry,
      header: t('admin.logs.ipAddress'),
      width: '130px'
    },
    {
      key: 'status' as keyof LogEntry,
      header: t('admin.logs.status'),
      width: '100px',
      render: (row: LogEntry) => (
        <Chip
          label={t(`admin.logs.status.${row.status.toLowerCase()}`)}
          size="small"
          color={row.status === 'SUCCESS' ? 'success' : 'error'}
        />
      )
    }
  ];

  // Fetch logs with filters
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulated API call - replace with actual API service
      const mockLogs: LogEntry[] = Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        userId: `user-${Math.floor(Math.random() * 10)}`,
        userName: `Usuário ${Math.floor(Math.random() * 10)}`,
        action: ACTION_TYPES[Math.floor(Math.random() * ACTION_TYPES.length)],
        entity: ENTITY_TYPES[Math.floor(Math.random() * ENTITY_TYPES.length)],
        entityId: `entity-${Math.floor(Math.random() * 100)}`,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0...',
        status: Math.random() > 0.1 ? 'SUCCESS' : 'FAILURE'
      }));

      setLogs(mockLogs);
      setTotalCount(mockLogs.length);
    } catch (error) {
      showError(t('admin.logs.fetchError'));
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, rowsPerPage, showError, t]);

  // Initial load and refresh
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle filter change
  const handleFilterChange = useCallback((field: keyof LogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page on filter change
  }, []);

  // Handle search
  const handleSearch = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle export to CSV
  const handleExportCSV = useCallback(async () => {
    try {
      const csv = [
        // Headers
        columns.map(col => col.header).join(','),
        // Data rows
        ...logs.map(log =>
          columns
            .map(col => {
              const value = log[col.key as keyof LogEntry];
              if (value instanceof Date) {
                return value.toISOString();
              }
              return `"${value}"`;
            })
            .join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      showSuccess(t('admin.logs.exportSuccess'));
    } catch (error) {
      showError(t('admin.logs.exportError'));
      console.error('Error exporting logs:', error);
    }
  }, [logs, columns, showSuccess, showError, t]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchLogs();
    showSuccess(t('admin.logs.refreshSuccess'));
  }, [fetchLogs, showSuccess, t]);

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1">
              {t('admin.logs.title')}
            </Typography>
            <Box>
              <Tooltip title={t('admin.logs.refresh')}>
                <IconButton onClick={handleRefresh} aria-label={t('admin.logs.refresh')}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('admin.logs.toggleFilters')}>
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  aria-label={t('admin.logs.toggleFilters')}
                >
                  <FilterListIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportCSV}
                sx={{ ml: 1 }}
              >
                {t('admin.logs.exportCSV')}
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Filters */}
        {showFilters && (
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('admin.logs.filters')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    id="start-date"
                    name="startDate"
                    label={t('admin.logs.startDate')}
                    value={filters.startDate}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    maxDate={filters.endDate || undefined}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    id="end-date"
                    name="endDate"
                    label={t('admin.logs.endDate')}
                    value={filters.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    minDate={filters.startDate || undefined}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>{t('admin.logs.actionType')}</InputLabel>
                    <Select
                      value={filters.action}
                      onChange={(e) => handleFilterChange('action', e.target.value)}
                      label={t('admin.logs.actionType')}
                    >
                      <MenuItem value="">{t('common.all')}</MenuItem>
                      {ACTION_TYPES.map(action => (
                        <MenuItem key={action} value={action}>
                          {t(`admin.logs.actions.${action.toLowerCase()}`)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>{t('admin.logs.entityType')}</InputLabel>
                    <Select
                      value={filters.entity}
                      onChange={(e) => handleFilterChange('entity', e.target.value)}
                      label={t('admin.logs.entityType')}
                    >
                      <MenuItem value="">{t('common.all')}</MenuItem>
                      {ENTITY_TYPES.map(entity => (
                        <MenuItem key={entity} value={entity}>
                          {entity}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('admin.logs.search')}
                    placeholder={t('admin.logs.searchPlaceholder')}
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    InputProps={{
                      endAdornment: (
                        <IconButton onClick={handleSearch} aria-label={t('admin.logs.search')}>
                          <SearchIcon />
                        </IconButton>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>
        )}

        {/* Logs Table */}
        <Grid item xs={12}>
          <Card>
            <DataTable
              {...{
                columns: columns as any,
                data: logs,
                loading: isLoading,
                page,
                rowsPerPage,
                totalCount,
                onPageChange: setPage,
                onRowsPerPageChange: setRowsPerPage,
                emptyMessage: t('admin.logs.noLogs')
              } as any}
            />
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemLogs;
