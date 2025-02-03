import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import Form from '../../components/common/Form';
import Button from '../../components/common/Button';
import AdminLayout from '../../layouts/AdminLayout';
import { ApiService } from '../../services/api.service';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth.types';

// Validation schema for system settings
const systemSettingsSchema = z.object({
  defaultLanguage: z.enum(['pt-BR', 'en']),
  sessionTimeout: z.number().min(300).max(28800), // 5 minutes to 8 hours
  mfaEnabled: z.boolean(),
  maxLoginAttempts: z.number().min(1).max(10),
  passwordExpiryDays: z.number().min(30).max(180),
  maintenanceMode: z.boolean(),
  lgpdSettings: z.object({
    dataRetentionDays: z.number().min(365).max(3650), // 1-10 years
    consentRequired: z.boolean(),
    anonymizationEnabled: z.boolean(),
    dataExportEnabled: z.boolean()
  }),
  auditSettings: z.object({
    enabled: z.boolean(),
    retentionDays: z.number().min(90).max(3650),
    detailedLogging: z.boolean()
  }),
  securitySettings: z.object({
    passwordComplexity: z.enum(['low', 'medium', 'high']),
    ipWhitelist: z.array(z.string()),
    sslRequired: z.boolean(),
    sessionConcurrency: z.number().min(1).max(5)
  })
});

type SystemSettings = z.infer<typeof systemSettingsSchema>;

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load current settings
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await ApiService.get('/api/v1/admin/settings');
      const validatedSettings = systemSettingsSchema.parse(response.data);
      setSettings(validatedSettings);
      await ApiService.auditLog('settings_viewed', { userId: user?.id });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Handle settings update
  const handleSettingsUpdate = async (updatedSettings: SystemSettings) => {
    try {
      const validatedSettings = systemSettingsSchema.parse(updatedSettings);
      await ApiService.put('/api/v1/admin/settings', validatedSettings);
      await ApiService.auditLog('settings_updated', {
        userId: user?.id,
        changes: updatedSettings
      });
      setSettings(validatedSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  // Default form values
  const defaultValues = useMemo(() => ({
    defaultLanguage: 'pt-BR',
    sessionTimeout: 3600,
    mfaEnabled: true,
    maxLoginAttempts: 5,
    passwordExpiryDays: 90,
    maintenanceMode: false,
    lgpdSettings: {
      dataRetentionDays: 365,
      consentRequired: true,
      anonymizationEnabled: true,
      dataExportEnabled: true
    },
    auditSettings: {
      enabled: true,
      retentionDays: 365,
      detailedLogging: true
    },
    securitySettings: {
      passwordComplexity: 'high',
      ipWhitelist: [],
      sslRequired: true,
      sessionConcurrency: 1
    }
  }), []);

  return (
    <AdminLayout requiredRole={UserRole.ADMINISTRATOR}>
      <ErrorBoundary>
        <div className="settings-page">
          <h1>{t('settings.title')}</h1>
          
          <Form
            validationSchema={systemSettingsSchema}
            initialValues={settings || defaultValues}
            onSubmit={handleSettingsUpdate}
            loading={isLoading}
          >
            {/* General Settings */}
            <section aria-labelledby="general-settings">
              <h2 id="general-settings">{t('settings.general.title')}</h2>
              <Form.Select
                name="defaultLanguage"
                label={t('settings.general.language')}
                options={[
                  { value: 'pt-BR', label: 'Português (Brasil)' },
                  { value: 'en', label: 'English' }
                ]}
              />
              <Form.Number
                name="sessionTimeout"
                label={t('settings.general.sessionTimeout')}
                min={300}
                max={28800}
              />
              <Form.Switch
                name="maintenanceMode"
                label={t('settings.general.maintenanceMode')}
              />
            </section>

            {/* LGPD Settings */}
            <section aria-labelledby="lgpd-settings">
              <h2 id="lgpd-settings">{t('settings.lgpd.title')}</h2>
              <Form.Number
                name="lgpdSettings.dataRetentionDays"
                label={t('settings.lgpd.retention')}
                min={365}
                max={3650}
              />
              <Form.Switch
                name="lgpdSettings.consentRequired"
                label={t('settings.lgpd.consent')}
              />
              <Form.Switch
                name="lgpdSettings.anonymizationEnabled"
                label={t('settings.lgpd.anonymization')}
              />
              <Form.Switch
                name="lgpdSettings.dataExportEnabled"
                label={t('settings.lgpd.export')}
              />
            </section>

            {/* Security Settings */}
            <section aria-labelledby="security-settings">
              <h2 id="security-settings">{t('settings.security.title')}</h2>
              <Form.Switch
                name="mfaEnabled"
                label={t('settings.security.mfa')}
              />
              <Form.Number
                name="maxLoginAttempts"
                label={t('settings.security.maxAttempts')}
                min={1}
                max={10}
              />
              <Form.Number
                name="passwordExpiryDays"
                label={t('settings.security.passwordExpiry')}
                min={30}
                max={180}
              />
              <Form.Select
                name="securitySettings.passwordComplexity"
                label={t('settings.security.complexity')}
                options={[
                  { value: 'low', label: t('settings.security.complexityLow') },
                  { value: 'medium', label: t('settings.security.complexityMedium') },
                  { value: 'high', label: t('settings.security.complexityHigh') }
                ]}
              />
            </section>

            {/* Audit Settings */}
            <section aria-labelledby="audit-settings">
              <h2 id="audit-settings">{t('settings.audit.title')}</h2>
              <Form.Switch
                name="auditSettings.enabled"
                label={t('settings.audit.enabled')}
              />
              <Form.Number
                name="auditSettings.retentionDays"
                label={t('settings.audit.retention')}
                min={90}
                max={3650}
              />
              <Form.Switch
                name="auditSettings.detailedLogging"
                label={t('settings.audit.detailed')}
              />
            </section>

            <div className="settings-actions">
              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                fullWidth={false}
              >
                {t('settings.save')}
              </Button>
            </div>
          </Form>
        </div>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default Settings;