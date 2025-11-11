import type { Config } from 'jest';

/**
 * Enterprise-grade Jest configuration for Pre-paid Health Plan Onboarding Portal backend services
 * Version: 1.0.0
 * Dependencies:
 * - ts-jest@29.1.0
 * - @types/jest@29.5.0
 */

const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Define root directories for all microservices
  roots: [
    '<rootDir>/auth-service',
    '<rootDir>/api-gateway',
    '<rootDir>/health-service',
    '<rootDir>/enrollment-service',
    '<rootDir>/policy-service'
  ],

  // Test file patterns for TypeScript
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx)',
    '**/?(*.)+(spec|test).+(ts|tsx)'
  ],

  // TypeScript transformation configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Module path aliases for clean imports
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/$1',
    '@auth/(.*)': '<rootDir>/auth-service/src/$1',
    '@health/(.*)': '<rootDir>/health-service/src/$1',
    '@enrollment/(.*)': '<rootDir>/enrollment-service/src/$1',
    '@policy/(.*)': '<rootDir>/policy-service/src/$1',
    '@document/(.*)': '<rootDir>/document-service/src/$1'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'json-summary',
    'html'
  ],

  // Paths to exclude from coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/__mocks__/',
    '/migrations/',
    '/test/fixtures/'
  ],

  // Strict coverage thresholds as per requirements
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Performance and execution settings
  testTimeout: 10000,
  verbose: true,
  maxWorkers: '50%',

  // Test setup and global configuration
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },

  // Error handling and reporting
  bail: 1,
  errorOnDeprecated: true,

  // Clear mocks and restore spies between tests
  clearMocks: true,
  restoreMocks: true,

  // Detect memory leaks in tests
  detectLeaks: true,
  detectOpenHandles: true,

  // Display individual test results
  notify: false,
  // notifyMode: 'failure-change',

  // Root directory for monorepo structure
  rootDir: '.',

  // Test result caching for faster reruns
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache'
};

export default config;