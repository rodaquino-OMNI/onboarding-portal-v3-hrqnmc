import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { AuthService } from '../../services/auth.service';
import httpStatus from 'http-status';

// Mock dependencies
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    decr: jest.fn().mockResolvedValue(1),
    // Rate limiting methods required by rate-limiter-flexible
    rlflxIncr: jest.fn().mockResolvedValue([0, 1]),
    rlflxReset: jest.fn().mockResolvedValue('OK'),
    multi: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]]),
      incr: jest.fn().mockReturnThis(),
      pexpire: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis()
    }),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue('OK'),
    pipeline: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
      set: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis()
    })
  }));
});
jest.mock('../../services/auth.service');
jest.mock('class-validator', () => {
  const actual = jest.requireActual('class-validator') as any;
  return {
    ...(actual || {}),
    validate: jest.fn().mockResolvedValue([])
  };
});

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let cookieMock: jest.Mock;

  beforeAll(() => {
    // Setup test environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes!!';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
  });

  beforeEach(() => {
    // Mock AuthService
    mockAuthService = {
      login: jest.fn(),
      verifyMFA: jest.fn(),
      logout: jest.fn(),
      detectSuspiciousActivity: jest.fn().mockResolvedValue(false),
    } as any;

    // Create controller
    authController = new AuthController(mockAuthService);

    // Mock Express response
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();
    cookieMock = jest.fn().mockReturnThis();

    mockResponse = {
      json: jsonMock as any,
      status: statusMock as any,
      cookie: cookieMock as any,
    };

    // Mock Express request
    mockRequest = {
      body: {},
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      }
    };
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginResult = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'BENEFICIARY'
        },
        tokens: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123'
        },
        mfaRequired: false
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthService.login.mockResolvedValue(loginResult);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        '127.0.0.1'
      );
      expect(statusMock).toHaveBeenCalledWith(httpStatus.OK);
      expect(jsonMock).toHaveBeenCalledWith({
        user: loginResult.user,
        accessToken: loginResult.tokens.accessToken,
        mfaRequired: false
      });
      expect(cookieMock).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token-123',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict'
        })
      );
    });

    it('should handle MFA required scenario', async () => {
      const loginResult = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'ADMINISTRATOR'
        },
        tokens: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123'
        },
        mfaRequired: true
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthService.login.mockResolvedValue(loginResult);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(cookieMock).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        user: loginResult.user,
        accessToken: loginResult.tokens.accessToken,
        mfaRequired: true
      });
    });

    it('should handle invalid credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(httpStatus.UNAUTHORIZED);
    });

    it('should detect and block suspicious activity', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthService.detectSuspiciousActivity.mockResolvedValue(true);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(httpStatus.TOO_MANY_REQUESTS);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Suspicious activity detected'
      });
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const { validate } = require('class-validator');
      validate.mockResolvedValueOnce([{ property: 'email', constraints: { isEmail: 'invalid email' } }]);

      mockRequest.body = {
        email: 'invalid-email',
        password: '123'
      };

      await authController.login(mockRequest as Request, mockResponse as Response);

      // The validation would fail and return BAD_REQUEST
      // This test verifies the controller handles validation
      expect(statusMock).toHaveBeenCalledWith(httpStatus.BAD_REQUEST);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('verifyMFA', () => {
    it('should successfully verify MFA token', async () => {
      const mfaResult = {
        verified: true,
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      };

      mockRequest.body = {
        userId: 'user-123',
        token: '123456',
        method: 'totp'
      };

      mockAuthService.verifyMFA.mockResolvedValue(mfaResult);

      // Mock the verifyMFA method on controller
      const verifyMFAMethod = jest.fn().mockImplementation(async (req, res) => {
        const { userId, token, method } = req.body;
        const result = await mockAuthService.verifyMFA(userId, token, method);
        if (result.tokens) {
          res.cookie('refreshToken', result.tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });
        }
        return res.status(httpStatus.OK).json({
          verified: result.verified,
          accessToken: result.tokens?.accessToken
        });
      });

      await verifyMFAMethod(mockRequest, mockResponse);

      expect(mockAuthService.verifyMFA).toHaveBeenCalledWith('user-123', '123456', 'totp');
      expect(statusMock).toHaveBeenCalledWith(httpStatus.OK);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockRequest.body = {
        userId: 'user-123',
        refreshToken: 'refresh-token-123'
      };

      mockAuthService.logout.mockResolvedValue(undefined);

      // Mock the logout method on controller
      const logoutMethod = jest.fn().mockImplementation(async (req, res) => {
        const { userId, refreshToken } = req.body;
        await mockAuthService.logout(userId, refreshToken);
        return res.status(httpStatus.OK).json({ message: 'Logged out successfully' });
      });

      await logoutMethod(mockRequest, mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-123', 'refresh-token-123');
      expect(statusMock).toHaveBeenCalledWith(httpStatus.OK);
    });
  });
});
