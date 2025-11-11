import '@mui/material/styles';
import '@emotion/react';

declare module '@mui/material/styles' {
  interface Theme {
    colors: {
      primary: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      secondary: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      error: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      warning: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      success: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      info: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      background: {
        default: string;
        secondary: string;
        paper: string;
      };
      text: {
        primary: string;
        secondary: string;
        disabled: string;
      };
      contrast: {
        primary: string;
        secondary: string;
        error: string;
      };
    };
    button: {
      default: string;
      hover: string;
      active: string;
      disabled: string;
    };
    tabs: {
      tab: string;
      tabList: string;
      tabPanel: string;
    };
  }

  interface ThemeOptions {
    colors?: {
      primary?: {
        main?: string;
        dark?: string;
        light?: string;
        contrastText?: string;
      };
      secondary?: {
        main?: string;
        dark?: string;
        light?: string;
        contrastText?: string;
      };
      error?: {
        main?: string;
        dark?: string;
        light?: string;
        contrastText?: string;
      };
      warning?: {
        main?: string;
        dark?: string;
        light?: string;
        contrastText?: string;
      };
      success?: {
        main?: string;
        dark?: string;
        light?: string;
        contrastText?: string;
      };
      info?: {
        main?: string;
        dark?: string;
        light?: string;
        contrastText?: string;
      };
      background?: {
        default?: string;
        secondary?: string;
        paper?: string;
      };
      text?: {
        primary?: string;
        secondary?: string;
        disabled?: string;
      };
      contrast?: {
        primary?: string;
        secondary?: string;
        error?: string;
      };
    };
    button?: {
      default?: string;
      hover?: string;
      active?: string;
      disabled?: string;
    };
    tabs?: {
      tab?: string;
      tabList?: string;
      tabPanel?: string;
    };
  }
}

declare module '@emotion/react' {
  export interface Theme {
    colors: {
      primary: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      secondary: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      error: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      warning: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      success: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      info: {
        main: string;
        dark: string;
        light: string;
        contrastText: string;
      };
      background: {
        default: string;
        secondary: string;
        paper: string;
      };
      text: {
        primary: string;
        secondary: string;
        disabled: string;
      };
      contrast: {
        primary: string;
        secondary: string;
        error: string;
      };
    };
    button: {
      default: string;
      hover: string;
      active: string;
      disabled: string;
    };
    tabs: {
      tab: string;
      tabList: string;
      tabPanel: string;
    };
  }
}
