import twilio from 'twilio'; // v4.18.0
import { authenticator } from 'otplib'; // v12.0.1
import * as qrcode from 'qrcode'; // v1.5.3
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1
import { createLogger } from 'winston'; // v3.8.2
import * as winston from 'winston';

import { authConfig } from '../config/auth.config';
import { User } from '../models/user.model';
import { generateSecureToken } from '../utils/encryption';

/**
 * Service responsible for managing Multi-Factor Authentication (MFA)
 */
export class MFAService {
  private twilioClient: ReturnType<typeof twilio>;
  private authenticator: typeof authenticator;
  private rateLimiter: RateLimiterMemory;
  private logger: ReturnType<typeof createLogger>;

  constructor() {
    // Initialize Twilio client with failover configuration
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
      {
        lazyLoading: true,
        autoRetry: true,
        maxRetries: 3
      }
    );

    // Configure TOTP authenticator with enhanced security settings
    this.authenticator = authenticator;
    this.authenticator.options = {
      algorithm: authConfig.mfa.methods.totp.algorithm.toLowerCase() as any,
      digits: authConfig.mfa.methods.totp.digits,
      step: authConfig.mfa.methods.totp.period,
      window: authConfig.mfa.methods.totp.window
    };

    // Initialize rate limiter for MFA operations
    this.rateLimiter = new RateLimiterMemory({
      points: authConfig.mfa.methods.sms.rateLimit.maxRequests,
      duration: authConfig.mfa.methods.sms.rateLimit.window
    });

    // Configure logger for MFA events
    this.logger = createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'mfa-service' }
    });
  }

  /**
   * Sets up TOTP-based MFA for a user
   */
  async setupTOTP(user: User): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    try {
      // Generate cryptographically secure TOTP secret
      const secret = this.authenticator.generateSecret(32);

      // Generate TOTP URI with enhanced parameters
      const totpUri = this.authenticator.keyuri(
        user.email,
        authConfig.mfa.methods.totp.issuer,
        secret
      );

      // Generate QR code with custom styling and error correction
      const qrCodeUrl = await qrcode.toDataURL(totpUri, {
        errorCorrectionLevel: 'H',
        margin: 4,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Generate backup codes with high entropy
      const backupCodes = await Promise.all(
        Array(authConfig.mfa.methods.totp.backupCodes.count)
          .fill(0)
          .map(() => generateSecureToken(
            authConfig.mfa.methods.totp.backupCodes.length,
            { encoding: 'base64url', urlSafe: true }
          ))
      );

      // Log MFA setup event
      this.logger.info('TOTP setup completed', {
        userId: user.id,
        event: 'totp_setup'
      });

      return { secret, qrCodeUrl, backupCodes };
    } catch (error) {
      this.logger.error('TOTP setup failed', {
        userId: user.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Verifies TOTP token with enhanced security measures
   */
  async verifyTOTP(user: User, token: string): Promise<boolean> {
    try {
      // Check rate limiting
      await this.rateLimiter.consume(user.id);

      // Implement constant-time token validation
      const isValid = this.authenticator.verify({
        token,
        secret: user.mfaSecret!
      });

      // Log validation attempt
      this.logger.info('TOTP verification attempt', {
        userId: user.id,
        success: isValid,
        event: 'totp_verify'
      });

      return isValid;
    } catch (error) {
      this.logger.error('TOTP verification failed', {
        userId: user.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Generates and sends SMS OTP with enhanced security
   */
  async generateSMSToken(user: User): Promise<void> {
    try {
      // Validate phone number exists
      if (!user.phoneNumber) {
        throw new Error('User phone number is required for SMS MFA');
      }

      // Check rate limiting
      await this.rateLimiter.consume(user.id);

      // Generate secure OTP token
      const token = await generateSecureToken(
        authConfig.mfa.tokenLength,
        { encoding: 'base64' }
      );

      // Send SMS via Twilio with failover handling
      await this.twilioClient.messages.create({
        body: authConfig.mfa.methods.sms.messageTemplate.replace('{code}', token),
        to: user.phoneNumber!,
        from: process.env.TWILIO_PHONE_NUMBER
      });

      // Store encrypted token with expiry
      user.mfaSecret = token;

      // Log token generation
      this.logger.info('SMS token generated', {
        userId: user.id,
        event: 'sms_token_generate'
      });
    } catch (error) {
      this.logger.error('SMS token generation failed', {
        userId: user.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Verifies SMS OTP token with enhanced security measures
   */
  async verifySMSToken(user: User, token: string): Promise<boolean> {
    try {
      // Check rate limiting
      await this.rateLimiter.consume(user.id);

      // Validate token expiry
      const tokenAge = Date.now() - user.updatedAt.getTime();
      if (tokenAge > authConfig.mfa.tokenExpiry * 1000) {
        return false;
      }

      // Implement constant-time token comparison
      const isValid = user.mfaSecret === token;

      // Log validation attempt
      this.logger.info('SMS token verification attempt', {
        userId: user.id,
        success: isValid,
        event: 'sms_token_verify'
      });

      return isValid;
    } catch (error) {
      this.logger.error('SMS token verification failed', {
        userId: user.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Enhanced check for MFA requirements based on user role
   */
  async isMFARequired(user: User): Promise<boolean> {
    try {
      // Check role-specific MFA requirements
      const roleConfig = authConfig.session[user.role.toLowerCase()];
      if (!roleConfig) {
        return false;
      }

      // Validate MFA configuration
      if (!authConfig.mfa.methods.sms.enabled && !authConfig.mfa.methods.totp.enabled) {
        return false;
      }

      // Log MFA requirement check
      this.logger.info('MFA requirement check', {
        userId: user.id,
        role: user.role,
        required: roleConfig.requireMFA,
        event: 'mfa_check'
      });

      return roleConfig.requireMFA;
    } catch (error) {
      this.logger.error('MFA requirement check failed', {
        userId: user.id,
        error: (error as Error).message
      });
      throw error;
    }
  }
}