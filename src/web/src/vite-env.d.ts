/// <reference types="vite/client" />

/**
 * Global application version declaration
 * @type {string}
 */
declare const __APP_VERSION__: string;

/**
 * Type definition for static image imports with metadata
 * Supports PNG, JPG and WebP formats with dimension information
 */
type StaticImageImport = {
  src: string;
  width: number;
  height: number;
  format?: 'png' | 'jpg' | 'webp';
};

/**
 * Type definition for generic static asset imports
 * Used for non-image assets like fonts, documents etc.
 */
type StaticAssetImport = string;

/**
 * Type definition for application environment states
 */
type Environment = 'development' | 'staging' | 'production';

/**
 * Extended environment variables interface for Vite
 * Provides type definitions for all configuration variables
 */
interface ImportMetaEnv {
  /**
   * Base URL for API endpoints
   */
  readonly VITE_API_URL: string;

  /**
   * Authentication service URL
   */
  readonly VITE_AUTH_URL: string;

  /**
   * Current environment identifier
   */
  readonly VITE_ENVIRONMENT: Environment;

  /**
   * API key for LLM service integration
   */
  readonly VITE_LLM_API_KEY: string;

  /**
   * Storage service URL for document management
   */
  readonly VITE_STORAGE_URL: string;

  /**
   * Global API timeout configuration in milliseconds
   */
  readonly VITE_API_TIMEOUT: number;

  /**
   * Flag to enable mock service workers for development
   */
  readonly VITE_ENABLE_MOCK: boolean;
}

/**
 * Extended ImportMeta interface to include Vite-specific env
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}