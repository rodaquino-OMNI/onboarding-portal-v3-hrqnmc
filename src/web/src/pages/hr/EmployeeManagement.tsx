/**
 * Employee Management Page
 * Version: 1.0.0
 *
 * Corporate employee management with status tracking, bulk actions, and enrollment monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Checkbox,
  Menu
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import DownloadIcon from '@mui/icons-material/Download';
import MailIcon from '@mui/icons-material/Mail';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import GroupAddIcon from '@mui/icons-material/GroupAdd';

import DataTable from '../../components/common/DataTable';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

// Enrollment status types
const ENROLLMENT_STATUS = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PENDING_DOCUMENTS',
  'PENDING_HEALTH',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED'
] as const;

// Department types
const DEPARTMENTS = [
  'TI',
  'Financeiro',
  'RH',
  'Vendas',
  'Marketing',
  'Operações',
  'Administrativo'
] as const;

interface Employee {
  id: string;
  name: string;
  email: string;
  cpf: string;
  department: typeof DEPARTMENTS[number];
  enrollmentStatus: typeof ENROLLMENT_STATUS[number];
  enrollmentDate?: Date;
  lastActivity?: Date;
  completionPercentage: number;
  hasDependent: boolean;
}

const EmployeeManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();

  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);

  // Table columns configuration
  const columns = [
    {
      id: 'select',
      label: '',
      minWidth: 50,
      format: (_value: any, row: Employee) => (
        <Checkbox
          checked={selectedEmployees.has(row.id)}
          onChange={() => handleSelectEmployee(row.id)}
        />
      )
    },
    {
      id: 'name',
      label: t('hr.employees.name'),
      minWidth: 170
    },
    {
      id: 'email',
      label: t('hr.employees.email'),
      minWidth: 200
    },
    {
      id: 'department',
      label: t('hr.employees.department'),
      minWidth: 130
    },
    {
      id: 'enrollmentStatus',
      label: t('hr.employees.status'),
      minWidth: 150,
      format: (value: string) => {
        const colors: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
          NOT_STARTED: 'default',
          IN_PROGRESS: 'info',
          PENDING_DOCUMENTS: 'warning',
          PENDING_HEALTH: 'warning',
          UNDER_REVIEW: 'info',
          APPROVED: 'success',
          REJECTED: 'error'
        };
        return (
          <Chip
            label={t(`hr.employees.statuses.${value.toLowerCase()}`)}
            size="small"
            color={colors[value] || 'default'}
          />
        );
      }
    },
    {
      id: 'completionPercentage',
      label: t('hr.employees.completion'),
      minWidth: 120,
      format: (value: number) => `${value}%`
    },
    {
      id: 'lastActivity',
      label: t('hr.employees.lastActivity'),
      minWidth: 150,
      format: (value: Date | undefined) =>
        value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
    {
      id: 'hasDependent',
      label: t('hr.employees.dependents'),
      minWidth: 100,
      format: (value: boolean) => (
        <Chip
          label={value ? t('common.yes') : t('common.no')}
          size="small"
          variant="outlined"
        />
      )
    }
  ];

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulated API call - replace with actual API service
      const mockEmployees: Employee[] = Array.from({ length: 50 }, (_, i) => ({
        id: `emp-${i}`,
        name: `Funcionário ${i + 1}`,
        email: `funcionario${i + 1}@empresa.com`,
        cpf: `${String(i + 1).padStart(11, '0')}`,
        department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)],
        enrollmentStatus: ENROLLMENT_STATUS[Math.floor(Math.random() * ENROLLMENT_STATUS.length)],
        enrollmentDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        lastActivity: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000) : undefined,
        completionPercentage: Math.floor(Math.random() * 101),
        hasDependent: Math.random() > 0.6
      }));

      setEmployees(mockEmployees);
      setTotalCount(mockEmployees.length);
    } catch (error) {
      showError(t('hr.employees.fetchError'));
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, departmentFilter, statusFilter, showError, t]);

  // Initial load
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Handle select employee
  const handleSelectEmployee = useCallback((employeeId: string) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map(e => e.id)));
    }
  }, [employees, selectedEmployees]);

  // Handle bulk action menu
  const handleBulkMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setBulkMenuAnchor(event.currentTarget);
  }, []);

  const handleBulkMenuClose = useCallback(() => {
    setBulkMenuAnchor(null);
  }, []);

  // Handle send reminders
  const handleSendReminders = useCallback(async () => {
    if (selectedEmployees.size === 0) {
      showError(t('hr.employees.selectEmployees'));
      return;
    }

    try {
      // Simulated API call - replace with actual API service
      showSuccess(t('hr.employees.remindersSent', { count: selectedEmployees.size }));
      setSelectedEmployees(new Set());
      handleBulkMenuClose();
    } catch (error) {
      showError(t('hr.employees.remindersError'));
      console.error('Error sending reminders:', error);
    }
  }, [selectedEmployees, showSuccess, showError, t, handleBulkMenuClose]);

  // Handle export CSV
  const handleExportCSV = useCallback(async () => {
    try {
      const dataToExport = selectedEmployees.size > 0
        ? employees.filter(e => selectedEmployees.has(e.id))
        : employees;

      const csv = [
        // Headers
        'Nome,Email,CPF,Departamento,Status,Progresso,Última Atividade',
        // Data rows
        ...dataToExport.map(emp =>
          [
            emp.name,
            emp.email,
            emp.cpf,
            emp.department,
            emp.enrollmentStatus,
            `${emp.completionPercentage}%`,
            emp.lastActivity?.toLocaleDateString('pt-BR') || '-'
          ].join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `funcionarios-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      showSuccess(t('hr.employees.exportSuccess'));
      handleBulkMenuClose();
    } catch (error) {
      showError(t('hr.employees.exportError'));
      console.error('Error exporting employees:', error);
    }
  }, [employees, selectedEmployees, showSuccess, showError, t, handleBulkMenuClose]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchEmployees();
    showSuccess(t('hr.employees.refreshSuccess'));
  }, [fetchEmployees, showSuccess, t]);

  // Handle bulk enrollment
  const handleBulkEnrollment = useCallback(() => {
    navigate('/hr/bulk-enrollment');
  }, [navigate]);

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1">
              {t('hr.employees.title')}
            </Typography>
            <Box>
              <Tooltip title={t('hr.employees.refresh')}>
                <IconButton onClick={handleRefresh} aria-label={t('hr.employees.refresh')}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<GroupAddIcon />}
                onClick={handleBulkEnrollment}
                sx={{ ml: 1 }}
              >
                {t('hr.employees.bulkEnrollment')}
              </Button>
              {selectedEmployees.size > 0 && (
                <Button
                  variant="contained"
                  startIcon={<MoreVertIcon />}
                  onClick={handleBulkMenuOpen}
                  sx={{ ml: 1 }}
                >
                  {t('hr.employees.bulkActions')} ({selectedEmployees.size})
                </Button>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Filters */}
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={t('hr.employees.search')}
                  placeholder={t('hr.employees.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    endAdornment: <SearchIcon />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('hr.employees.filterByDepartment')}</InputLabel>
                  <Select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    label={t('hr.employees.filterByDepartment')}
                  >
                    <MenuItem value="">{t('common.all')}</MenuItem>
                    {DEPARTMENTS.map(dept => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('hr.employees.filterByStatus')}</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label={t('hr.employees.filterByStatus')}
                  >
                    <MenuItem value="">{t('common.all')}</MenuItem>
                    {ENROLLMENT_STATUS.map(status => (
                      <MenuItem key={status} value={status}>
                        {t(`hr.employees.statuses.${status.toLowerCase()}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Select All */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              checked={selectedEmployees.size === employees.length && employees.length > 0}
              indeterminate={selectedEmployees.size > 0 && selectedEmployees.size < employees.length}
              onChange={handleSelectAll}
            />
            <Typography variant="body2">
              {t('hr.employees.selectAll')}
            </Typography>
          </Box>
        </Grid>

        {/* Employees Table */}
        <Grid item xs={12}>
          <Card>
            <DataTable
              columns={columns}
              data={employees}
              loading={isLoading}
              page={page}
              rowsPerPage={rowsPerPage}
              totalCount={totalCount}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              emptyMessage={t('hr.employees.noEmployees')}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Bulk Actions Menu */}
      <Menu
        anchorEl={bulkMenuAnchor}
        open={Boolean(bulkMenuAnchor)}
        onClose={handleBulkMenuClose}
      >
        <MenuItem onClick={handleSendReminders}>
          <MailIcon sx={{ mr: 1 }} />
          {t('hr.employees.sendReminders')}
        </MenuItem>
        <MenuItem onClick={handleExportCSV}>
          <DownloadIcon sx={{ mr: 1 }} />
          {t('hr.employees.exportSelected')}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EmployeeManagement;
