import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react'; // ^18.0.0
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'; // ^5.0.0
import { lightTheme, darkTheme } from '../config/theme.config';
import { getSecureItem, setSecureItem } from '../utils/storage.utils';

// Constants for theme management
const THEME_STORAGE_KEY = 'austa_theme_preference';
const SYSTEM_DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

// Interface for theme context value
interface ThemeContextType {
  theme: typeof lightTheme;
  isDarkMode: boolean;
  isHighContrast: boolean;
  toggleTheme: () => void;
  toggleHighContrast: () => void;
}

// Props interface for theme provider
interface ThemeProviderProps {
  children: ReactNode;
}

// Create theme context with null initial value
const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Custom hook for accessing theme context with type safety
 * @returns ThemeContextType
 * @throws Error if used outside ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Theme provider component that manages application theming
 * Implements WCAG 2.1 AA compliance and system preference detection
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // State for theme mode and high contrast
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Initialize theme preference from storage or system preference
  useEffect(() => {
    const initializeTheme = async () => {
      const storedTheme = await getSecureItem<'light' | 'dark'>(THEME_STORAGE_KEY);
      if (storedTheme.success && storedTheme.data) {
        setIsDarkMode(storedTheme.data === 'dark');
      } else {
        const prefersDark = window.matchMedia(SYSTEM_DARK_MODE_QUERY).matches;
        setIsDarkMode(prefersDark);
      }
    };

    initializeTheme();
  }, []);

  // Listen for system color scheme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia(SYSTEM_DARK_MODE_QUERY);
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Persist theme preference changes
  useEffect(() => {
    const persistTheme = async () => {
      await setSecureItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    };

    persistTheme();
  }, [isDarkMode]);

  // Memoized theme toggle function
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Memoized high contrast toggle function
  const toggleHighContrast = useCallback(() => {
    setIsHighContrast(prev => !prev);
  }, []);

  // Memoized theme object
  const theme = useMemo(() => {
    const baseTheme = isDarkMode ? darkTheme : lightTheme;
    if (isHighContrast) {
      return {
        ...baseTheme,
        palette: {
          ...baseTheme.palette,
          background: {
            default: isDarkMode ? '#000000' : '#FFFFFF',
            paper: isDarkMode ? '#000000' : '#FFFFFF',
          },
          text: {
            primary: isDarkMode ? '#FFFFFF' : '#000000',
            secondary: isDarkMode ? '#FFFFFF' : '#000000',
          },
        },
      };
    }
    return baseTheme;
  }, [isDarkMode, isHighContrast]);

  // Memoized context value
  const contextValue = useMemo(
    () => ({
      theme,
      isDarkMode,
      isHighContrast,
      toggleTheme,
      toggleHighContrast,
    }),
    [theme, isDarkMode, isHighContrast, toggleTheme, toggleHighContrast]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;