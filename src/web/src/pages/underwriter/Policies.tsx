import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, Typography, Box, Divider, Skeleton } from '@mui/material';

import MainLayout from '../../layouts/MainLayout';
import PolicyList from '../../components/policy/PolicyList';
import PolicyDetails from '../../components/policy/PolicyDetails';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { usePolicy } from '../../hooks/usePolicy';
import { useAuth } from '../../hooks/useAuth';
import { Policy, PolicyStatus } from '../../types/policy.types';

interface PoliciesPageState {
  selectedPolicyId: string | null;
  filterCriteria: {
    status?: PolicyStatus[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    search?: string;
  };
  loading: {
    list: boolean;
    details: boolean;
  };
  error: Error | null;
}

const PoliciesPage: React.FC = () => {
  // Hooks
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    getPoliciesForEnrollment,
    updateStatus,
    loadingStates,
    errors
  } = usePolicy();

  // State management
  const [state, setState] = useState<PoliciesPageState>({
    selectedPolicyId: null,
    filterCriteria: {},
    loading: {
      list: false,
      details: false
    },
    error: null
  });

  // Memoized policy list configuration
  const listConfig = useMemo(() => ({
    pageSize: 10,
    sortable: true,
    filterable: true,
    refreshInterval: 30000, // 30 seconds auto-refresh
  }), []);

  // Handle policy selection
  const handlePolicySelect = useCallback((policy: Policy) => {
    setState(prev => ({
      ...prev,
      selectedPolicyId: policy.id,
      loading: { ...prev.loading, details: true }
    }));
  }, []);

  // Handle policy status update
  const handleStatusUpdate = useCallback(async (policyId: string, newStatus: PolicyStatus) => {
    try {
      await updateStatus(policyId, newStatus);
      // Refresh policy list after status update
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, list: true }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error
      }));
    }
  }, [updateStatus]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<PoliciesPageState['filterCriteria']>) => {
    setState(prev => ({
      ...prev,
      filterCriteria: {
        ...prev.filterCriteria,
        ...newFilters
      }
    }));
  }, []);

  return (
    <ErrorBoundary>
      <MainLayout>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            padding: theme => theme.spacing(3),
            backgroundColor: 'background.default'
          }}
        >
          <Grid container spacing={3}>
            {/* Header */}
            <Grid item xs={12}>
              <Typography variant="h4" component="h1" gutterBottom>
                {t('policy.management.title')}
              </Typography>
              <Typography variant="body1" color="textSecondary" paragraph>
                {t('policy.management.description')}
              </Typography>
              <Divider />
            </Grid>

            {/* Policy List */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  height: '100%',
                  minHeight: '600px',
                  backgroundColor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1,
                  overflow: 'hidden'
                }}
              >
                {loadingStates.list ? (
                  <Skeleton variant="rectangular" height={600} />
                ) : (
                  <PolicyList
                    {...{
                      onPolicySelect: handlePolicySelect,
                      initialFilters: state.filterCriteria,
                      onFilterChange: handleFilterChange,
                      ...listConfig
                    } as any}
                  />
                )}
              </Box>
            </Grid>

            {/* Policy Details */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  height: '100%',
                  minHeight: '600px',
                  backgroundColor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1,
                  padding: theme => theme.spacing(2)
                }}
              >
                {state.selectedPolicyId ? (
                  <PolicyDetails
                    policyId={state.selectedPolicyId}
                    onStatusChange={(status) => 
                      handleStatusUpdate(state.selectedPolicyId!, status)
                    }
                    userRole={user?.role || ''}
                  />
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%'
                    }}
                  >
                    <Typography variant="body1" color="textSecondary">
                      {t('policy.management.selectPolicy')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </MainLayout>
    </ErrorBoundary>
  );
};

export default PoliciesPage;