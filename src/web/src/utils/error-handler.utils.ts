/**
 * Local error handler utility to replace @company/error-handler
 */

export class ErrorHandler {
  private static logger: Console = console;

  static handle(error: Error, context?: Record<string, any>): void {
    this.logger.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  static async handleAsync(error: Error, context?: Record<string, any>): Promise<void> {
    this.handle(error, context);
  }

  static setLogger(logger: Console): void {
    this.logger = logger;
  }
}

export default ErrorHandler;
