import React, { useCallback, useEffect, useState } from 'react';
import { z } from 'zod'; // v3.22.0
import { Form, useForm } from '../common/Form';
import Input from '../common/Input';
import {
  Beneficiary,
  BeneficiaryType,
  Address,
  beneficiarySchema
} from '../../types/enrollment.types';
import {
  validateCPF,
  validatePhone,
  validateEmail,
  sanitizeInput,
  encryptField,
  VALIDATION_CONSTANTS
} from '../../utils/validation.utils';
import { formatFieldValue, ARIA_LABELS } from '../../utils/form.utils';

/**
 * Props for the BeneficiaryForm component
 */
interface BeneficiaryFormProps {
  initialData?: Partial<Beneficiary>;
  onSubmit: (beneficiary: Beneficiary) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  userRole: string;
  encryptionKey: string;
  auditLogger: (action: string, data: any) => void;
}

/**
 * Enhanced validation schema for beneficiary form with Brazilian-specific rules
 */
const validationSchema = z.object({
  type: z.nativeEnum(BeneficiaryType),
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]*$/, 'Nome deve conter apenas letras e acentos'),
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato 000.000.000-00')
    .refine(cpf => validateCPF(cpf).isValid, 'CPF inválido'),
  rg: z.string()
    .min(1, 'RG é obrigatório')
    .max(20, 'RG deve ter no máximo 20 caracteres'),
  dateOfBirth: z.date()
    .refine(date => {
      const age = new Date().getFullYear() - date.getFullYear();
      return age >= 0 && age <= 120;
    }, 'Data de nascimento inválida'),
  email: z.string()
    .email('E-mail inválido')
    .refine(email => validateEmail(email).isValid, 'E-mail inválido'),
  phone: z.string()
    .regex(/^\+55 \(\d{2}\) \d{5}-\d{4}$/, 'Telefone deve estar no formato +55 (XX) XXXXX-XXXX')
    .refine(phone => validatePhone(phone).isValid, 'Telefone inválido'),
  address: z.object({
    street: z.string()
      .min(1, 'Rua é obrigatória')
      .max(100, 'Rua deve ter no máximo 100 caracteres'),
    number: z.string()
      .min(1, 'Número é obrigatório')
      .max(10, 'Número deve ter no máximo 10 caracteres'),
    complement: z.string()
      .max(50, 'Complemento deve ter no máximo 50 caracteres')
      .optional(),
    neighborhood: z.string()
      .min(1, 'Bairro é obrigatório')
      .max(50, 'Bairro deve ter no máximo 50 caracteres'),
    city: z.string()
      .min(1, 'Cidade é obrigatória')
      .max(50, 'Cidade deve ter no máximo 50 caracteres'),
    state: z.string()
      .length(2, 'Estado deve ter 2 caracteres')
      .refine(
        state => VALIDATION_CONSTANTS.BRAZILIAN_STATES.includes(state),
        'Estado inválido'
      ),
    zipCode: z.string()
      .regex(/^\d{5}-\d{3}$/, 'CEP deve estar no formato XXXXX-XXX')
  }),
  guardianId: z.string().uuid().nullable()
});

/**
 * BeneficiaryForm component for collecting beneficiary information
 * with enhanced security and LGPD compliance
 */
export const BeneficiaryForm: React.FC<BeneficiaryFormProps> = ({
  initialData = {},
  onSubmit,
  loading = false,
  disabled = false,
  className = '',
  userRole,
  encryptionKey,
  auditLogger
}) => {
  const [isMinor, setIsMinor] = useState(false);
  const { values, errors, touched, setFieldValue } = useForm();

  // Check if beneficiary is minor on date of birth change
  useEffect(() => {
    if (values.dateOfBirth) {
      const age = new Date().getFullYear() - new Date(values.dateOfBirth).getFullYear();
      setIsMinor(age < 18);
    }
  }, [values.dateOfBirth]);

  /**
   * Handles form submission with security measures and LGPD compliance
   */
  const handleSubmit = useCallback(async (formData: Record<string, any>) => {
    try {
      // Log submission attempt
      auditLogger('beneficiary_form_submit_attempt', { userRole });

      // Sanitize and validate all fields
      const sanitizedData = Object.entries(formData).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: typeof value === 'string' ? sanitizeInput(value) : value
      }), {});

      // Encrypt sensitive data
      const sensitiveFields = ['cpf', 'rg', 'email', 'phone'];
      const encryptedData = sensitiveFields.reduce((acc, field) => ({
        ...acc,
        [field]: encryptField(sanitizedData[field], encryptionKey)
      }), sanitizedData);

      // Transform and validate data
      const validatedData = await validationSchema.parseAsync(encryptedData);

      // Add required guardian for minors
      if (isMinor && !validatedData.guardianId) {
        throw new Error('Responsável legal é obrigatório para menores de idade');
      }

      // Submit data
      await onSubmit(validatedData as Beneficiary);
      
      // Log successful submission
      auditLogger('beneficiary_form_submit_success', {
        userRole,
        beneficiaryType: validatedData.type
      });
    } catch (error) {
      // Log submission error
      auditLogger('beneficiary_form_submit_error', {
        userRole,
        error: error.message
      });
      throw error;
    }
  }, [onSubmit, encryptionKey, isMinor, userRole, auditLogger]);

  return (
    <Form
      validationSchema={validationSchema}
      initialValues={initialData}
      onSubmit={handleSubmit}
      loading={loading}
      disabled={disabled}
      className={className}
      a11yConfig={{
        ariaLive: 'polite',
        screenReaderInstructions: 'Formulário de cadastro de beneficiário. Todos os campos marcados com asterisco são obrigatórios.'
      }}
      securityConfig={{
        encryptFields: ['cpf', 'rg', 'email', 'phone'],
        maskFields: ['cpf', 'rg'],
        auditLog: true,
        lgpdCompliance: true
      }}
    >
      <Input
        id="type"
        name="type"
        label="Tipo de Beneficiário"
        type="text"
        required
        disabled={disabled}
        error={touched.type ? errors.type : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="name"
        name="name"
        label="Nome Completo"
        type="text"
        required
        disabled={disabled}
        error={touched.name ? errors.name : undefined}
        validationRules={{
          required: true,
          minLength: 3,
          maxLength: 100,
          pattern: /^[a-zA-ZÀ-ÿ\s]*$/
        }}
      />

      <Input
        id="cpf"
        name="cpf"
        label="CPF"
        type="text"
        required
        disabled={disabled}
        mask="999.999.999-99"
        error={touched.cpf ? errors.cpf : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="rg"
        name="rg"
        label="RG"
        type="text"
        required
        disabled={disabled}
        error={touched.rg ? errors.rg : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="dateOfBirth"
        name="dateOfBirth"
        label="Data de Nascimento"
        type="date"
        required
        disabled={disabled}
        error={touched.dateOfBirth ? errors.dateOfBirth : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="email"
        name="email"
        label="E-mail"
        type="email"
        required
        disabled={disabled}
        error={touched.email ? errors.email : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="phone"
        name="phone"
        label="Telefone"
        type="tel"
        required
        disabled={disabled}
        mask="+55 (99) 99999-9999"
        error={touched.phone ? errors.phone : undefined}
        validationRules={{ required: true }}
      />

      {/* Address Fields */}
      <Input
        id="address.street"
        name="address.street"
        label="Rua"
        type="text"
        required
        disabled={disabled}
        error={touched.address?.street ? errors.address?.street : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="address.number"
        name="address.number"
        label="Número"
        type="text"
        required
        disabled={disabled}
        error={touched.address?.number ? errors.address?.number : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="address.complement"
        name="address.complement"
        label="Complemento"
        type="text"
        disabled={disabled}
        error={touched.address?.complement ? errors.address?.complement : undefined}
      />

      <Input
        id="address.neighborhood"
        name="address.neighborhood"
        label="Bairro"
        type="text"
        required
        disabled={disabled}
        error={touched.address?.neighborhood ? errors.address?.neighborhood : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="address.city"
        name="address.city"
        label="Cidade"
        type="text"
        required
        disabled={disabled}
        error={touched.address?.city ? errors.address?.city : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="address.state"
        name="address.state"
        label="Estado"
        type="text"
        required
        disabled={disabled}
        error={touched.address?.state ? errors.address?.state : undefined}
        validationRules={{ required: true }}
      />

      <Input
        id="address.zipCode"
        name="address.zipCode"
        label="CEP"
        type="text"
        required
        disabled={disabled}
        mask="99999-999"
        error={touched.address?.zipCode ? errors.address?.zipCode : undefined}
        validationRules={{ required: true }}
      />

      {isMinor && (
        <Input
          id="guardianId"
          name="guardianId"
          label="ID do Responsável Legal"
          type="text"
          required
          disabled={disabled}
          error={touched.guardianId ? errors.guardianId : undefined}
          validationRules={{ required: true }}
        />
      )}
    </Form>
  );
};

export default BeneficiaryForm;