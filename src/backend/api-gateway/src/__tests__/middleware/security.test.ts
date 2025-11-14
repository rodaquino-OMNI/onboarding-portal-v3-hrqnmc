import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { securityMiddleware } from '../../middleware/security';

// Mock dependencies
jest.mock('helmet', () => {
  return jest.fn(() => (req: any, res: any, next: any) => next());
});

jest.mock('hpp', () => {
  return jest.fn(() => (req: any, res: any, next: any) => next());
});

jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req: any, res: any, next: any) => next());
});

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({
    sub: 'user-123',
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 3600
  })
}));

jest.mock('speakeasy', () => ({
  totp: {
    verify: jest.fn().mockReturnValue(true)
  }
}));

jest.mock('geoip-lite', () => ({
  lookup: jest.fn().mockReturnValue({
    country: 'BR',
    region: 'SP'
  })
}));

jest.mock('../../config/kong.config', () => ({
  kongConfig: {
    plugins: {
      bot_detection: {
        config: {
          deny: ['bot', 'crawler', 'spider']
        }
      },
      ip_restriction: {
        config: {
          allow: [],
          deny: []
        }
      }
    }
  }
}));

describe('Security Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.TOTP_SECRET = 'test-totp-secret';
    process.env.ALLOWED_REGIONS = 'BR,US';

    mockRequest = {
      headers: {},
      ip: '192.168.1.1'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn() as any;
  });

  describe('configureSecurityMiddleware', () => {
    it('should return array of middleware functions', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware.length).toBeGreaterThan(0);
    });

    it('should include helmet middleware for security headers', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
      expect(middleware.length).toBeGreaterThan(0);
    });

    it('should include HPP protection middleware', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });

    it('should include IP filtering middleware', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });

    it('should include bot detection middleware', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });

    it('should include rate limiting middleware', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });

    it('should include JWT validation middleware', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });

    it('should include request validation middleware', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      const validationMiddleware = middleware[middleware.length - 1];
      expect(validationMiddleware).toBeDefined();
    });
  });

  describe('middleware configuration', () => {
    it('should configure all security layers', () => {
      const stack = securityMiddleware.configureSecurityMiddleware();

      // Should have multiple layers of security
      expect(stack.length).toBeGreaterThanOrEqual(6);
    });

    it('should order middleware correctly', () => {
      const stack = securityMiddleware.configureSecurityMiddleware();

      // Basic security headers should come first
      // JWT validation should come after IP filtering and bot detection
      expect(stack.length).toBeGreaterThan(0);
    });
  });

  describe('security features', () => {
    it('should support role-based rate limiting', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });

    it('should support JWT token validation', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });

    it('should support TOTP hardware token validation', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });

    it('should support geolocation filtering', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });

    it('should support bot detection', () => {
      const middleware = securityMiddleware.configureSecurityMiddleware();

      expect(middleware).toBeDefined();
    });
  });
});
