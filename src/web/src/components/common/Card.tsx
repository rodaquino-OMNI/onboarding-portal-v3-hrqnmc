import React from 'react'; // v18.0.0
import { styled } from '@mui/material/styles'; // v5.0.0
import Paper from '@mui/material/Paper'; // v5.0.0
import { useTheme } from '@mui/material/styles'; // v5.0.0
import { lightTheme, darkTheme } from '../../config/theme.config';
import Loading from './Loading';

// Interface for Card component props
interface CardProps {
  children: React.ReactNode;
  elevation?: number;
  loading?: boolean;
  noPadding?: boolean;
  className?: string;
  testId?: string;
  ariaLabel?: string;
  role?: string;
}

// Styled component for the card with theme support
const StyledCard = styled(Paper)(({ theme, noPadding = false }) => ({
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
  elevation = 1,
  loading = false,
  noPadding = false,
  className,
  testId = 'card',
  ariaLabel,
  role = 'region',
}) => {
  const theme = useTheme();

  return (
    <StyledCard
      elevation={elevation}
      noPadding={noPadding}
      className={className}
      data-testid={testId}
      aria-label={ariaLabel}
      role={role}
      aria-busy={loading}
      tabIndex={0}
    >
      {loading ? (
        <Loading 
          size="md"
          overlay={false}
          testId={`${testId}-loading`}
        />
      ) : (
        children
      )}
    </StyledCard>
  );
});

// Display name for debugging
Card.displayName = 'Card';

export default Card;