import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { validateJWT, requireRole, requireMFA } from '../../middleware/jwt.middleware';
import { UserRole } from '../../models/user.model';

jest.mock('jsonwebtoken');

describe('JWT Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      headers: {},
      user: undefined,
      ip: '127.0.0.1',
      path: '/test'
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    } as Partial<Response>;

    mockNext = jest.fn() as jest.Mock<NextFunction>;
  });

  describe('validateJWT', () => {
    it('should successfully validate a valid JWT token', async () => {
      const mockPayload = {
        payload: {
          userId: 'user-123',
          role: UserRole.BENEFICIARY,
          mfaVerified: true,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          jti: 'token-id-123',
          permissions: ['read:own'],
          sessionId: 'session-123'
        }
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token-123'
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      await validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jwt.verify).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(mockPayload.payload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      mockRequest.headers = {};

      await validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token prefix', async () => {
      mockRequest.headers = {
        authorization: 'Basic invalid-token-123'
      };

      await validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token-123'
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token with device ID mismatch', async () => {
      const mockPayload = {
        payload: {
          userId: 'user-123',
          role: UserRole.BENEFICIARY,
          mfaVerified: true,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          jti: 'token-id-123',
          deviceId: 'device-456',
          permissions: ['read:own'],
          sessionId: 'session-123'
        }
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
        'x-device-id': 'different-device'
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      await validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept token with matching device ID', async () => {
      const mockPayload = {
        payload: {
          userId: 'user-123',
          role: UserRole.BENEFICIARY,
          mfaVerified: true,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          jti: 'token-id-123',
          deviceId: 'device-456',
          permissions: ['read:own'],
          sessionId: 'session-123'
        }
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
        'x-device-id': 'device-456'
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      await validateJWT(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for authorized role', async () => {
      mockRequest.user = {
        id: 'user-123',
        userId: 'user-123',
        role: UserRole.ADMINISTRATOR,
        mfaVerified: true,
        permissions: [],
        sessionId: 'session-123'
      };

      const middleware = requireRole([UserRole.ADMINISTRATOR]);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', async () => {
      mockRequest.user = {
        id: 'user-123',
        userId: 'user-123',
        role: UserRole.BENEFICIARY,
        mfaVerified: true,
        permissions: [],
        sessionId: 'session-123'
      };

      const middleware = requireRole([UserRole.ADMINISTRATOR]);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      mockRequest.user = undefined;

      const middleware = requireRole([UserRole.ADMINISTRATOR]);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow administrator to access all roles', async () => {
      mockRequest.user = {
        id: 'admin-123',
        userId: 'admin-123',
        role: UserRole.ADMINISTRATOR,
        mfaVerified: true,
        permissions: [],
        sessionId: 'session-123'
      };

      const middleware = requireRole([UserRole.BENEFICIARY]);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow parent guardian to access beneficiary role', async () => {
      mockRequest.user = {
        id: 'user-123',
        userId: 'user-123',
        role: UserRole.PARENT_GUARDIAN,
        mfaVerified: true,
        permissions: [],
        sessionId: 'session-123'
      };

      const middleware = requireRole([UserRole.BENEFICIARY]);
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireMFA', () => {
    it('should allow access when MFA is verified', async () => {
      mockRequest.user = {
        id: 'user-123',
        userId: 'user-123',
        role: UserRole.ADMINISTRATOR,
        mfaVerified: true,
        permissions: [],
        sessionId: 'session-123'
      };

      await requireMFA(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access when MFA is required but not verified', async () => {
      mockRequest.user = {
        id: 'user-123',
        userId: 'user-123',
        role: UserRole.ADMINISTRATOR,
        mfaVerified: false,
        permissions: [],
        sessionId: 'session-123'
      };

      await requireMFA(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await requireMFA(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle roles that do not require MFA', async () => {
      mockRequest.user = {
        id: 'user-123',
        userId: 'user-123',
        role: UserRole.BENEFICIARY,
        mfaVerified: false,
        permissions: [],
        sessionId: 'session-123'
      };

      await requireMFA(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Behavior depends on session config for BENEFICIARY
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
