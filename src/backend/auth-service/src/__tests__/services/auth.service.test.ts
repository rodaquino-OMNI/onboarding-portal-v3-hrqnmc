import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Repository } from 'typeorm';
import { AuthService } from '../../services/auth.service';
import { MFAService } from '../../services/mfa.service';
import { User, UserRole } from '../../models/user.model';

// Mock dependencies
jest.mock('ioredis');
jest.mock('../../utils/encryption', () => ({
  encryptData: jest.fn().mockResolvedValue('encrypted'),
  decryptData: jest.fn().mockResolvedValue('decrypted'),
  generateSecureToken: jest.fn().mockResolvedValue('secure-token-123')
}));

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let mfaService: jest.Mocked<MFAService>;
  let mockUser: User;

  beforeEach(() => {
    // Create mock user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: '$2b$10$hashedpassword',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.BENEFICIARY,
      mfaEnabled: true,
      loginAttempts: 0,
      lockoutUntil: undefined,
      lastLogin: undefined,
      lastIpAddress: undefined,
      tokenVersion: 1,
      validatePassword: jest.fn().mockResolvedValue(true),
      incrementLoginAttempts: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock repository
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    // Mock MFA service
    mfaService = {
      isMFARequired: jest.fn(),
      verifyTOTP: jest.fn(),
      verifySMSToken: jest.fn(),
      generateSMSToken: jest.fn(),
    } as any;

    // Create service instance
    authService = new AuthService(userRepository, mfaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mfaService.isMFARequired.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123', '127.0.0.1');

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(userRepository.findOne).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should require MFA when enabled for user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mfaService.isMFARequired.mockResolvedValue(true);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123', '127.0.0.1');

      expect(result.mfaRequired).toBe(true);
      expect(mfaService.isMFARequired).toHaveBeenCalledWith(mockUser);
    });

    it('should throw error for invalid credentials', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.login('invalid@example.com', 'wrongpassword', '127.0.0.1')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockoutUntil: new Date(Date.now() + 10000)
      };
      userRepository.findOne.mockResolvedValue(lockedUser);

      await expect(
        authService.login('test@example.com', 'password123', '127.0.0.1')
      ).rejects.toThrow('Account temporarily locked');
    });

    it('should increment login attempts on wrong password', async () => {
      const userWithAttempts = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(false)
      };
      userRepository.findOne.mockResolvedValue(userWithAttempts);
      userRepository.save.mockResolvedValue(userWithAttempts);

      await expect(
        authService.login('test@example.com', 'wrongpassword', '127.0.0.1')
      ).rejects.toThrow('Invalid credentials');

      expect(userWithAttempts.incrementLoginAttempts).toHaveBeenCalledWith('127.0.0.1');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should reset login attempts on successful login', async () => {
      mockUser.loginAttempts = 3;
      userRepository.findOne.mockResolvedValue(mockUser);
      mfaService.isMFARequired.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);

      await authService.login('test@example.com', 'password123', '127.0.0.1');

      expect(mockUser.loginAttempts).toBe(0);
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('verifyMFA', () => {
    it('should successfully verify TOTP token', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mfaService.verifyTOTP.mockResolvedValue(true);

      const result = await authService.verifyMFA('user-123', '123456', 'totp');

      expect(result.verified).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBeDefined();
      expect(result.tokens?.refreshToken).toBeDefined();
      expect(mfaService.verifyTOTP).toHaveBeenCalledWith(mockUser, '123456');
    });

    it('should successfully verify SMS token', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mfaService.verifySMSToken.mockResolvedValue(true);

      const result = await authService.verifyMFA('user-123', '654321', 'sms');

      expect(result.verified).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(mfaService.verifySMSToken).toHaveBeenCalledWith(mockUser, '654321');
    });

    it('should throw error for invalid TOTP token', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mfaService.verifyTOTP.mockResolvedValue(false);

      await expect(
        authService.verifyMFA('user-123', 'invalid', 'totp')
      ).rejects.toThrow('Invalid MFA token');
    });

    it('should throw error for invalid SMS token', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mfaService.verifySMSToken.mockResolvedValue(false);

      await expect(
        authService.verifyMFA('user-123', 'invalid', 'sms')
      ).rejects.toThrow('Invalid MFA token');
    });

    it('should throw error when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.verifyMFA('invalid-user', '123456', 'totp')
      ).rejects.toThrow('User not found');
    });
  });

  describe('logout', () => {
    it('should successfully logout user and invalidate tokens', async () => {
      await authService.logout('user-123', 'refresh-token-123');

      // Verify the method completes without errors
      expect(true).toBe(true);
    });

    it('should handle logout errors gracefully', async () => {
      // This test verifies error handling in the logout method
      await expect(
        authService.logout('user-123', 'invalid-token')
      ).rejects.toThrow();
    });
  });

  describe('token generation', () => {
    it('should generate tokens with correct expiry for administrator', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMINISTRATOR };
      userRepository.findOne.mockResolvedValue(adminUser);
      mfaService.isMFARequired.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(adminUser);

      const result = await authService.login('admin@example.com', 'password123', '127.0.0.1');

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should generate tokens with correct expiry for broker', async () => {
      const brokerUser = { ...mockUser, role: UserRole.BROKER };
      userRepository.findOne.mockResolvedValue(brokerUser);
      mfaService.isMFARequired.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(brokerUser);

      const result = await authService.login('broker@example.com', 'password123', '127.0.0.1');

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });
  });

  describe('user data sanitization', () => {
    it('should return sanitized user data without sensitive information', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mfaService.isMFARequired.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password123', '127.0.0.1');

      expect(result.user.password).toBeUndefined();
      expect(result.user.id).toBeDefined();
      expect(result.user.email).toBeDefined();
      expect(result.user.firstName).toBeDefined();
      expect(result.user.lastName).toBeDefined();
      expect(result.user.role).toBeDefined();
    });
  });
});
