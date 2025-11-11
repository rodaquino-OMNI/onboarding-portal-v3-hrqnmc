import React, { useCallback, useEffect, useState } from 'react';
import { isBrazilianState } from '../../utils/type-guards.utils';
import { z } from 'zod'; // v3.22.0
import Form, { useForm } from '../common/Form';
import Input from '../common/Input';
import { 
  validateCPF, 
  validatePhone, 
  validateEmail, 
  validateZipCode,
  VALIDATION_CONSTANTS,
  ERROR_MESSAGES 
} from '../../utils/validation.utils';
import type { Address, Guardian } from '../../types/enrollment.types';

/**
 * Props for the GuardianForm component
 */
interface GuardianFormProps {
  initialValues?: Partial<Guardian>;
  onSubmit: (guardian: Guardian, audit: AuditLog) => Promise<void>;
  loading?: boolean;
  encryptionKey: string;
}

/**
 * Audit log entry for guardian form interactions
 */
interface AuditLog {
  timestamp: Date;
  action: string;
  field?: string;
  metadata?: Record<string, any>;
}

/**
 * Zod schema for guardian form validation with Brazilian-specific rules
 */
const guardianSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]*$/, 'Nome não pode conter caracteres especiais'),
  
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, ERROR_MESSAGES.CPF_INVALID),
  
  rg: z.string()
    .min(4, 'RG deve ter no mínimo 4 caracteres')
    .max(20, 'RG deve ter no máximo 20 caracteres')
    .regex(/^[0-9A-Z-]*$/, 'RG deve conter apenas números e letras'),
  
  dateOfBirth: z.date()
    .refine(date => {
      const age = Math.floor((new Date().getTime() - date.getTime()) / 31536000000);
      return age >= 18;
    }, 'Responsável deve ter no mínimo 18 anos'),
  
  email: z.string()
    .email('E-mail inválido')
    .max(100, 'E-mail deve ter no máximo 100 caracteres'),
  
  phone: z.string()
    .regex(/^\+55 \(\d{2}\) \d{5}-\d{4}$/, ERROR_MESSAGES.PHONE_INVALID),
  
  address: z.object({
    street: z.string()
      .min(5, 'Logradouro deve ter no mínimo 5 caracteres')
      .max(100, 'Logradouro deve ter no máximo 100 caracteres'),
    number: z.string()
      .min(1, 'Número é obrigatório')
      .max(10, 'Número deve ter no máximo 10 caracteres'),
    complement: z.string()
      .max(50, 'Complemento deve ter no máximo 50 caracteres')
      .optional(),
    neighborhood: z.string()
      .min(2, 'Bairro deve ter no mínimo 2 caracteres')
      .max(50, 'Bairro deve ter no máximo 50 caracteres'),
    city: z.string()
      .min(2, 'Cidade deve ter no mínimo 2 caracteres')
      .max(50, 'Cidade deve ter no máximo 50 caracteres'),
    state: z.string()
      .length(2, 'Use a sigla do estado (ex: SP)')
      .refine(
        state => isBrazilianState(state),
        'Estado inválido'
      ),
    zipCode: z.string()
      .regex(/^\d{5}-\d{3}$/, ERROR_MESSAGES.ZIPCODE_INVALID)
  }),
  
  relationship: z.enum(['PARENT', 'LEGAL_GUARDIAN'], {
    errorMap: () => ({ message: 'Selecione o tipo de responsável' })
  }),
  
  documents: z.array(z.object({
    type: z.string(),
    url: z.string().url('URL do documento inválida'),
    hash: z.string()
  })).optional()
});

/**
 * GuardianForm component for collecting guardian information with enhanced security
 */
const GuardianForm: React.FC<GuardianFormProps> = ({
  initialValues,
  onSubmit,
  loading = false,
  encryptionKey
}) => {
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [formValues, setFormValues] = useState(initialValues || {});

  /**
   * Handles field value changes
   */
  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormValues(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      }
      // Handle nested fields like address.street
      const result = { ...prev };
      let current: any = result;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return result;
    });
  }, []);

  /**
   * Logs form actions for audit trail
   */
  const logAction = useCallback((action: string, field?: string, metadata?: Record<string, any>) => {
    const logEntry: AuditLog = {
      timestamp: new Date(),
      action,
      field,
      metadata
    };
    setAuditLog(prev => [...prev, logEntry]);
  }, []);

  /**
   * Handles address lookup using CEP (Brazilian postal code)
   */
  const handleAddressLookup = useCallback(async (zipCode: string) => {
    try {
      const cleanZip = zipCode.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
      const data = await response.json();

      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      return {
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
        zipCode
      };
    } catch (error) {
      logAction('address_lookup_error', 'zipCode', { error: error.message });
      throw new Error('Erro ao buscar endereço. Tente novamente.');
    }
  }, [logAction]);

  /**
   * Handles form submission with validation and security measures
   */
  const handleSubmit = useCallback(async (values: Record<string, any>) => {
    try {
      // Validate form data
      const guardian = await guardianSchema.parseAsync(values);

      // Create audit trail
      const submitAudit: AuditLog = {
        timestamp: new Date(),
        action: 'guardian_form_submit',
        metadata: {
          guardianType: guardian.relationship,
          hasDocuments: guardian.documents?.length > 0
        }
      };

      // Submit data
      await onSubmit(guardian, submitAudit);
      logAction('guardian_form_success');
    } catch (error) {
      logAction('guardian_form_error', undefined, { error: error.message });
      throw error;
    }
  }, [onSubmit, logAction]);

  return (
    <Form
      validationSchema={guardianSchema}
      initialValues={formValues}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel="Salvar Responsável"
      formId="guardian-form"
      a11yConfig={{
        ariaLive: 'polite',
        screenReaderInstructions: 'Formulário de cadastro do responsável legal. Todos os campos marcados com asterisco são obrigatórios.'
      }}
      securityConfig={{
        encryptFields: ['cpf', 'rg', 'email', 'phone'],
        maskFields: ['cpf', 'phone'],
        auditLog: true,
        lgpdCompliance: true
      }}
    >
      <Input
        id="name"
        name="name"
        label="Nome Completo"
        value={formValues.name || ''}
        onChange={(value) => handleFieldChange('name', value)}
        required
        validationRules={{
          required: true,
          minLength: 2,
          maxLength: 100,
          pattern: /^[a-zA-ZÀ-ÿ\s]*$/
        }}
        data-testid="guardian-name-input"
      />

      <Input
        id="cpf"
        name="cpf"
        label="CPF"
        value={formValues.cpf || ''}
        onChange={(value) => handleFieldChange('cpf', value)}
        required
        maskType="cpf"
        validationRules={{
          required: true,
          custom: validateCPF
        }}
        data-testid="guardian-cpf-input"
      />

      <Input
        id="rg"
        name="rg"
        label="RG"
        value={formValues.rg || ''}
        onChange={(value) => handleFieldChange('rg', value)}
        required
        validationRules={{
          required: true,
          minLength: 4,
          maxLength: 20
        }}
        data-testid="guardian-rg-input"
      />

      <Input
        id="dateOfBirth"
        name="dateOfBirth"
        label="Data de Nascimento"
        type="date"
        value={formValues.dateOfBirth || ''}
        onChange={(value) => handleFieldChange('dateOfBirth', value)}
        required
        validationRules={{
          required: true,
          custom: (date) => {
            const age = Math.floor((new Date().getTime() - new Date(date).getTime()) / 31536000000);
            return age >= 18;
          }
        }}
        data-testid="guardian-birth-input"
      />

      <Input
        id="email"
        name="email"
        label="E-mail"
        type="email"
        value={formValues.email || ''}
        onChange={(value) => handleFieldChange('email', value)}
        required
        validationRules={{
          required: true,
          custom: validateEmail
        }}
        data-testid="guardian-email-input"
      />

      <Input
        id="phone"
        name="phone"
        label="Telefone"
        value={formValues.phone || ''}
        onChange={(value) => handleFieldChange('phone', value)}
        required
        maskType="phone"
        validationRules={{
          required: true,
          custom: validatePhone
        }}
        data-testid="guardian-phone-input"
      />

      <Input
        id="address.zipCode"
        name="address.zipCode"
        label="CEP"
        value={formValues.address?.zipCode || ''}
        onChange={(value) => handleFieldChange('address.zipCode', value)}
        required
        maskType="zipcode"
        validationRules={{
          required: true,
          custom: validateZipCode
        }}
        onBlur={async (e) => {
          try {
            const address = await handleAddressLookup(e.target.value);
            // Form context will handle setting these values
          } catch (error) {
            // Error handling done in handleAddressLookup
          }
        }}
        data-testid="guardian-zipcode-input"
      />

      <Input
        id="address.street"
        name="address.street"
        label="Logradouro"
        value={formValues.address?.street || ''}
        onChange={(value) => handleFieldChange('address.street', value)}
        required
        validationRules={{
          required: true,
          minLength: 5,
          maxLength: 100
        }}
        data-testid="guardian-street-input"
      />

      <Input
        id="address.number"
        name="address.number"
        label="Número"
        value={formValues.address?.number || ''}
        onChange={(value) => handleFieldChange('address.number', value)}
        required
        validationRules={{
          required: true,
          maxLength: 10
        }}
        data-testid="guardian-number-input"
      />

      <Input
        id="address.complement"
        name="address.complement"
        label="Complemento"
        value={formValues.address?.complement || ''}
        onChange={(value) => handleFieldChange('address.complement', value)}
        validationRules={{
          maxLength: 50
        }}
        data-testid="guardian-complement-input"
      />

      <Input
        id="address.neighborhood"
        name="address.neighborhood"
        label="Bairro"
        value={formValues.address?.neighborhood || ''}
        onChange={(value) => handleFieldChange('address.neighborhood', value)}
        required
        validationRules={{
          required: true,
          minLength: 2,
          maxLength: 50
        }}
        data-testid="guardian-neighborhood-input"
      />

      <Input
        id="address.city"
        name="address.city"
        label="Cidade"
        value={formValues.address?.city || ''}
        onChange={(value) => handleFieldChange('address.city', value)}
        required
        validationRules={{
          required: true,
          minLength: 2,
          maxLength: 50
        }}
        data-testid="guardian-city-input"
      />

      <Input
        id="address.state"
        name="address.state"
        label="Estado"
        value={formValues.address?.state || ''}
        onChange={(value) => handleFieldChange('address.state', value)}
        required
        validationRules={{
          required: true,
          length: 2,
          custom: (state) => isBrazilianState(state)
        }}
        data-testid="guardian-state-input"
      />

      <Input
        id="relationship"
        name="relationship"
        label="Tipo de Responsável"
        type="select"
        value={formValues.relationship || ''}
        onChange={(value) => handleFieldChange('relationship', value)}
        required
        options={[
          { value: 'PARENT', label: 'Pai/Mãe' },
          { value: 'LEGAL_GUARDIAN', label: 'Responsável Legal' }
        ]}
        data-testid="guardian-relationship-input"
      />
    </Form>
  );
};

export default GuardianForm;