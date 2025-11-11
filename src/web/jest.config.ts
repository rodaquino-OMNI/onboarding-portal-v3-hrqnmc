// jest.config.ts
// @ts-check
import type { Config } from 'jest';
import { compilerOptions } from './tsconfig.json';

// @version jest: ^29.5.0
// @version @types/jest: ^29.5.0
// @version @testing-library/jest-dom: ^5.16.5

/**
 * Generates the Jest configuration for the React SPA testing environment
 * with comprehensive test coverage and DOM testing support
 */
const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Use jsdom for browser-like environment
  testEnvironment: 'jsdom',

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts'
  ],

  // Module name mapping for path aliases and static assets
  moduleNameMapper: {
    // Path aliases from tsconfig
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',

    // Handle static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // Module paths for mock resolution
  modulePaths: ['<rootDir>/src'],

  // Transform configuration for TypeScript files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }]
  },

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',

  // Coverage thresholds to maintain code quality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!src/main.tsx',
    '!src/App.tsx',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__mocks__/**',
    '!src/**/index.{ts,tsx}',
    '!src/types/**'
  ],

  // Performance and execution configuration
  maxWorkers: '50%',
  testTimeout: 10000,
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Fail tests on any error or warning
  errorOnDeprecated: true,

  // Force exit after test completion
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ]
};

export default config;