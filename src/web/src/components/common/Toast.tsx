import React, { useEffect, useCallback, useRef } from 'react';
import styled from '@mui/material/styles/styled';
import { Snackbar, Alert, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../../config/theme.config';

// Constants
const ANIMATION_DURATION = 300;
const DEFAULT_AUTO_HIDE_DURATION = 5000;
const MOBILE_BREAKPOINT = 768;

// Interfaces
interface ToastProps {
  message: string;
  severity?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  onClose?: () => void;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  isRTL?: boolean;
  zIndex?: number;
  id?: string;
  role?: 'alert' | 'status';
  style?: React.CSSProperties;
  'aria-live'?: 'polite' | 'assertive';
  'aria-atomic'?: 'true' | 'false' | boolean;
  'data-testid'?: string;
  tabIndex?: number;
}

// Styled Components
const StyledSnackbar = styled(Snackbar, {
  shouldForwardProp: (prop) => !['isRTL'].includes(prop as string),
})<{ isRTL?: boolean }>(({ theme, isRTL }) => ({
  '& .MuiSnackbar-root': {
    direction: isRTL ? 'rtl' : 'ltr',
  },
  '@media (max-width: ${MOBILE_BREAKPOINT}px)': {
    width: '100%',
    '& .MuiSnackbar-root': {
      left: theme.spacing(2),
      right: theme.spacing(2),
      width: 'auto',
    },
  },
  '& .MuiSnackbar-anchorOriginTopCenter': {
    top: theme.spacing(2),
  },
  '& .MuiSnackbar-anchorOriginBottomCenter': {
    bottom: theme.spacing(2),
  },
  animation: 'toast-enter ${ANIMATION_DURATION}ms ease-out',
  '@keyframes toast-enter': {
    '0%': {
      transform: 'translateY(100%)',
      opacity: 0,
    },
    '100%': {
      transform: 'translateY(0)',
      opacity: 1,
    },
  },
}));

const StyledAlert = styled(Alert)(({ theme, severity }) => ({
  minWidth: '300px',
  maxWidth: '600px',
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  fontSize: theme.typography.body2.fontSize,
  alignItems: 'center',
  color: theme.palette.getContrastText(
    theme.palette[severity || 'info'].main
  ),
  '& .MuiAlert-icon': {
    fontSize: '24px',
    marginRight: theme.spacing(2),
  },
  '& .MuiAlert-action': {
    marginLeft: 'auto',
    paddingLeft: theme.spacing(2),
    marginRight: -theme.spacing(0.5),
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  '@media (max-width: ${MOBILE_BREAKPOINT}px)': {
    width: '100%',
    maxWidth: 'none',
  },
}));

const Toast: React.FC<ToastProps> = ({
  message,
  severity = 'info',
  duration = DEFAULT_AUTO_HIDE_DURATION,
  position = 'bottom-center',
  onClose,
  action,
  icon,
  isRTL = false,
  zIndex = lightTheme.zIndex.snackbar,
  id,
  role,
  style,
  'aria-live': ariaLive,
  'aria-atomic': ariaAtomic,
  'data-testid': dataTestId,
  tabIndex,
}) => {
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);
  const timerRef = useRef<number>();
  const alertRef = useRef<HTMLDivElement>(null);

  // Convert position to MUI anchor origin
  const getAnchorOrigin = useCallback(() => {
    const [vertical, horizontal] = position.split('-');
    return {
      vertical: vertical as 'top' | 'bottom',
      horizontal: horizontal === 'center' ? 'center' : `${horizontal}` as 'left' | 'right' | 'center',
    };
  }, [position]);

  const handleClose = useCallback((event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setOpen(false);
    
    // Return focus to the previously focused element
    const previouslyFocusedElement = document.activeElement as HTMLElement;
    if (previouslyFocusedElement && previouslyFocusedElement !== document.body) {
      previouslyFocusedElement.focus();
    }

    // Call onClose callback after animation
    setTimeout(() => {
      onClose?.();
    }, ANIMATION_DURATION);
  }, [onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
    if (event.key === 'Tab') {
      // Trap focus within the alert
      const focusableElements = alertRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [handleClose]);

  useEffect(() => {
    // Auto-focus the alert when it appears
    alertRef.current?.focus();

    // Set up auto-hide timer
    if (duration !== null && duration > 0) {
      timerRef.current = window.setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [duration, handleClose]);

  return (
    <StyledSnackbar
      open={open}
      anchorOrigin={getAnchorOrigin()}
      isRTL={isRTL}
      id={id}
      style={{ zIndex, ...style }}
    >
      <StyledAlert
        ref={alertRef}
        severity={severity}
        onClose={handleClose}
        icon={icon}
        action={
          action || (
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
              onKeyDown={handleKeyDown}
            >
              ×
            </IconButton>
          )
        }
        tabIndex={tabIndex ?? 0}
        role={role ?? 'alert'}
        aria-live={ariaLive ?? 'polite'}
        aria-atomic={ariaAtomic}
        data-testid={dataTestId}
      >
        {message}
      </StyledAlert>
    </StyledSnackbar>
  );
};

export type { ToastProps };
export default Toast;