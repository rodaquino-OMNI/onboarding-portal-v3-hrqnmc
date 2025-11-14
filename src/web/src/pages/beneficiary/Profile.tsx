import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ErrorBoundary } from 'react-error-boundary';

import Form from '../../components/common/Form';
import Card from '../../components/common/Card';
import { authService } from '../../services/auth.service';
import { THEME, VALIDATION, ACCESSIBILITY } from '../../constants/app.constants';

// Simple mask functions
const maskCPF = (cpf: string) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
const maskPhone = (phone: string) => phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');

// Profile form validation schema with Brazilian rules
const profileValidationSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string()
    .email('Email inválido')
    .regex(VALIDATION.EMAIL.PATTERN, VALIDATION.EMAIL.MESSAGE),
  cpf: z.string()
    .regex(VALIDATION.CPF.PATTERN, VALIDATION.CPF.MESSAGE),
  phone: z.string()
    .regex(VALIDATION.PHONE.PATTERN, VALIDATION.PHONE.MESSAGE),
  address: z.object({
    street: z.string().min(1, 'Rua é obrigatória'),
    number: z.string().min(1, 'Número é obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, 'Bairro é obrigatório'),
    city: z.string().min(1, 'Cidade é obrigatória'),
    state: z.string().length(2, 'Use a sigla do estado'),
    zipCode: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido')
  }),
  preferredLanguage: z.enum(['pt-BR', 'en']),
  marketingConsent: z.boolean(),
  accessibilityPreferences: z.object({
    highContrast: z.boolean(),
    fontSize: z.enum(['small', 'medium', 'large']),
    reduceMotion: z.boolean()
  })
});

type ProfileFormData = z.infer<typeof profileValidationSchema>;

// Profile sections configuration
const PROFILE_SECTIONS = [
  {
    id: 'personal',
    title: 'Dados Pessoais',
    fields: ['name', 'email', 'cpf', 'phone']
  },
  {
    id: 'address',
    title: 'Endereço',
    fields: ['street', 'number', 'complement', 'neighborhood', 'city', 'state', 'zipCode']
  },
  {
    id: 'preferences',
    title: 'Preferências',
    fields: ['preferredLanguage', 'marketingConsent', 'accessibilityPreferences']
  }
];

/**
 * Beneficiary Profile Page Component
 * Implements LGPD-compliant profile management with accessibility features
 */
const BeneficiaryProfile: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileFormData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load profile data with security checks
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        setProfileData({
          name: user.firstName + ' ' + user.lastName,
          email: user.email,
          cpf: maskCPF(user.cpf),
          phone: maskPhone(user.phoneNumber),
          address: {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: ''
          },
          preferredLanguage: 'pt-BR',
          marketingConsent: user.dataConsentGiven,
          accessibilityPreferences: {
            highContrast: false,
            fontSize: 'medium',
            reduceMotion: false
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Handle profile updates with LGPD compliance
  const handleProfileUpdate = useCallback(async (formData: ProfileFormData) => {
    try {
      setLoading(true);
      
      // Log audit trail for LGPD compliance
      console.info('Profile update requested', {
        timestamp: new Date().toISOString(),
        fields: Object.keys(formData).filter(k => k !== 'cpf')
      });

      // TODO: Implement actual profile update API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProfileData(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  }, []);

  // Error fallback component
  const ErrorFallback = ({ error }: { error: Error }) => (
    <Card className="error-container" role="alert">
      <h2>Erro ao carregar perfil</h2>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>Tentar novamente</button>
    </Card>
  );

  if (error) {
    return <ErrorFallback error={new Error(error)} />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="profile-container">
        <h1 className="profile-title">
          {t('profile.title')}
        </h1>

        {loading ? (
          <Card loading testId="profile-loading" />
        ) : profileData && (
          <Form
            validationSchema={profileValidationSchema}
            initialValues={profileData}
            onSubmit={handleProfileUpdate}
            submitLabel={t('profile.save')}
            loading={loading}
            a11yConfig={{
              ariaLive: 'polite',
              screenReaderInstructions: t('profile.accessibility.instructions')
            }}
            securityConfig={{
              maskFields: ['cpf', 'phone'],
              auditLog: true,
              lgpdCompliance: true
            }}
          >
            {PROFILE_SECTIONS.map(section => (
              <Card
                key={section.id}
                className="profile-section"
                testId={`profile-section-${section.id}`}
                ariaLabel={t(`profile.sections.${section.id}`)}
              >
                <h2>{t(`profile.sections.${section.id}`)}</h2>
                {/* Section fields rendered by Form component */}
              </Card>
            ))}
          </Form>
        )}
      </div>
    </ErrorBoundary>
  );
};

// Styles
const styles = {
  'profile-container': {
    padding: THEME.SPACING.LARGE,
    maxWidth: '800px',
    margin: '0 auto'
  },
  'profile-title': {
    fontSize: THEME.TYPOGRAPHY.FONT_SIZES.XLARGE,
    marginBottom: THEME.SPACING.LARGE,
    color: THEME.COLORS.TEXT
  },
  'profile-section': {
    marginBottom: THEME.SPACING.MEDIUM
  },
  'error-container': {
    padding: THEME.SPACING.LARGE,
    color: THEME.COLORS.ERROR,
    textAlign: 'center'
  }
};

export default BeneficiaryProfile;