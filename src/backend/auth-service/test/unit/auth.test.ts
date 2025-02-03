// @package jest ^29.7.0
// @package typeorm ^0.3.17

import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { AuthService } from '../../src/services/auth.service';
import { MFAService } from '../../src/services/mfa.service';
import { User, UserRole } from '../../src/models/user.model';
import { authConfig } from '../../src/config/auth.config';

describe('AuthService', () => {
  let authService: AuthService;
  let mfaService: MFAService;
  let userRepository: Repository<User>;
  let mockUsers: Partial<User>[];

  beforeEach(() => {
    // Initialize mock repositories and services
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<User>;

    mfaService = {
      isMFARequired: jest.fn(),
      generateSMSToken: jest.fn(),
      verifyTOTP: jest.fn(),
      verifySMSToken: jest.fn(),
    } as unknown as MFAService;

    authService = new AuthService(userRepository, mfaService);

    // Setup mock users for different roles
    mockUsers = [
      {
        id: '1',
        email: 'admin@austa.health',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzjKmOe', // "Admin123!"
        role: UserRole.ADMINISTRATOR,
        mfaEnabled: true,
        loginAttempts: 0,
      },
      {
        id: '2',
        email: 'broker@austa.health',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzjKmOe', // "Broker123!"
        role: UserRole.BROKER,
        mfaEnabled: true,
        phoneNumber: '+5511999999999',
        loginAttempts: 0,
      },
      {
        id: '3',
        email: 'beneficiary@austa.health',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzjKmOe', // "User123!"
        role: UserRole.BENEFICIARY,
        mfaEnabled: false,
        loginAttempts: 0,
      },
    ];
  });

  describe('login', () => {
    test('should successfully authenticate administrator with MFA requirement', async () => {
      const admin = mockUsers[0];
      (userRepository.findOne as jest.Mock).mockResolvedValue(admin);
      (mfaService.isMFARequired as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(
        admin.email!,
        'Admin123!',
        '127.0.0.1'
      );

      expect(result.user.id).toBe(admin.id);
      expect(result.mfaRequired).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: admin.id,
          loginAttempts: 0,
          lastIpAddress: '127.0.0.1',
        })
      );
    });

    test('should successfully authenticate broker with SMS MFA', async () => {
      const broker = mockUsers[1];
      (userRepository.findOne as jest.Mock).mockResolvedValue(broker);
      (mfaService.isMFARequired as jest.Mock).mockResolvedValue(true);
      (mfaService.generateSMSToken as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.login(
        broker.email!,
        'Broker123!',
        '127.0.0.1'
      );

      expect(result.user.id).toBe(broker.id);
      expect(result.mfaRequired).toBe(true);
      expect(mfaService.generateSMSToken).toHaveBeenCalled();
    });

    test('should successfully authenticate beneficiary without MFA', async () => {
      const beneficiary = mockUsers[2];
      (userRepository.findOne as jest.Mock).mockResolvedValue(beneficiary);
      (mfaService.isMFARequired as jest.Mock).mockResolvedValue(false);

      const result = await authService.login(
        beneficiary.email!,
        'User123!',
        '127.0.0.1'
      );

      expect(result.user.id).toBe(beneficiary.id);
      expect(result.mfaRequired).toBe(false);
      expect(result.tokens).toBeDefined();
    });

    test('should lock account after maximum login attempts', async () => {
      const admin = { ...mockUsers[0], loginAttempts: 4 };
      (userRepository.findOne as jest.Mock).mockResolvedValue(admin);

      await expect(
        authService.login(admin.email!, 'WrongPassword', '127.0.0.1')
      ).rejects.toThrow('Account temporarily locked');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: admin.id,
          loginAttempts: 5,
          lockoutUntil: expect.any(Date),
        })
      );
    });
  });

  describe('verifyMFA', () => {
    test('should verify administrator TOTP token successfully', async () => {
      const admin = mockUsers[0];
      (userRepository.findOne as jest.Mock).mockResolvedValue(admin);
      (mfaService.verifyTOTP as jest.Mock).mockResolvedValue(true);

      const result = await authService.verifyMFA(admin.id!, '123456', 'totp');

      expect(result.verified).toBe(true);
      expect(result.tokens).toBeDefined();
    });

    test('should verify broker SMS token successfully', async () => {
      const broker = mockUsers[1];
      (userRepository.findOne as jest.Mock).mockResolvedValue(broker);
      (mfaService.verifySMSToken as jest.Mock).mockResolvedValue(true);

      const result = await authService.verifyMFA(broker.id!, '123456', 'sms');

      expect(result.verified).toBe(true);
      expect(result.tokens).toBeDefined();
    });

    test('should reject invalid MFA token', async () => {
      const admin = mockUsers[0];
      (userRepository.findOne as jest.Mock).mockResolvedValue(admin);
      (mfaService.verifyTOTP as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.verifyMFA(admin.id!, 'invalid', 'totp')
      ).rejects.toThrow('Invalid MFA token');
    });
  });

  describe('sessionManagement', () => {
    test('should enforce administrator session duration', async () => {
      const admin = mockUsers[0];
      (userRepository.findOne as jest.Mock).mockResolvedValue(admin);
      (mfaService.isMFARequired as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(
        admin.email!,
        'Admin123!',
        '127.0.0.1'
      );

      const decodedToken = await authService.validateSession(
        result.tokens.accessToken
      );
      const tokenDuration =
        decodedToken.exp! - Math.floor(Date.now() / 1000);

      expect(tokenDuration).toBeLessThanOrEqual(
        authConfig.session.administrator.duration
      );
    });

    test('should enforce broker session duration', async () => {
      const broker = mockUsers[1];
      (userRepository.findOne as jest.Mock).mockResolvedValue(broker);
      (mfaService.isMFARequired as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(
        broker.email!,
        'Broker123!',
        '127.0.0.1'
      );

      const decodedToken = await authService.validateSession(
        result.tokens.accessToken
      );
      const tokenDuration =
        decodedToken.exp! - Math.floor(Date.now() / 1000);

      expect(tokenDuration).toBeLessThanOrEqual(
        authConfig.session.broker.duration
      );
    });
  });

  describe('roleBasedAccess', () => {
    test('should validate administrator access rights', async () => {
      const admin = mockUsers[0];
      const result = await authService.checkRoleAccess(
        admin.role,
        'MANAGE_USERS'
      );
      expect(result).toBe(true);
    });

    test('should validate broker access restrictions', async () => {
      const broker = mockUsers[1];
      const result = await authService.checkRoleAccess(
        broker.role,
        'VIEW_HEALTH_DATA'
      );
      expect(result).toBe(false);
    });

    test('should validate beneficiary access restrictions', async () => {
      const beneficiary = mockUsers[2];
      const result = await authService.checkRoleAccess(
        beneficiary.role,
        'VIEW_OWN_DATA'
      );
      expect(result).toBe(true);
    });
  });

  describe('logout', () => {
    test('should successfully logout and invalidate tokens', async () => {
      const admin = mockUsers[0];
      const refreshToken = 'valid-refresh-token';

      await authService.logout(admin.id!, refreshToken);

      // Verify token is blacklisted
      await expect(
        authService.refreshToken(refreshToken)
      ).rejects.toThrow('Token has been invalidated');
    });
  });
});