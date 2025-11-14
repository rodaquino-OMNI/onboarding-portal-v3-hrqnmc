// @package express ^4.18.2
// @package http-status ^1.7.0
// @package class-validator ^0.14.0
// @package rate-limiter-flexible ^3.0.0
// @package @types/express ^4.17.17

import { Request, Response } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { validate } from 'class-validator';
import httpStatus from 'http-status';
import Redis from 'ioredis';
import * as winston from 'winston';
import { AuthService } from '../services/auth.service';

/**
 * Enhanced authentication controller with comprehensive security features
 */
export class AuthController {
  private readonly logger;
  private readonly rateLimiter: RateLimiterRedis;

  constructor(
    private readonly authService: AuthService
  ) {
    // Initialize Redis for rate limiting
    const redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      ...(process.env.NODE_ENV === 'production' && { tls: {} })
    });

    // Configure rate limiter
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'login_attempt',
      points: 5,
      duration: 300
    });

    // Configure logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'auth-controller' },
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  /**
   * Enhanced login endpoint with security features
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      // Apply rate limiting
      const ipAddress = req.ip || 'unknown';
      await this.rateLimiter.consume(ipAddress);

      // Validate request body
      const errors = await validate(req.body);
      if (errors.length > 0) {
        return res.status(httpStatus.BAD_REQUEST).json({ errors });
      }

      // Check for suspicious activity
      const isSuspicious = await this.authService.detectSuspiciousActivity(ipAddress);
      if (isSuspicious) {
        this.logger.warn('Suspicious login attempt detected', {
          ip: ipAddress,
          userAgent: req.headers['user-agent']
        });
        return res.status(httpStatus.TOO_MANY_REQUESTS).json({
          error: 'Suspicious activity detected'
        });
      }

      // Process login
      const { email, password } = req.body;
      const result = await this.authService.login(email, password, ipAddress);

      // Set secure cookie if MFA not required
      if (!result.mfaRequired) {
        res.cookie('refreshToken', result.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
      }

      return res.status(httpStatus.OK).json({
        user: result.user,
        accessToken: result.tokens.accessToken,
        mfaRequired: result.mfaRequired
      });

    } catch (error) {
      this.logger.error('Login failed', {
        error: (error as Error).message,
        ip: req.ip
      });

      return res.status(httpStatus.UNAUTHORIZED).json({
        error: 'Authentication failed'
      });
    }
  }

  /**
   * Enhanced MFA verification endpoint
   */
  async verifyMFA(req: Request, res: Response): Promise<Response> {
    try {
      // Apply rate limiting
      await this.rateLimiter.consume(`mfa_${req.ip}`);

      // Validate request body
      const errors = await validate(req.body);
      if (errors.length > 0) {
        return res.status(httpStatus.BAD_REQUEST).json({ errors });
      }

      const { userId, token, method } = req.body;

      // Verify MFA token
      const result = await this.authService.verifyMFA(userId, token, method);

      if (result.verified) {
        // Set secure cookie with refresh token
        res.cookie('refreshToken', result.tokens!.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(httpStatus.OK).json({
          accessToken: result.tokens!.accessToken
        });
      }

      return res.status(httpStatus.UNAUTHORIZED).json({
        error: 'Invalid MFA token'
      });

    } catch (error) {
      this.logger.error('MFA verification failed', {
        error: (error as Error).message,
        ip: req.ip
      });

      return res.status(httpStatus.UNAUTHORIZED).json({
        error: 'MFA verification failed'
      });
    }
  }

  /**
   * Secure logout endpoint
   */
  async logout(req: Request, res: Response): Promise<Response> {
    try {
      const refreshToken = req.cookies['refreshToken'];
      if (!refreshToken) {
        return res.status(httpStatus.BAD_REQUEST).json({
          error: 'No refresh token provided'
        });
      }

      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json({
          error: 'User not authenticated'
        });
      }

      // Process logout
      await this.authService.logout(req.user.id, refreshToken);

      // Clear secure cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return res.status(httpStatus.OK).json({
        message: 'Logged out successfully'
      });

    } catch (error) {
      this.logger.error('Logout failed', {
        error: (error as Error).message,
        ip: req.ip
      });

      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Logout failed'
      });
    }
  }

  /**
   * Secure token refresh endpoint
   */
  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const refreshToken = req.cookies['refreshToken'];
      if (!refreshToken) {
        return res.status(httpStatus.BAD_REQUEST).json({
          error: 'No refresh token provided'
        });
      }

      // Validate session
      const isValid = await this.authService.validateSession(refreshToken);
      if (!isValid) {
        res.clearCookie('refreshToken');
        return res.status(httpStatus.UNAUTHORIZED).json({
          error: 'Invalid session'
        });
      }

      // Generate new tokens
      const tokens = await this.authService.refreshToken(refreshToken);

      // Set new refresh token cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      return res.status(httpStatus.OK).json({
        accessToken: tokens.accessToken
      });

    } catch (error) {
      this.logger.error('Token refresh failed', {
        error: (error as Error).message,
        ip: req.ip
      });

      return res.status(httpStatus.UNAUTHORIZED).json({
        error: 'Token refresh failed'
      });
    }
  }
}