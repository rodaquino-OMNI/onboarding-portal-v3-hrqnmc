import React, { useState, useCallback, useRef, useEffect } from 'react';
import classNames from 'classnames'; // v2.3.2
import InputMask from 'react-input-mask'; // v2.0.4
import { sanitizeInput } from '../../utils/validation.utils';
import { getFieldError } from '../../utils/form.utils';

/**
 * Input mask types supported for Brazilian formats
 */
export enum InputMaskType {
  CPF = 'cpf',
  PHONE = 'phone',
  ZIPCODE = 'zipcode',
  HEALTHCARE_ID = 'healthcare_id'
}

/**
 * Validation rules interface for input validation
 */
interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
}

/**
 * Props interface for the Input component
 */
export interface InputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  type?: 'text' | 'password' | 'email' | 'tel' | 'number';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  autoComplete?: boolean;
  mask?: string;
  maskType?: InputMaskType;
  validationRules?: ValidationRules;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  'data-testid'?: string;
  onChange: (value: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

/**
 * Mask patterns for Brazilian-specific formats
 */
const MASK_PATTERNS = {
  [InputMaskType.CPF]: '999.999.999-99',
  [InputMaskType.PHONE]: '+55 (99) 99999-9999',
  [InputMaskType.ZIPCODE]: '99999-999',
  [InputMaskType.HEALTHCARE_ID]: '99999-aa'
};

/**
 * A comprehensive, accessible input component with Brazilian format support
 */
export const Input: React.FC<InputProps> = ({
  id,
  name,
  label,
  value,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  autoComplete = true,
  mask,
  maskType,
  validationRules,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-required': ariaRequired,
  'data-testid': dataTestId,
  onChange,
  onBlur,
  onFocus
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalError, setInternalError] = useState<string | undefined>(error);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  // Update internal error when prop changes
  useEffect(() => {
    setInternalError(error);
  }, [error]);

  /**
   * Handles input value changes with sanitization and validation
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    let newValue = event.target.value;

    // Sanitize input to prevent XSS
    newValue = sanitizeInput(newValue);

    // Apply validation rules
    if (validationRules) {
      if (validationRules.required && !newValue) {
        setInternalError('Este campo é obrigatório');
      } else if (validationRules.minLength && newValue.length < validationRules.minLength) {
        setInternalError(`Mínimo de ${validationRules.minLength} caracteres`);
      } else if (validationRules.maxLength && newValue.length > validationRules.maxLength) {
        setInternalError(`Máximo de ${validationRules.maxLength} caracteres`);
      } else if (validationRules.pattern && !validationRules.pattern.test(newValue)) {
        setInternalError('Formato inválido');
      } else if (validationRules.custom && !validationRules.custom(newValue)) {
        setInternalError('Valor inválido');
      } else {
        setInternalError(undefined);
      }
    }

    onChange(newValue);
  }, [onChange, validationRules]);

  /**
   * Handles input blur with validation and accessibility
   */
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    
    // Announce errors to screen readers
    if (internalError) {
      const announcement = `Erro no campo ${label}: ${internalError}`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      setTimeout(() => document.body.removeChild(ariaLive), 1000);
    }

    onBlur?.(event);
  }, [internalError, label, onBlur]);

  /**
   * Handles input focus with accessibility announcements
   */
  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setInternalError(undefined);

    // Announce field requirements to screen readers
    if (required) {
      const announcement = `Campo obrigatório: ${label}`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      setTimeout(() => document.body.removeChild(ariaLive), 1000);
    }

    onFocus?.(event);
  }, [label, required, onFocus]);

  const inputProps = {
    id,
    name,
    type,
    value,
    disabled,
    placeholder,
    required,
    onChange: handleChange,
    onBlur: handleBlur,
    onFocus: handleFocus,
    'aria-invalid': !!internalError,
    'aria-required': ariaRequired ?? required,
    'aria-label': ariaLabel ?? label,
    'aria-describedby': classNames(
      ariaDescribedBy,
      internalError && errorId,
      descriptionId
    ),
    'data-testid': dataTestId,
    autoComplete: autoComplete ? 'on' : 'off',
    ref: inputRef,
    className: classNames(
      'input-field',
      {
        'input-error': !!internalError,
        'input-disabled': disabled,
        'input-focused': isFocused
      }
    )
  };

  return (
    <div className="input-container">
      <label 
        htmlFor={id}
        className="input-label"
      >
        {label}
        {required && <span className="input-required" aria-hidden="true">*</span>}
      </label>

      {maskType || mask ? (
        <InputMask
          {...inputProps}
          mask={mask ?? MASK_PATTERNS[maskType!]}
          maskChar={null}
        />
      ) : (
        <input {...inputProps} />
      )}

      {internalError && (
        <div
          id={errorId}
          className="input-error-message"
          role="alert"
        >
          {internalError}
        </div>
      )}

      <div
        id={descriptionId}
        className="input-aria-live"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
};

export default Input;