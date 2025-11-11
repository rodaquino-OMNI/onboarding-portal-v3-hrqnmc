import React from 'react';

// Mock theme object
const mockTheme = {
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#dc004e',
      light: '#f73378',
      dark: '#9a0036',
      contrastText: '#fff',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
    background: {
      default: '#fafafa',
      paper: '#fff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.54)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  spacing: (factor: number) => `${8 * factor}px`,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
};

const mockThemeContext = {
  theme: mockTheme,
  isDarkMode: false,
  isHighContrast: false,
  toggleTheme: jest.fn(),
  toggleHighContrast: jest.fn(),
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-theme-provider">{children}</div>;
};

export const useTheme = jest.fn(() => mockThemeContext);

export default {
  ThemeProvider,
  useTheme,
};
