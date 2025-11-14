import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

import Form from '../../components/common/Form';
import { InputMaskType } from '../../components/common/Input';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth.types';
import { authService } from '../../services/auth.service';

// Enhanced validation schema with Brazilian-specific rules
const validationSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
      'Senha deve conter maiúsculas, minúsculas, números e caracteres especiais'
    ),
  confirmPassword: z.string(),
  firstName: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  lastName: z.string()
    .min(2, 'Sobrenome deve ter no mínimo 2 caracteres')
    .max(100, 'Sobrenome deve ter no máximo 100 caracteres'),
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
  phoneNumber: z.string()
    .regex(/^\+55 \(\d{2}\) \d{5}-\d{4}$/, 'Telefone inválido'),
  role: z.nativeEnum(UserRole),
  deviceFingerprint: z.string(),
  acceptTerms: z.boolean()
    .refine((val) => val === true, 'Você deve aceitar os termos'),
  acceptLGPD: z.boolean()
    .refine((val) => val === true, 'Você deve aceitar a política de privacidade')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword']
});

// Interface for form data
interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  cpf: string;
  phoneNumber: string;
  role: UserRole;
  deviceFingerprint: string;
  acceptTerms: boolean;
  acceptLGPD: boolean;
}

// Initial form values
const initialValues: RegisterFormData = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  cpf: '',
  phoneNumber: '',
  role: UserRole.BENEFICIARY,
  deviceFingerprint: '',
  acceptTerms: false,
  acceptLGPD: false
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');

  // Initialize device fingerprint
  useEffect(() => {
    const initFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setDeviceFingerprint(result.visitorId);
    };
    initFingerprint();
  }, []);

  // Handle form submission with enhanced security
  const handleSubmit = useCallback(async (values: RegisterFormData) => {
    try {
      setIsLoading(true);

      // Validate device fingerprint
      const isDeviceValid = await authService.validateDevice(deviceFingerprint);

      if (!isDeviceValid) {
        throw new Error('Dispositivo não autorizado');
      }

      // Register user with enhanced security
      const registrationResult = await authService.register({
        ...values,
        deviceFingerprint,
        ipAddress: window.location.hostname
      });

      // Perform initial login
      const loginResult = await login({
        email: values.email,
        password: values.password,
        deviceFingerprint,
        ipAddress: window.location.hostname
      });

      // Set up MFA if required for role
      if (values.role === UserRole.BROKER ||
          values.role === UserRole.ADMINISTRATOR) {
        // Get user ID from login result or registration result
        const userId = loginResult?.user?.id || registrationResult?.user?.id || '';
        if (userId) {
          await authService.setupMFA(userId);
        }
        navigate('/auth/mfa-setup');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [deviceFingerprint, login, navigate]);

  return (
    <Form
      validationSchema={validationSchema}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      loading={isLoading}
      submitLabel="Cadastrar"
      formId="registration-form"
      locale="pt-BR"
      a11yConfig={{
        ariaLive: 'polite',
        highContrast: false,
        screenReaderInstructions: 'Preencha o formulário de cadastro. Todos os campos marcados com asterisco são obrigatórios.'
      }}
      securityConfig={{
        encryptFields: ['password', 'confirmPassword'],
        maskFields: ['cpf', 'phoneNumber'],
        auditLog: true,
        lgpdCompliance: true
      }}
    >
      <div className="form-grid">
        <div className="form-row">
          <Form.Input
            id="firstName"
            name="firstName"
            label="Nome"
            required={true}
            autoComplete={true}
          />
          <Form.Input
            id="lastName"
            name="lastName"
            label="Sobrenome"
            required={true}
            autoComplete={true}
          />
        </div>

        <Form.Input
          id="email"
          name="email"
          label="Email"
          type="email"
          required={true}
          autoComplete={true}
        />

        <Form.Input
          id="cpf"
          name="cpf"
          label="CPF"
          required={true}
          maskType={InputMaskType.CPF}
          autoComplete={false}
        />

        <Form.Input
          id="phoneNumber"
          name="phoneNumber"
          label="Telefone"
          required={true}
          maskType={InputMaskType.PHONE}
          autoComplete={true}
        />

        <Form.Input
          id="password"
          name="password"
          label="Senha"
          type="password"
          required={true}
          autoComplete={false}
        />

        <Form.Input
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmar Senha"
          type="password"
          required={true}
          autoComplete={false}
        />

        <Form.Select
          id="role"
          name="role"
          label="Tipo de Usuário"
          required
          options={[
            { value: UserRole.BENEFICIARY, label: 'Beneficiário' },
            { value: UserRole.BROKER, label: 'Corretor' },
            { value: UserRole.HR_PERSONNEL, label: 'RH' },
            { value: UserRole.PARENT_GUARDIAN, label: 'Responsável' }
          ]}
        />

        <Form.Checkbox
          id="acceptTerms"
          name="acceptTerms"
          label="Li e aceito os termos de uso"
          required
        />

        <Form.Checkbox
          id="acceptLGPD"
          name="acceptLGPD"
          label="Concordo com o processamento dos meus dados pessoais de acordo com a LGPD"
          required
        />
      </div>
    </Form>
  );
};

export default Register;