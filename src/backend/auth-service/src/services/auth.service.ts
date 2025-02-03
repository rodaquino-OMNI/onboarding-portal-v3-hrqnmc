// @package jsonwebtoken ^9.0.2
// @package typeorm ^0.3.17
// @package rate-limiter-flexible ^3.0.0
// @package opossum ^7.1.0
// @package winston ^3.10.0

import { Repository } from 'typeorm';
import { sign, verify } from 'jsonwebtoken';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import CircuitBreaker from 'opossum';
import * as winston from 'winston';
import Redis from 'ioredis';

import { User, UserRole } from '../models/user.model';
import { authConfig } from '../config/auth.config';
import { MFAService } from './mfa.service';
import { encryptData, decryptData, generateSecureToken } from '../utils/encryption';

/**
 * Enhanced authentication service with comprehensive security features
 */
export class AuthService {
  private readonly logger: winston.Logger;
  private readonly rateLimiter: RateLimiterRedis;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly redis: Redis;

  constructor(
    private readonly userRepository: Repository<User>,
    private readonly mfaService: MFAService
  ) {
    // Initialize Redis client
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.NODE_ENV === 'production'
    });

    // Configure rate limiter
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'login_attempt',
      points: 5,
      duration: 300,
      blockDuration: 900
    });

    // Configure circuit breaker
    this.circuitBreaker = new CircuitBreaker(async (fn: Function) => await fn(), {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    // Configure logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'auth-service' },
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });
  }

  /**
   * Enhanced user authentication with security measures
   */
  async login(email: string, password: string, ipAddress: string): Promise<{
    user: Partial<User>;
    tokens: { accessToken: string; refreshToken: string };
    mfaRequired: boolean;
  }> {
    try {
      // Apply rate limiting
      await this.rateLimiter.consume(ipAddress);

      // Find user with circuit breaker protection
      const user = await this.circuitBreaker.fire(async () => {
        return await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check account lock status
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        throw new Error('Account temporarily locked');
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        await user.incrementLoginAttempts(ipAddress);
        await this.userRepository.save(user);
        throw new Error('Invalid credentials');
      }

      // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.lastLogin = new Date();
      user.lastIpAddress = ipAddress;
      await this.userRepository.save(user);

      // Check MFA requirement
      const mfaRequired = await this.mfaService.isMFARequired(user);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Log successful login
      this.logger.info('Successful login', {
        userId: user.id,
        ipAddress,
        mfaRequired
      });

      // Return sanitized user data
      const sanitizedUser = this.sanitizeUser(user);
      return { user: sanitizedUser, tokens, mfaRequired };

    } catch (error) {
      this.logger.error('Login failed', {
        email,
        ipAddress,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Enhanced MFA verification with hardware token support
   */
  async verifyMFA(userId: string, token: string, method: 'sms' | 'totp'): Promise<{
    verified: boolean;
    tokens?: { accessToken: string; refreshToken: string };
  }> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      let verified = false;
      if (method === 'totp') {
        verified = await this.mfaService.verifyTOTP(user, token);
      } else if (method === 'sms') {
        verified = await this.mfaService.verifySMSToken(user, token);
      }

      if (!verified) {
        throw new Error('Invalid MFA token');
      }

      // Generate new tokens after successful MFA
      const tokens = await this.generateTokens(user);

      // Log successful MFA verification
      this.logger.info('MFA verification successful', {
        userId,
        method
      });

      return { verified: true, tokens };

    } catch (error) {
      this.logger.error('MFA verification failed', {
        userId,
        method,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Enhanced token generation with role-based expiry
   */
  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const sessionConfig = authConfig.session[user.role.toLowerCase()];

    const accessToken = sign(
      {
        userId: user.id,
        role: user.role,
        sessionId: await generateSecureToken(32)
      },
      authConfig.jwt.secret,
      {
        expiresIn: sessionConfig.duration,
        algorithm: authConfig.jwt.algorithm as any,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        jwtid: await generateSecureToken(16)
      }
    );

    const refreshToken = sign(
      {
        userId: user.id,
        tokenVersion: user.tokenVersion
      },
      authConfig.jwt.secret,
      {
        expiresIn: authConfig.jwt.refreshTokenExpiry,
        algorithm: authConfig.jwt.algorithm as any,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        jwtid: await generateSecureToken(16)
      }
    );

    // Store refresh token hash
    const tokenHash = await encryptData(refreshToken);
    await this.redis.set(
      `refresh_token:${user.id}`,
      JSON.stringify(tokenHash),
      'EX',
      authConfig.jwt.refreshTokenExpiry
    );

    return { accessToken, refreshToken };
  }

  /**
   * Secure user logout with token invalidation
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      // Invalidate refresh token
      await this.redis.del(`refresh_token:${userId}`);

      // Add token to blacklist
      const tokenHash = await encryptData(refreshToken);
      await this.redis.set(
        `blacklist:${tokenHash}`,
        '1',
        'EX',
        authConfig.jwt.refreshTokenExpiry
      );

      this.logger.info('User logged out', { userId });
    } catch (error) {
      this.logger.error('Logout failed', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sanitize user data for client response
   */
  private sanitizeUser(user: User): Partial<User> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      lastLogin: user.lastLogin
    };
  }
}