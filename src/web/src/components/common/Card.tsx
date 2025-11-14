import React from 'react'; // v18.0.0
import { styled } from '@mui/material/styles'; // v5.0.0
import Paper from '@mui/material/Paper'; // v5.0.0
import { useTheme } from '@mui/material/styles'; // v5.0.0
import { lightTheme, darkTheme } from '../../config/theme.config';
import Loading from './Loading';

// Interface for Card component props
interface CardProps {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: string;
  padding?: string;
  elevation?: number;
  loading?: boolean;
  noPadding?: boolean;
  className?: string;
  testId?: string;
  ariaLabel?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  hoverable?: boolean;
  tabIndex?: number;
}

// Define custom props for styled component
interface StyledCardProps {
  noPadding?: boolean;
}

// Styled component for the card with theme support
const StyledCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'noPadding',
})<StyledCardProps>(({ theme, noPadding = false }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: noPadding ? 0 : theme.spacing(3),
  width: '100%',
  height: 'fit-content',
  position: 'relative',
  transition: theme.transitions.create(['background-color', 'box-shadow']),
  color: theme.palette.text.primary,

  // Responsive padding
  [`@media (max-width: ${theme.breakpoints.values.sm}px)`]: {
    padding: noPadding ? 0 : theme.spacing(2),
  },

  // Accessibility - Reduced motion
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
  },

  // Focus visible styles
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

/**
 * Card component implementing AUSTA's design system specifications
 * with accessibility features and theme support
 */
const Card = React.memo<CardProps>(({
  children,
  title,
  subtitle,
  headerActions,
  footer,
  elevation = 1,
  loading = false,
  noPadding = false,
  className,
  testId = 'card',
  ariaLabel,
  'aria-label': ariaLabelProp,
  'aria-describedby': ariaDescribedBy,
  role = 'region',
  style,
  onClick,
  onKeyDown,
  tabIndex,
}) => {
  const theme = useTheme();

  // Prefer aria-label prop over ariaLabel for consistency
  const effectiveAriaLabel = ariaLabelProp || ariaLabel;

  return (
    <StyledCard
      elevation={elevation}
      noPadding={noPadding}
      className={className}
      data-testid={testId}
      aria-label={effectiveAriaLabel}
      aria-describedby={ariaDescribedBy}
      role={role}
      aria-busy={loading}
      style={style}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
    >
      {loading ? (
        <Loading
          size="md"
          overlay={false}
          testId={`${testId}-loading`}
        />
      ) : (
        <>
          {(title || subtitle || headerActions) && (
            <div style={{ marginBottom: theme.spacing(2) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {title && (
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 500 }}>
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p style={{ margin: '4px 0 0 0', color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
                      {subtitle}
                    </p>
                  )}
                </div>
                {headerActions && <div>{headerActions}</div>}
              </div>
            </div>
          )}
          {children}
          {footer && (
            <div style={{ marginTop: theme.spacing(2), borderTop: `1px solid ${theme.palette.divider}`, paddingTop: theme.spacing(2) }}>
              {footer}
            </div>
          )}
        </>
      )}
    </StyledCard>
  );
});

// Display name for debugging
Card.displayName = 'Card';

export default Card;