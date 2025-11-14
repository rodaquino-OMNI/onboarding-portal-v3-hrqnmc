/**
 * User Management Page
 * Version: 1.0.0
 *
 * User administration with CRUD operations, role assignment, and security controls
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
  IconButton,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SecurityIcon from '@mui/icons-material/Security';
import SearchIcon from '@mui/icons-material/Search';

import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

// User roles
const USER_ROLES = [
  'ADMINISTRATOR',
  'BROKER',
  'BENEFICIARY',
  'HR_PERSONNEL',
  'UNDERWRITER'
] as const;

// User status
const USER_STATUS = ['ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING'] as const;

interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: typeof USER_ROLES[number];
  status: typeof USER_STATUS[number];
  mfaEnabled: boolean;
  lastLogin?: Date;
  createdAt: Date;
  isLocked: boolean;
}

interface UserFormData {
  name: string;
  email: string;
  cpf: string;
  role: typeof USER_ROLES[number];
  mfaEnabled: boolean;
}

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showError, showSuccess } = useNotification();

  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    cpf: '',
    role: 'BENEFICIARY',
    mfaEnabled: false
  });

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Table columns configuration
  const columns = [
    {
      key: 'name',
      header: t('admin.users.name'),
      width: '170px'
    },
    {
      key: 'email',
      header: t('admin.users.email'),
      width: '200px'
    },
    {
      key: 'cpf',
      header: t('admin.users.cpf'),
      width: '130px',
      render: (row: User) => row.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    },
    {
      key: 'role',
      header: t('admin.users.role'),
      width: '150px',
      render: (row: User) => (
        <Chip
          label={t(`admin.users.roles.${row.role.toLowerCase()}`)}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      key: 'status',
      header: t('admin.users.status'),
      width: '120px',
      render: (row: User) => (
        <Chip
          label={t(`admin.users.statuses.${row.status.toLowerCase()}`)}
          size="small"
          color={row.status === 'ACTIVE' ? 'success' : row.status === 'LOCKED' ? 'error' : 'default'}
        />
      )
    },
    {
      key: 'mfaEnabled',
      header: t('admin.users.mfa'),
      width: '100px',
      render: (row: User) => (
        <Chip
          icon={<SecurityIcon />}
          label={row.mfaEnabled ? t('common.yes') : t('common.no')}
          size="small"
          color={row.mfaEnabled ? 'success' : 'default'}
        />
      )
    },
    {
      key: 'id' as keyof User,
      header: t('common.actions'),
      width: '200px',
      render: (row: User) => (
        <Box>
          <Tooltip title={t('admin.users.edit')}>
            <IconButton
              size="small"
              onClick={() => handleEdit(row)}
              aria-label={t('admin.users.edit')}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isLocked ? t('admin.users.unlock') : t('admin.users.lock')}>
            <IconButton
              size="small"
              onClick={() => handleToggleLock(row)}
              aria-label={row.isLocked ? t('admin.users.unlock') : t('admin.users.lock')}
            >
              {row.isLocked ? <LockOpenIcon /> : <LockIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('admin.users.delete')}>
            <IconButton
              size="small"
              onClick={() => handleDeleteClick(row)}
              color="error"
              aria-label={t('admin.users.delete')}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulated API call - replace with actual API service
      const mockUsers: User[] = Array.from({ length: 20 }, (_, i) => ({
        id: `user-${i}`,
        name: `Usuário ${i + 1}`,
        email: `usuario${i + 1}@exemplo.com`,
        cpf: `${String(i + 1).padStart(11, '0')}`,
        role: USER_ROLES[Math.floor(Math.random() * USER_ROLES.length)],
        status: USER_STATUS[Math.floor(Math.random() * USER_STATUS.length)],
        mfaEnabled: Math.random() > 0.5,
        lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        isLocked: Math.random() > 0.8
      }));

      setUsers(mockUsers);
      setTotalCount(mockUsers.length);
    } catch (error) {
      showError(t('admin.users.fetchError'));
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, roleFilter, statusFilter, showError, t]);

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle create user
  const handleCreate = useCallback(() => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      cpf: '',
      role: 'BENEFICIARY',
      mfaEnabled: false
    });
    setIsModalOpen(true);
  }, []);

  // Handle edit user
  const handleEdit = useCallback((user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      mfaEnabled: user.mfaEnabled
    });
    setIsModalOpen(true);
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(async () => {
    try {
      // Simulated API call - replace with actual API service
      if (modalMode === 'create') {
        showSuccess(t('admin.users.createSuccess'));
      } else {
        showSuccess(t('admin.users.updateSuccess'));
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      showError(t('admin.users.saveError'));
      console.error('Error saving user:', error);
    }
  }, [modalMode, formData, selectedUser, fetchUsers, showSuccess, showError, t]);

  // Handle toggle lock
  const handleToggleLock = useCallback(async (user: User) => {
    try {
      // Simulated API call - replace with actual API service
      const action = user.isLocked ? 'unlock' : 'lock';
      showSuccess(t(`admin.users.${action}Success`, { name: user.name }));
      fetchUsers();
    } catch (error) {
      showError(t('admin.users.lockError'));
      console.error('Error toggling user lock:', error);
    }
  }, [fetchUsers, showSuccess, showError, t]);

  // Handle delete click
  const handleDeleteClick = useCallback((user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  }, []);

  // Handle delete confirm
  const handleDeleteConfirm = useCallback(async () => {
    if (!userToDelete) return;

    try {
      // Simulated API call - replace with actual API service
      showSuccess(t('admin.users.deleteSuccess', { name: userToDelete.name }));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      showError(t('admin.users.deleteError'));
      console.error('Error deleting user:', error);
    }
  }, [userToDelete, fetchUsers, showSuccess, showError, t]);

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1">
              {t('admin.users.title')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
            >
              {t('admin.users.createUser')}
            </Button>
          </Box>
        </Grid>

        {/* Filters */}
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={t('admin.users.search')}
                  placeholder={t('admin.users.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    endAdornment: <SearchIcon />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('admin.users.filterByRole')}</InputLabel>
                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    label={t('admin.users.filterByRole')}
                  >
                    <MenuItem value="">{t('common.all')}</MenuItem>
                    {USER_ROLES.map(role => (
                      <MenuItem key={role} value={role}>
                        {t(`admin.users.roles.${role.toLowerCase()}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('admin.users.filterByStatus')}</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label={t('admin.users.filterByStatus')}
                  >
                    <MenuItem value="">{t('common.all')}</MenuItem>
                    {USER_STATUS.map(status => (
                      <MenuItem key={status} value={status}>
                        {t(`admin.users.statuses.${status.toLowerCase()}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Users Table */}
        <Grid item xs={12}>
          <Card>
            <DataTable
              columns={columns}
              data={users}
              loading={isLoading}
              page={page}
              rowsPerPage={rowsPerPage}
              totalCount={totalCount}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              emptyMessage={t('admin.users.noUsers')}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t(modalMode === 'create' ? 'admin.users.createUser' : 'admin.users.editUser')}
        size="sm"
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('admin.users.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('admin.users.email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('admin.users.cpf')}
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, '') })}
              required
              inputProps={{ maxLength: 11 }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>{t('admin.users.role')}</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                label={t('admin.users.role')}
              >
                {USER_ROLES.map(role => (
                  <MenuItem key={role} value={role}>
                    {t(`admin.users.roles.${role.toLowerCase()}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.mfaEnabled}
                  onChange={(e) => setFormData({ ...formData, mfaEnabled: e.target.checked })}
                />
              }
              label={t('admin.users.enableMFA')}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button onClick={() => setIsModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="contained" onClick={handleSubmit}>
                {t('common.save')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('admin.users.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            {t('admin.users.deleteConfirmMessage', { name: userToDelete?.name })}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
