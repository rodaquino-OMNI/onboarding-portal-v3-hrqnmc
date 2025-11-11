import React, { useCallback, useMemo, useRef } from 'react';
import { Select as MuiSelect, FormControl, InputLabel, MenuItem, FormHelperText } from '@mui/material';
import { useTheme } from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getFieldError } from '../../utils/form.utils';

/**
 * Props interface for the Select component following AUSTA design system
 */
interface SelectProps {
  id?: string;
  name: string;
  label: string;
  value: string | number;
  options: Array<{ value: string | number; label: string }>;
  onChange: (value: string | number) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  ariaLabel?: string;
  testId?: string;
}

/**
 * Select component implementing AUSTA's design system specifications
 * Provides an accessible, localized dropdown selection interface
 * @version 1.0.0
 */
const Select: React.FC<SelectProps> = ({
  id,
  name,
  label,
  value,
  options,
  onChange,
  error,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'medium',
  ariaLabel,
  testId
}) => {
  const theme = useTheme();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Virtual list configuration for performance optimization
  const rowVirtualizer = useVirtualizer({
    count: options.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44, // WCAG minimum touch target size
    overscan: 5
  });

  /**
   * Handles select value changes with validation and ARIA announcements
   */
  const handleChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    event.preventDefault();
    const newValue = event.target.value;

    // Validate and sanitize input
    if (typeof newValue === 'string' || typeof newValue === 'number') {
      onChange(newValue);

      // Update ARIA live region for screen readers
      const selectedOption = options.find(opt => opt.value === newValue);
      if (selectedOption) {
        const announcement = `Selecionado: ${selectedOption.label}`;
        const ariaLive = document.createElement('div');
        ariaLive.setAttribute('aria-live', 'polite');
        ariaLive.textContent = announcement;
        document.body.appendChild(ariaLive);
        setTimeout(() => document.body.removeChild(ariaLive), 1000);
      }
    }
  }, [onChange, options]);

  /**
   * Memoized error message with proper formatting
   */
  const errorMessage = useMemo(() => {
    if (!error) return undefined;
    return getFieldError(name, { [name]: error });
  }, [error, name]);

  return (
    <FormControl
      fullWidth={fullWidth}
      error={!!error}
      disabled={disabled}
      data-testid={testId}
      sx={{
        '& .MuiOutlinedInput-root': {
          fontFamily: 'Roboto',
          fontSize: '14px',
          minHeight: '44px', // WCAG minimum touch target
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: '2px'
          }
        },
        '& .MuiFormLabel-root': {
          fontFamily: 'Roboto',
          fontSize: '14px'
        }
      }}
    >
      <InputLabel
        id={`${name}-label`}
        required={required}
        sx={{
          color: error ? theme.palette.error.main : 'inherit'
        }}
      >
        {label}
      </InputLabel>

      <MuiSelect
        labelId={`${name}-label`}
        id={id || name}
        value={value}
        onChange={handleChange}
        label={label}
        size={size}
        aria-label={ariaLabel || label}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        MenuProps={{
          PaperProps: {
            ref: parentRef,
            style: { maxHeight: 300 }
          }
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const option = options[virtualRow.index];
          return (
            <MenuItem
              key={option.value}
              value={option.value}
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
                padding: '8px 16px' // AUSTA spacing units
              }}
            >
              {option.label}
            </MenuItem>
          );
        })}
      </MuiSelect>

      {errorMessage && (
        <FormHelperText
          id={`${name}-error`}
          error
          sx={{
            fontFamily: 'Roboto',
            fontSize: '12px',
            marginLeft: '14px'
          }}
        >
          {errorMessage}
        </FormHelperText>
      )}
    </FormControl>
  );
};

export default Select;