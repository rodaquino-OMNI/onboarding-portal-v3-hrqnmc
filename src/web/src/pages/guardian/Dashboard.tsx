/**
 * Guardian Dashboard Page
 * Version: 1.0.0
 *
 * Parent/guardian dashboard for managing dependents under 18 years old
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

// Enrollment status types
const ENROLLMENT_STATUS = [
  'NOT_STARTED',
  'PENDING_HEALTH',
  'PENDING_DOCUMENTS',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED'
] as const;

interface Dependent {
  id: string;
  name: string;
  dateOfBirth: Date;
  cpf: string;
  relationship: string;
  enrollmentStatus: typeof ENROLLMENT_STATUS[number];
  healthAssessmentComplete: boolean;
  documentsComplete: boolean;
  completionPercentage: number;
  lastActivity?: Date;
}

interface Notification {
  id: string;
  dependentId: string;
  dependentName: string;
  type: 'action_required' | 'info' | 'warning';
  message: string;
  timestamp: Date;
}

interface Activity {
  id: string;
  dependentId: string;
  dependentName: string;
  action: string;
  timestamp: Date;
}

const GuardianDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();

  // State management
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch dependents and data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulated API call - replace with actual API service
      const mockDependents: Dependent[] = Array.from({ length: 3 }, (_, i) => ({
        id: `dep-${i}`,
        name: `Dependente ${i + 1}`,
        dateOfBirth: new Date(2010 + i, i, i + 1),
        cpf: `${String(i + 1).padStart(11, '0')}`,
        relationship: ['Filho(a)', 'Enteado(a)', 'Sobrinho(a)'][i % 3],
        enrollmentStatus: ENROLLMENT_STATUS[Math.floor(Math.random() * ENROLLMENT_STATUS.length)],
        healthAssessmentComplete: Math.random() > 0.5,
        documentsComplete: Math.random() > 0.5,
        completionPercentage: Math.floor(Math.random() * 101),
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      }));

      const mockNotifications: Notification[] = [
        {
          id: 'notif-1',
          dependentId: 'dep-1',
          dependentName: 'Dependente 1',
          type: 'action_required',
          message: t('guardian.notifications.healthAssessmentPending'),
          timestamp: new Date()
        },
        {
          id: 'notif-2',
          dependentId: 'dep-2',
          dependentName: 'Dependente 2',
          type: 'warning',
          message: t('guardian.notifications.documentsMissing'),
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        }
      ];

      const mockActivities: Activity[] = [
        {
          id: 'act-1',
          dependentId: 'dep-1',
          dependentName: 'Dependente 1',
          action: t('guardian.activities.healthAssessmentStarted'),
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
        },
        {
          id: 'act-2',
          dependentId: 'dep-2',
          dependentName: 'Dependente 2',
          action: t('guardian.activities.documentUploaded'),
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
        }
      ];

      setDependents(mockDependents);
      setNotifications(mockNotifications);
      setRecentActivities(mockActivities);
    } catch (error) {
      showError(t('guardian.dashboard.fetchError'));
      console.error('Error fetching guardian data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [showError, t]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate age
  const calculateAge = useCallback((dateOfBirth: Date) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, []);

  // Handle add dependent
  const handleAddDependent = useCallback(() => {
    navigate('/guardian/dependent-management');
  }, [navigate]);

  // Handle complete health assessment
  const handleCompleteHealthAssessment = useCallback((dependentId: string) => {
    navigate(`/guardian/health-assessment/${dependentId}`);
  }, [navigate]);

  // Handle upload documents
  const handleUploadDocuments = useCallback((dependentId: string) => {
    navigate(`/guardian/documents/${dependentId}`);
  }, [navigate]);

  // Handle view dependent
  const handleViewDependent = useCallback((dependentId: string) => {
    navigate(`/guardian/dependent/${dependentId}`);
  }, [navigate]);

  // Get status color
  const getStatusColor = useCallback((status: typeof ENROLLMENT_STATUS[number]) => {
    const colors: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
      NOT_STARTED: 'default',
      PENDING_HEALTH: 'warning',
      PENDING_DOCUMENTS: 'warning',
      UNDER_REVIEW: 'info',
      APPROVED: 'success',
      REJECTED: 'error'
    };
    return colors[status] || 'default';
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1">
              {t('guardian.dashboard.title')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddDependent}
            >
              {t('guardian.dashboard.addDependent')}
            </Button>
          </Box>
        </Grid>

        {/* Info Alert */}
        <Grid item xs={12}>
          <Alert severity="info" icon={<PersonIcon />}>
            {t('guardian.dashboard.guardianInfo')}
          </Alert>
        </Grid>

        {/* Notifications */}
        {notifications.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsActiveIcon sx={{ mr: 1 }} color="warning" />
                <Typography variant="h6">
                  {t('guardian.dashboard.notifications')}
                </Typography>
              </Box>
              <List>
                {notifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem>
                      <ListItemText
                        primary={notification.message}
                        secondary={
                          <>
                            {notification.dependentName} •{' '}
                            {notification.timestamp.toLocaleString('pt-BR')}
                          </>
                        }
                      />
                    </ListItem>
                    {index < notifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Card>
          </Grid>
        )}

        {/* Dependents List */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom>
            {t('guardian.dashboard.myDependents')}
          </Typography>
        </Grid>

        {dependents.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {t('guardian.dashboard.noDependents')}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                {t('guardian.dashboard.addDependentPrompt')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddDependent}
              >
                {t('guardian.dashboard.addFirstDependent')}
              </Button>
            </Card>
          </Grid>
        ) : (
          dependents.map((dependent) => (
            <Grid item xs={12} md={6} lg={4} key={dependent.id}>
              <Card sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{dependent.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {dependent.relationship} • {calculateAge(dependent.dateOfBirth)}{' '}
                      {t('common.years')}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {t('guardian.dashboard.enrollmentStatus')}
                  </Typography>
                  <Chip
                    label={t(`guardian.statuses.${dependent.enrollmentStatus.toLowerCase()}`)}
                    size="small"
                    color={getStatusColor(dependent.enrollmentStatus)}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="textSecondary">
                      {t('guardian.dashboard.progress')}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {dependent.completionPercentage}%
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      height: 8,
                      bgcolor: 'grey.200',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        width: `${dependent.completionPercentage}%`,
                        height: '100%',
                        bgcolor: 'primary.main',
                        transition: 'width 0.3s'
                      }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  {t('guardian.dashboard.quickActions')}
                </Typography>
                <Grid container spacing={1}>
                  {!dependent.healthAssessmentComplete && (
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<AssignmentIcon />}
                        onClick={() => handleCompleteHealthAssessment(dependent.id)}
                      >
                        {t('guardian.dashboard.completeHealthAssessment')}
                      </Button>
                    </Grid>
                  )}
                  {!dependent.documentsComplete && (
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<DescriptionIcon />}
                        onClick={() => handleUploadDocuments(dependent.id)}
                      >
                        {t('guardian.dashboard.uploadDocuments')}
                      </Button>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="text"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewDependent(dependent.id)}
                    >
                      {t('guardian.dashboard.viewDetails')}
                    </Button>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))
        )}

        {/* Recent Activity */}
        {recentActivities.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {t('guardian.dashboard.recentActivity')}
              </Typography>
              <List>
                {recentActivities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemText
                        primary={activity.action}
                        secondary={
                          <>
                            {activity.dependentName} •{' '}
                            {activity.timestamp.toLocaleString('pt-BR')}
                          </>
                        }
                      />
                    </ListItem>
                    {index < recentActivities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default GuardianDashboard;
