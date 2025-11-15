/**
 * Error Handler Utils Tests
 * Test coverage for error handling utilities
 */

import { ErrorHandler } from '../error-handler.utils';

describe('ErrorHandler', () => {
  let mockLogger: Console;
  let originalConsole: Console;

  beforeEach(() => {
    // Save original console
    originalConsole = console;

    // Create mock logger
    mockLogger = {
      ...console,
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      info: jest.fn()
    };

    // Set mock logger
    ErrorHandler.setLogger(mockLogger);
  });

  afterEach(() => {
    // Restore original console
    ErrorHandler.setLogger(originalConsole);
  });

  describe('handle', () => {
    it('should log error with message and stack', () => {
      const error = new Error('Test error');

      ErrorHandler.handle(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Test error',
          stack: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test-action' };

      ErrorHandler.handle(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Test error',
          context: context,
          timestamp: expect.any(String)
        })
      );
    });

    it('should include timestamp in ISO format', () => {
      const error = new Error('Test error');

      ErrorHandler.handle(error);

      const call = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle errors without context', () => {
      const error = new Error('Test error');

      ErrorHandler.handle(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Test error',
          context: undefined
        })
      );
    });
  });

  describe('handleAsync', () => {
    it('should handle errors asynchronously', async () => {
      const error = new Error('Async error');

      await ErrorHandler.handleAsync(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Async error',
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle async errors with context', async () => {
      const error = new Error('Async error');
      const context = { operation: 'async-operation' };

      await ErrorHandler.handleAsync(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Async error',
          context: context
        })
      );
    });

    it('should return a resolved promise', async () => {
      const error = new Error('Test error');

      const result = await ErrorHandler.handleAsync(error);

      expect(result).toBeUndefined();
    });
  });

  describe('setLogger', () => {
    it('should allow setting custom logger', () => {
      const customLogger = {
        ...console,
        error: jest.fn()
      };

      ErrorHandler.setLogger(customLogger);
      ErrorHandler.handle(new Error('Test'));

      expect(customLogger.error).toHaveBeenCalled();
    });

    it('should use new logger for subsequent calls', () => {
      const firstLogger = {
        ...console,
        error: jest.fn()
      };
      const secondLogger = {
        ...console,
        error: jest.fn()
      };

      ErrorHandler.setLogger(firstLogger);
      ErrorHandler.handle(new Error('First'));

      ErrorHandler.setLogger(secondLogger);
      ErrorHandler.handle(new Error('Second'));

      expect(firstLogger.error).toHaveBeenCalledTimes(1);
      expect(secondLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('error with stack trace', () => {
    it('should include full stack trace', () => {
      const error = new Error('Error with stack');
      error.stack = 'Error: Error with stack\n    at test.ts:10:5';

      ErrorHandler.handle(error);

      const call = (mockLogger.error as jest.Mock).mock.calls[0][1];
      expect(call.stack).toContain('Error: Error with stack');
    });
  });

  describe('multiple errors', () => {
    it('should handle multiple errors independently', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      ErrorHandler.handle(error1);
      ErrorHandler.handle(error2);

      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenNthCalledWith(
        1,
        'Error occurred:',
        expect.objectContaining({ message: 'First error' })
      );
      expect(mockLogger.error).toHaveBeenNthCalledWith(
        2,
        'Error occurred:',
        expect.objectContaining({ message: 'Second error' })
      );
    });
  });
});
