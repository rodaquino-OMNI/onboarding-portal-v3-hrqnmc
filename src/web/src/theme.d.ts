import '@mui/material/styles';
import '@emotion/react';

declare module '@mui/material/styles' {
  interface Theme {
    colors: {
      primary: string;
      secondary: string;
      error: string;
      warning: string;
      success: string;
      info: string;
      background: string;
      text: string;
      contrast: {
        primary: string;
        secondary: string;
        error: string;
      };
    };
  }

  interface ThemeOptions {
    colors?: {
      primary?: string;
      secondary?: string;
      error?: string;
      warning?: string;
      success?: string;
      info?: string;
      background?: string;
      text?: string;
      contrast?: {
        primary?: string;
        secondary?: string;
        error?: string;
      };
    };
  }
}

declare module '@emotion/react' {
  export interface Theme {
    colors: {
      primary: string;
      secondary: string;
      error: string;
      warning: string;
      success: string;
      info: string;
      background: {
        default: string;
        secondary: string;
        paper: string;
      };
      text: {
        primary: string;
        secondary: string;
      };
      contrast: {
        primary: string;
        secondary: string;
        error: string;
      };
    };
  }
}
