import React from 'react'; // v18.0.0
import '../../styles/variables.css';

type LoadingProps = {
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
  text?: string;
  testId?: string;
};

const DEFAULT_LOADING_TEXT = 'Carregando...';

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  overlay = false,
  text = DEFAULT_LOADING_TEXT,
  testId = 'loading-spinner',
}) => {
  // Size mapping for spinner dimensions
  const spinnerSizes = {
    sm: '24px',
    md: '32px',
    lg: '48px',
  };

  // Dynamic styles for the spinner based on size
  const spinnerStyle = {
    width: spinnerSizes[size],
    height: spinnerSizes[size],
  };

  // Base component styles
  const styles = {
    loadingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      gap: 'var(--spacing-sm)',
      willChange: 'opacity, transform',
    },
    loadingSpinner: {
      border: '3px solid var(--color-background-secondary)',
      borderTop: '3px solid var(--color-primary)',
      borderRadius: '50%',
      animation: 'spin var(--transition-speed-normal) linear infinite',
      transformOrigin: 'center center',
      willChange: 'transform',
      ...spinnerStyle,
    },
    loadingOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(4px)',
      zIndex: 'var(--z-index-modal)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: 'var(--color-text-secondary)',
      fontSize: 'var(--font-size-base)',
      fontWeight: 'var(--font-weight-medium)',
      textAlign: 'center' as const,
      marginTop: 'var(--spacing-sm)',
    },
  };

  // Keyframes for spinner animation
  const spinKeyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .loading-spinner {
        animation-duration: 0s;
      }
    }
  `;

  const LoadingContent = (
    <div
      style={styles.loadingContainer}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      <style>{spinKeyframes}</style>
      <div
        className="loading-spinner"
        style={styles.loadingSpinner}
        aria-hidden="true"
      />
      {text && (
        <span style={styles.loadingText} aria-label={text}>
          {text}
        </span>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div style={styles.loadingOverlay} role="dialog" aria-modal="true">
        {LoadingContent}
      </div>
    );
  }

  return LoadingContent;
};

export default Loading;