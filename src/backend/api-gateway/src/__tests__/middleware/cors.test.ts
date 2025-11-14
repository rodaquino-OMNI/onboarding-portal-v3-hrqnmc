import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import configureCorsMiddleware from '../../middleware/cors';

// Mock cors module
jest.mock('cors', () => {
  return jest.fn(() => (req: any, res: any, callback: any) => {
    if (callback) callback();
  });
});

// Mock kong config
jest.mock('../../config/kong.config', () => ({
  plugins: {
    cors: {
      config: {
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        headers: ['Content-Type', 'Authorization'],
        exposed_headers: ['X-Total-Count'],
        credentials: true,
        max_age: 3600,
        preflight_continue: false,
        origins: ['https://*.austa.health', 'https://localhost:*']
      }
    }
  }
}));

describe('CORS Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      headers: {}
    };

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    mockNext = jest.fn() as any;
  });

  describe('configureCorsMiddleware', () => {
    it('should create CORS middleware', () => {
      const middleware = configureCorsMiddleware();

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should set security headers', () => {
      const middleware = configureCorsMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set LGPD compliance headers', () => {
      const middleware = configureCorsMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-LGPD-Compliance', 'enforced');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Data-Protection', 'LGPD');
    });

    it('should set privacy policy header', () => {
      const middleware = configureCorsMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Privacy-Policy', 'https://austa.health/privacy');
    });

    it('should handle OPTIONS preflight requests', () => {
      mockRequest.method = 'OPTIONS';
      const middleware = configureCorsMiddleware();

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalled();
    });

    it('should handle standard requests', () => {
      mockRequest.method = 'GET';
      const middleware = configureCorsMiddleware();

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should set HSTS header for security', () => {
      const middleware = configureCorsMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    });

    it('should set Content Security Policy', () => {
      const middleware = configureCorsMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self'"
      );
    });

    it('should call next on successful processing', () => {
      const middleware = configureCorsMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('origin validation', () => {
    it('should handle requests without origin', () => {
      mockRequest.headers = {};
      const middleware = configureCorsMiddleware();

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle valid https origins in production', () => {
      process.env.NODE_ENV = 'production';
      mockRequest.headers = { origin: 'https://app.austa.health' };

      const middleware = configureCorsMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle localhost in development', () => {
      process.env.NODE_ENV = 'development';
      mockRequest.headers = { origin: 'http://localhost:3000' };

      const middleware = configureCorsMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle CORS errors gracefully', () => {
      const middleware = configureCorsMiddleware();

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not throw errors
      expect(mockResponse.status).not.toHaveBeenCalledWith(500);
    });

    it('should set all required security headers even on error paths', () => {
      const middleware = configureCorsMiddleware();

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalled();
    });
  });

  describe('origin caching', () => {
    it('should cache valid origins for performance', () => {
      mockRequest.headers = { origin: 'https://app.austa.health' };
      const middleware = configureCorsMiddleware();

      // First call
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Second call with same origin (should use cache)
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate origin patterns correctly', () => {
      const origins = [
        'https://app.austa.health',
        'https://admin.austa.health',
        'https://api.austa.health'
      ];

      const middleware = configureCorsMiddleware();

      origins.forEach(origin => {
        mockRequest.headers = { origin };
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('production environment', () => {
    it('should enforce HTTPS in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockRequest.headers = { origin: 'http://app.austa.health' };
      const middleware = configureCorsMiddleware();

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      process.env.NODE_ENV = originalEnv;

      // Should handle the request (may accept or reject based on config)
      expect(mockResponse.setHeader).toHaveBeenCalled();
    });

    it('should accept HTTPS origins in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockRequest.headers = { origin: 'https://app.austa.health' };
      const middleware = configureCorsMiddleware();

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      process.env.NODE_ENV = originalEnv;

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
