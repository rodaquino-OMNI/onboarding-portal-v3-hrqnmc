import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Container, CircularProgress } from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useVirtualizer } from '@tanstack/react-virtual';

import BrokerLayout from '../../layouts/BrokerLayout';
import EnrollmentList from '../../components/enrollment/EnrollmentList';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useEnrollment } from '../../hooks/useEnrollment';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { EnrollmentSummary, EnrollmentFilters } from '../../types/enrollment.types';
import { ROUTES } from '../../constants/routes.constants';

// Constants for performance optimization
const PAGE_SIZE = 20;
const REFRESH_INTERVAL = 300000; // 5 minutes
const DEBOUNCE_DELAY = 300;

/**
 * Broker Enrollments Page Component
 * Implements comprehensive enrollment management with enhanced security and performance
 */
const EnrollmentsPage: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkPermission } = useAuth();
  const { showError, showSuccess } = useNotification();

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<EnrollmentFilters>({});

  // Custom hooks
  const {
    fetchEnrollmentList,
    isLoading,
    error
  } = useEnrollment();

  // Handle new enrollment creation with permission check
  const handleNewEnrollment = useCallback(() => {
    if (!checkPermission('create_enrollment')) {
      showError(t('enrollment.errors.insufficientPermissions'));
      return;
    }
    navigate(ROUTES.BROKER.NEW_ENROLLMENT);
  }, [navigate, checkPermission, showError, t]);

  // Handle enrollment selection with validation
  const handleEnrollmentSelect = useCallback((enrollment: EnrollmentSummary) => {
    if (!checkPermission('view_enrollment_details')) {
      showError(t('enrollment.errors.insufficientPermissions'));
      return;
    }
    navigate(`${ROUTES.BROKER.ENROLLMENTS}/${enrollment.id}`);
  }, [navigate, checkPermission, showError, t]);

  // Handle data refresh with optimistic updates
  const handleRefresh = useCallback(async () => {
    try {
      await fetchEnrollmentList(currentPage, PAGE_SIZE, filters);
      showSuccess(t('enrollment.messages.refreshSuccess'));
    } catch (error) {
      showError(t('enrollment.errors.refreshFailed'));
    }
  }, [currentPage, filters, fetchEnrollmentList, showSuccess, showError, t]);

  // Initial data load and refresh interval
  useEffect(() => {
    fetchEnrollmentList(currentPage, PAGE_SIZE, filters);

    const refreshInterval = setInterval(handleRefresh, REFRESH_INTERVAL);
    return () => clearInterval(refreshInterval);
  }, [currentPage, filters, fetchEnrollmentList, handleRefresh]);

  // Handle filter changes with debounce
  const handleFilterChange = useCallback((newFilters: EnrollmentFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  return (
    <ErrorBoundary>
      <BrokerLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Header Section */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 'medium' }}
            >
              {t('enrollment.title')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={isLoading}
                aria-label={t('common.refresh')}
              >
                {t('common.refresh')}
              </Button>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNewEnrollment}
                disabled={!checkPermission('create_enrollment')}
                aria-label={t('enrollment.actions.new')}
              >
                {t('enrollment.actions.new')}
              </Button>
            </Box>
          </Box>

          {/* Main Content */}
          {isLoading && !error ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400
              }}
            >
              <CircularProgress size={40} />
            </Box>
          ) : (
            <EnrollmentList
              brokerId={user?.id}
              onEnrollmentSelect={handleEnrollmentSelect}
              initialFilters={filters}
              className="enrollment-list-container"
            />
          )}
        </Container>
      </BrokerLayout>
    </ErrorBoundary>
  );
});

// Display name for debugging
EnrollmentsPage.displayName = 'EnrollmentsPage';

export default EnrollmentsPage;