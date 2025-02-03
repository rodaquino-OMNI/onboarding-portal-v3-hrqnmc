import { createTheme, useMediaQuery } from '@mui/material';
import { Theme } from '@mui/material/styles';
import { THEME } from '../constants/app.constants';

// Theme storage key for persisting user preference
const THEME_STORAGE_KEY = 'theme_preference';
const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/**
 * Validates color combinations meet WCAG 2.1 AA contrast requirements
 * @param backgroundColor - Background color in hex format
 * @param textColor - Text color in hex format
 * @returns boolean indicating if contrast ratio meets WCAG 2.1 AA standards
 */
const validateContrastRatio = (backgroundColor: string, textColor: string): boolean => {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;
    
    const toSRGB = (c: number): number => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    return 0.2126 * toSRGB(r) + 0.7152 * toSRGB(g) + 0.0722 * toSRGB(b);
  };

  const l1 = getLuminance(backgroundColor);
  const l2 = getLuminance(textColor);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  return ratio >= 4.5; // WCAG 2.1 AA standard
};

/**
 * Creates a customized Material-UI theme with AUSTA design system specifications
 * @param themeOptions - Additional theme options to merge
 * @param isDarkMode - Whether to apply dark mode styles
 * @returns Configured Material-UI theme object
 */
const createCustomTheme = (themeOptions = {}, isDarkMode = false): Theme => {
  const baseTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: THEME.COLORS.PRIMARY,
        contrastText: THEME.COLORS.CONTRAST.PRIMARY,
      },
      secondary: {
        main: THEME.COLORS.SECONDARY,
        contrastText: THEME.COLORS.CONTRAST.SECONDARY,
      },
      error: {
        main: THEME.COLORS.ERROR,
        contrastText: THEME.COLORS.CONTRAST.ERROR,
      },
      warning: {
        main: THEME.COLORS.WARNING,
      },
      background: {
        default: isDarkMode ? '#121212' : THEME.COLORS.BACKGROUND,
        paper: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      },
      text: {
        primary: isDarkMode ? '#FFFFFF' : THEME.COLORS.TEXT,
        secondary: isDarkMode ? '#B0B0B0' : '#666666',
      },
    },
    typography: {
      fontFamily: THEME.TYPOGRAPHY.FONT_FAMILY,
      fontSize: parseInt(THEME.TYPOGRAPHY.FONT_SIZES.MEDIUM),
      fontWeightRegular: THEME.TYPOGRAPHY.FONT_WEIGHTS.REGULAR,
      fontWeightMedium: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
      fontWeightBold: THEME.TYPOGRAPHY.FONT_WEIGHTS.BOLD,
      h1: {
        fontSize: '2.5rem',
        fontWeight: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
        lineHeight: THEME.TYPOGRAPHY.LINE_HEIGHTS.MEDIUM,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
        lineHeight: THEME.TYPOGRAPHY.LINE_HEIGHTS.MEDIUM,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
        lineHeight: THEME.TYPOGRAPHY.LINE_HEIGHTS.MEDIUM,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
        lineHeight: THEME.TYPOGRAPHY.LINE_HEIGHTS.MEDIUM,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
        lineHeight: THEME.TYPOGRAPHY.LINE_HEIGHTS.MEDIUM,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: THEME.TYPOGRAPHY.FONT_WEIGHTS.MEDIUM,
        lineHeight: THEME.TYPOGRAPHY.LINE_HEIGHTS.MEDIUM,
      },
    },
    spacing: (factor: number) => `${factor * parseInt(THEME.SPACING.UNIT)}px`,
    breakpoints: {
      values: {
        xs: 320,
        sm: 768,
        md: 1024,
        lg: 1440,
        xl: 1920,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            minHeight: '44px', // WCAG touch target size
            textTransform: 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              minHeight: '44px', // WCAG touch target size
            },
          },
        },
      },
      MuiFocusRing: {
        defaultProps: {
          color: 'primary',
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          '@global': {
            '*:focus-visible': {
              outline: `2px solid ${THEME.COLORS.PRIMARY}`,
              outlineOffset: '2px',
            },
            body: {
              transition: 'background-color 0.3s ease',
            },
          },
        },
      },
    },
    ...themeOptions,
  });

  return baseTheme;
};

// Export light theme configuration
export const lightTheme = createCustomTheme();

// Export dark theme configuration
export const darkTheme = createCustomTheme({}, true);

/**
 * Custom hook for theme management
 * @returns Theme object and toggle function
 */
export const useTheme = () => {
  const prefersDarkMode = useMediaQuery(COLOR_SCHEME_QUERY);
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const isDarkMode = storedTheme ? storedTheme === 'dark' : prefersDarkMode;
  
  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    window.dispatchEvent(new Event('themechange'));
  };

  return {
    theme: isDarkMode ? darkTheme : lightTheme,
    toggleTheme,
  };
};