import React from 'react'; // v18.0.0
import classNames from 'classnames'; // v2.3.2
import styles from '../../styles/theme.css';

interface ButtonProps {
  /** Content to be rendered inside the button */
  children: React.ReactNode;
  /** Visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  /** Size variant affecting padding and font size */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state of the button */
  disabled?: boolean;
  /** Loading state showing a spinner */
  loading?: boolean;
  /** Makes the button occupy full width of container */
  fullWidth?: boolean;
  /** Click handler function */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** HTML button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Inline CSS styles */
  style?: React.CSSProperties;
}

const Button = React.memo<ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className,
  ariaLabel,
  style,
}) => {
  // Compose class names based on props
  const buttonClasses = classNames(
    styles.button,
    styles[`button--${variant}`],
    {
      [styles['button--disabled']]: disabled,
      [styles['button--loading']]: loading,
      [styles['button--full-width']]: fullWidth,
      [styles[`button--${size}`]]: size,
    },
    className
  );

  // Loading spinner component
  const LoadingSpinner = () => (
    <div
      className={styles['button__spinner']}
      role="progressbar"
      aria-valuetext="Loading"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="8"
          cy="8"
          r="7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="32"
          strokeDashoffset="32"
          className={styles['button__spinner-circle']}
        />
      </svg>
    </div>
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      style={{
        // Ensure minimum touch target size for mobile
        minWidth: '44px',
        minHeight: '44px',
        ...style,
      }}
    >
      {loading && <LoadingSpinner />}
      <span
        className={classNames(styles['button__content'], {
          [styles['button__content--hidden']]: loading,
        })}
      >
        {children}
      </span>
    </button>
  );
});

// Display name for debugging
Button.displayName = 'Button';

export default Button;

// CSS Module styles - complementing theme.css
const additionalStyles = `
  .button__spinner {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .button__spinner-circle {
    animation: spin 1s linear infinite;
  }

  .button__content--hidden {
    visibility: hidden;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* RTL Support */
  [dir="rtl"] .button {
    margin-left: 0;
    margin-right: var(--spacing-unit);
  }

  /* High Contrast Mode */
  @media (prefers-contrast: more) {
    .button--primary {
      background-color: var(--color-primary-dark);
      border: 2px solid var(--color-text-inverse);
    }
    .button--secondary {
      background-color: var(--color-secondary-dark);
      border: 2px solid var(--color-text-inverse);
    }
  }

  /* Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .button__spinner-circle {
      animation-duration: 0.01ms;
    }
  }
`;