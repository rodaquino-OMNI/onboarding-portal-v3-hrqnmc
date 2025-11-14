import React, { useCallback, useState, useEffect } from 'react';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers'; // v6.0.0
import { ptBR } from '@mui/x-date-pickers/locales'; // v6.0.0
import { formatDate, parseDate } from '../../utils/date.utils';
import { Input } from './Input';
import { THEME, ACCESSIBILITY } from '../../constants/app.constants';

/**
 * Interface for validation rules specific to date fields
 */
interface ValidationRules {
  minAge?: number;
  maxAge?: number;
  minDate?: Date;
  maxDate?: Date;
  disallowFuture?: boolean;
  disallowPast?: boolean;
  customValidation?: (date: Date) => boolean;
}

/**
 * Props interface for the DatePicker component
 */
interface DatePickerProps {
  id: string;
  name: string;
  label: string;
  value: Date | null;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  validationRules?: ValidationRules;
  ariaLabel?: string;
  ariaDescription?: string;
  onChange: (date: Date | null) => void;
  onBlur?: () => void;
  onError?: (error: string) => void;
}

/**
 * A comprehensive date picker component with Brazilian localization and accessibility
 */
const DatePicker: React.FC<DatePickerProps> = ({
  id,
  name,
  label,
  value,
  required = false,
  disabled = false,
  error,
  minDate,
  maxDate,
  validationRules,
  ariaLabel,
  ariaDescription,
  onChange,
  onBlur,
  onError
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [internalError, setInternalError] = useState<string | undefined>(error);
  const [isOpen, setIsOpen] = useState(false);

  // Update internal error when prop changes
  useEffect(() => {
    setInternalError(error);
  }, [error]);

  // Update input value when date value changes
  useEffect(() => {
    if (value) {
      try {
        setInputValue(formatDate(value));
      } catch (err) {
        setInputValue('');
      }
    } else {
      setInputValue('');
    }
  }, [value]);

  /**
   * Validates the selected date against all rules
   */
  const validateDate = useCallback((date: Date | null): string | undefined => {
    if (!date) {
      return required ? 'Data é obrigatória' : undefined;
    }

    const now = new Date();

    if (validationRules) {
      // Age validation
      if (validationRules.minAge || validationRules.maxAge) {
        const age = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        if (validationRules.minAge && age < validationRules.minAge) {
          return `Idade mínima é ${validationRules.minAge} anos`;
        }
        if (validationRules.maxAge && age > validationRules.maxAge) {
          return `Idade máxima é ${validationRules.maxAge} anos`;
        }
      }

      // Future/past validation
      if (validationRules.disallowFuture && date > now) {
        return 'Data não pode ser no futuro';
      }
      if (validationRules.disallowPast && date < now) {
        return 'Data não pode ser no passado';
      }

      // Custom validation
      if (validationRules.customValidation && !validationRules.customValidation(date)) {
        return 'Data inválida';
      }
    }

    // Min/max date validation
    if (minDate && date < minDate) {
      return `Data deve ser após ${formatDate(minDate)}`;
    }
    if (maxDate && date > maxDate) {
      return `Data deve ser antes de ${formatDate(maxDate)}`;
    }

    return undefined;
  }, [required, validationRules, minDate, maxDate]);

  /**
   * Handles date selection with validation
   */
  const handleDateChange = useCallback((date: Date | null) => {
    const error = validateDate(date);
    if (error) {
      setInternalError(error);
      onError?.(error);
    } else {
      setInternalError(undefined);
      onChange(date);
    }
  }, [validateDate, onChange, onError]);

  /**
   * Handles manual input with Brazilian date format parsing
   */
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    
    if (!value) {
      handleDateChange(null);
      return;
    }

    try {
      const date = parseDate(value);
      handleDateChange(date);
    } catch (err) {
      setInternalError('Formato de data inválido (DD/MM/AAAA)');
      onError?.('Formato de data inválido (DD/MM/AAAA)');
    }
  }, [handleDateChange, onError]);

  return (
    <div 
      className="datepicker-container"
      style={{ 
        marginBottom: THEME.SPACING.MEDIUM 
      }}
    >
      <MuiDatePicker
        open={isOpen}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
        value={value}
        onChange={handleDateChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        localeText={ptBR.components.MuiLocalizationProvider.defaultProps.localeText}
        format="dd/MM/yyyy"
        slotProps={{
          textField: {
            InputProps: {
              'aria-label': ariaLabel ?? label,
              'aria-invalid': !!internalError,
              'aria-required': required,
              'aria-describedby': ariaDescription,
              style: {
                fontFamily: THEME.TYPOGRAPHY.FONT_FAMILY,
                fontSize: THEME.TYPOGRAPHY.FONT_SIZES.MEDIUM
              }
            },
            error: !!internalError,
            helperText: internalError,
            required: required,
            disabled: disabled,
            fullWidth: true,
            onBlur: onBlur
          },
          dialog: {
            'aria-label': `Calendário para ${label}`,
            sx: {
              '& .MuiPickersDay-root': {
                minWidth: ACCESSIBILITY.MIN_TOUCH_TARGET_SIZE,
                minHeight: ACCESSIBILITY.MIN_TOUCH_TARGET_SIZE
              }
            }
          }
        }}
        slots={{
          textField: (props: any) => (
            <Input
              {...props}
              id={id}
              name={name}
              label={label}
              value={inputValue}
              onChange={handleInputChange}
              error={internalError}
              required={required}
              disabled={disabled}
              placeholder="DD/MM/AAAA"
            />
          )
        }}
      />
    </div>
  );
};

export default DatePicker;