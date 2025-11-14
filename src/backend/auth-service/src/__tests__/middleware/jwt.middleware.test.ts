import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { validateJWT } from '../../middleware/jwt.middleware';
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
    statusMock = jest.fn().mockReturnThis();

    mockRequest = {
      headers: {},
      user: undefined
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

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

      expect(mockRequest.user).toEqual(mockPayload.payload);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
