// @package express ^4.18.2
// @package jsonwebtoken ^9.0.2
// @package http-status ^1.7.0
// @package winston ^3.10.0

import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import { createLogger, format, transports } from 'winston';
import { authConfig } from '../config/auth.config';
import { UserRole } from '../models/user.model';

// Configure logger for security events
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'security.log' })
  ]
});

// Interface for enhanced JWT payload
interface JWTPayload {
  userId: string;
  role: UserRole;
  mfaVerified: boolean;
  exp: number;
  iat: number;
  jti: string;
  deviceId?: string;
  permissions: string[];
  sessionId: string;
}

/**
 * Enhanced middleware to validate JWT tokens with comprehensive security checks
 */
export const validateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('No authorization header present');
    }

    // Verify token prefix
    const [prefix, token] = authHeader.split(' ');
    if (prefix !== authConfig.jwt.tokenPrefix) {
      throw new Error('Invalid token prefix');
    }

    // Verify token with enhanced security options
    const decoded = jwt.verify(token, authConfig.jwt.secret, {
      algorithms: [authConfig.jwt.algorithm as jwt.Algorithm],
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
      clockTolerance: authConfig.jwt.clockTolerance,
      complete: true
    }) as jwt.Jwt & { payload: JWTPayload };

    // Verify token hasn't been revoked (implement your token blacklist check here)
    // await checkTokenBlacklist(decoded.payload.jti);

    // Verify device ID if present
    if (decoded.payload.deviceId && req.headers['x-device-id'] !== decoded.payload.deviceId) {
      throw new Error('Device ID mismatch');
    }

    // Attach decoded payload to request
    req.user = {
      id: decoded.payload.userId,
      userId: decoded.payload.userId,
      role: decoded.payload.role.toString(),
      mfaVerified: decoded.payload.mfaVerified,
      permissions: decoded.payload.permissions,
      sessionId: decoded.payload.sessionId
    };

    // Log successful validation
    logger.info('JWT validation successful', {
      userId: decoded.payload.userId,
      role: decoded.payload.role,
      sessionId: decoded.payload.sessionId
    });

    next();
  } catch (error) {
    logger.warn('JWT validation failed', {
      error: (error as Error).message,
      ip: req.ip,
      path: req.path
    });

    res.status(httpStatus.UNAUTHORIZED).json({
      error: 'Authentication failed',
      message: (error as Error).message
    });
  }
};

/**
 * Enhanced middleware factory for role-based access control with hierarchy support
 */
export const requireRole = (
  allowedRoles: UserRole[],
  requireAll: boolean = false
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;
      if (!userRole) {
        throw new Error('User role not found');
      }

      // Define role hierarchy
      const roleHierarchy = {
        [UserRole.ADMINISTRATOR]: [UserRole.ADMINISTRATOR, UserRole.UNDERWRITER, UserRole.BROKER, UserRole.HR_PERSONNEL, UserRole.BENEFICIARY, UserRole.PARENT_GUARDIAN],
        [UserRole.UNDERWRITER]: [UserRole.UNDERWRITER],
        [UserRole.BROKER]: [UserRole.BROKER],
        [UserRole.HR_PERSONNEL]: [UserRole.HR_PERSONNEL],
        [UserRole.BENEFICIARY]: [UserRole.BENEFICIARY],
        [UserRole.PARENT_GUARDIAN]: [UserRole.PARENT_GUARDIAN, UserRole.BENEFICIARY]
      };

      // Check role authorization
      const userRoleKey = userRole as keyof typeof roleHierarchy;
      const hasAccess = requireAll
        ? allowedRoles.every(role => roleHierarchy[userRoleKey].includes(role))
        : allowedRoles.some(role => roleHierarchy[userRoleKey].includes(role));

      if (!hasAccess) {
        throw new Error('Insufficient permissions');
      }

      // Log successful authorization
      logger.info('Role authorization successful', {
        userId: req.user?.userId,
        role: userRole,
        requiredRoles: allowedRoles
      });

      next();
    } catch (error) {
      logger.warn('Role authorization failed', {
        userId: req.user?.userId,
        role: req.user?.role,
        requiredRoles: allowedRoles,
        error: (error as Error).message
      });

      res.status(httpStatus.FORBIDDEN).json({
        error: 'Authorization failed',
        message: (error as Error).message
      });
    }
  };
};

/**
 * Middleware to enforce MFA verification based on user role and session policies
 */
export const requireMFA = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { role, mfaVerified, sessionId } = req.user;

    // Check if role requires MFA
    const sessionConfig = authConfig.session[role.toLowerCase()];
    if (!sessionConfig) {
      throw new Error('Invalid session configuration');
    }

    if (sessionConfig.requireMFA && !mfaVerified) {
      throw new Error('MFA verification required');
    }

    // Validate session duration (only if sessionId is provided)
    if (sessionId && sessionId.includes('-')) {
      const sessionStart = parseInt(sessionId.split('-')[1], 10);
      const sessionAge = Date.now() - sessionStart;
      if (sessionAge > sessionConfig.duration * 1000) {
        throw new Error('Session expired');
      }
    }

    // Log MFA verification
    logger.info('MFA verification successful', {
      userId: req.user?.userId,
      role,
      sessionId
    });

    next();
  } catch (error) {
    logger.warn('MFA verification failed', {
      userId: req.user?.userId,
      role: req.user?.role,
      error: (error as Error).message
    });

    res.status(httpStatus.UNAUTHORIZED).json({
      error: 'MFA verification failed',
      message: (error as Error).message
    });
  }
};