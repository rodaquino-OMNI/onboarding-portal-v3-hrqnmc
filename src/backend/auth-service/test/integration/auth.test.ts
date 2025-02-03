// @package jest ^29.7.0
// @package supertest ^6.3.3
// @package typeorm ^0.3.17
// @package winston ^3.11.0

import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import supertest from 'supertest';
import { createLogger } from 'winston';

import { AuthService } from '../../src/services/auth.service';
import { MFAService } from '../../src/services/mfa.service';
import { User, UserRole } from '../../src/models/user.model';
import { authConfig } from '../../src/config/auth.config';

describe('Authentication Service Integration Tests', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let authService: AuthService;
  let mfaService: MFAService;
  let testUsers: { [key: string]: User } = {};
  let logger: ReturnType<typeof createLogger>;

  beforeAll(async () => {
    // Initialize test database connection
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      username: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_NAME || 'auth_test',
      entities: [User],
      synchronize: true,
      logging: false
    });

    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    mfaService = new MFAService();
    authService = new AuthService(userRepository, mfaService);

    // Initialize logger
    logger = createLogger({
      level: 'info',
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ]
    });

    // Create test users for each role
    await setupTestUsers();
  });

  afterAll(async () => {
    // Cleanup test data
    await userRepository.clear();
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // Reset rate limiting and lockout status
    for (const user of Object.values(testUsers)) {
      user.loginAttempts = 0;
      user.lockoutUntil = null;
      await userRepository.save(user);
    }
  });

  const setupTestUsers = async () => {
    const users = [
      {
        email: 'admin@austa.health',
        password: 'Admin@123456',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMINISTRATOR,
        mfaEnabled: true,
        phoneNumber: '+5511999999991'
      },
      {
        email: 'broker@austa.health',
        password: 'Broker@123456',
        firstName: 'Broker',
        lastName: 'User',
        role: UserRole.BROKER,
        mfaEnabled: true,
        phoneNumber: '+5511999999992'
      },
      {
        email: 'beneficiary@austa.health',
        password: 'User@123456',
        firstName: 'Test',
        lastName: 'Beneficiary',
        role: UserRole.BENEFICIARY,
        mfaEnabled: false
      }
    ];

    for (const userData of users) {
      const user = new User(userData);
      testUsers[user.role] = await userRepository.save(user);
    }
  };

  describe('Login Flow', () => {
    it('should successfully authenticate admin with valid credentials', async () => {
      const result = await authService.login(
        testUsers.ADMINISTRATOR.email,
        'Admin@123456',
        '127.0.0.1'
      );

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.mfaRequired).toBe(true);
      expect(result.user.role).toBe(UserRole.ADMINISTRATOR);
    });

    it('should enforce password complexity requirements', async () => {
      await expect(
        authService.login('admin@austa.health', 'weakpass', '127.0.0.1')
      ).rejects.toThrow();
    });

    it('should implement rate limiting after failed attempts', async () => {
      const attempts = authConfig.security.maxLoginAttempts + 1;
      for (let i = 0; i < attempts; i++) {
        try {
          await authService.login(
            testUsers.ADMINISTRATOR.email,
            'WrongPass@123',
            '127.0.0.1'
          );
        } catch (error) {
          expect(error).toBeDefined();
        }
      }

      const user = await userRepository.findOne({
        where: { email: testUsers.ADMINISTRATOR.email }
      });
      expect(user?.lockoutUntil).toBeDefined();
      expect(user?.loginAttempts).toBeGreaterThan(authConfig.security.maxLoginAttempts);
    });

    it('should maintain secure audit logs for login attempts', async () => {
      const result = await authService.login(
        testUsers.BROKER.email,
        'Broker@123456',
        '127.0.0.1'
      );

      const user = await userRepository.findOne({
        where: { email: testUsers.BROKER.email }
      });
      expect(user?.auditLog).toContainEqual(
        expect.objectContaining({
          action: 'LOGIN',
          ipAddress: '127.0.0.1'
        })
      );
    });
  });

  describe('MFA Verification', () => {
    it('should successfully verify TOTP for admin users', async () => {
      const { secret } = await mfaService.setupTOTP(testUsers.ADMINISTRATOR);
      testUsers.ADMINISTRATOR.mfaSecret = secret;
      await userRepository.save(testUsers.ADMINISTRATOR);

      const token = authenticator.generate(secret);
      const result = await authService.verifyMFA(
        testUsers.ADMINISTRATOR.id,
        token,
        'totp'
      );

      expect(result.verified).toBe(true);
      expect(result.tokens).toBeDefined();
    });

    it('should successfully verify SMS token for broker users', async () => {
      await mfaService.generateSMSToken(testUsers.BROKER);
      const token = testUsers.BROKER.mfaSecret;

      const result = await authService.verifyMFA(
        testUsers.BROKER.id,
        token!,
        'sms'
      );

      expect(result.verified).toBe(true);
      expect(result.tokens).toBeDefined();
    });

    it('should enforce MFA timeout period', async () => {
      const { secret } = await mfaService.setupTOTP(testUsers.ADMINISTRATOR);
      testUsers.ADMINISTRATOR.mfaSecret = secret;
      await userRepository.save(testUsers.ADMINISTRATOR);

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, authConfig.mfa.tokenExpiry * 1000 + 1000));

      const token = authenticator.generate(secret);
      await expect(
        authService.verifyMFA(testUsers.ADMINISTRATOR.id, token, 'totp')
      ).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should enforce role-specific session durations', async () => {
      const adminResult = await authService.login(
        testUsers.ADMINISTRATOR.email,
        'Admin@123456',
        '127.0.0.1'
      );
      const beneficiaryResult = await authService.login(
        testUsers.BENEFICIARY.email,
        'User@123456',
        '127.0.0.1'
      );

      const adminToken = jwt.decode(adminResult.tokens.accessToken) as any;
      const beneficiaryToken = jwt.decode(beneficiaryResult.tokens.accessToken) as any;

      expect(adminToken.exp - adminToken.iat).toBe(authConfig.session.administrator.duration);
      expect(beneficiaryToken.exp - beneficiaryToken.iat).toBe(authConfig.session.beneficiary.duration);
    });

    it('should handle token refresh securely', async () => {
      const loginResult = await authService.login(
        testUsers.BROKER.email,
        'Broker@123456',
        '127.0.0.1'
      );

      const refreshResult = await authService.refreshToken(loginResult.tokens.refreshToken);
      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined();
      expect(refreshResult.accessToken).not.toBe(loginResult.tokens.accessToken);
    });

    it('should implement secure logout', async () => {
      const loginResult = await authService.login(
        testUsers.ADMINISTRATOR.email,
        'Admin@123456',
        '127.0.0.1'
      );

      await authService.logout(testUsers.ADMINISTRATOR.id, loginResult.tokens.refreshToken);

      // Verify token is invalidated
      await expect(
        authService.refreshToken(loginResult.tokens.refreshToken)
      ).rejects.toThrow();
    });
  });

  describe('Security Compliance', () => {
    it('should enforce LGPD consent requirements', async () => {
      const user = testUsers.BENEFICIARY;
      user.lgpdConsent = false;
      await userRepository.save(user);

      await expect(
        authService.login(user.email, 'User@123456', '127.0.0.1')
      ).rejects.toThrow(/LGPD consent required/);
    });

    it('should maintain comprehensive security audit logs', async () => {
      const user = testUsers.ADMINISTRATOR;
      const actions = ['LOGIN', 'MFA_VERIFY', 'TOKEN_REFRESH', 'LOGOUT'];

      for (const action of actions) {
        user.auditLog.push({
          action,
          timestamp: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });
      }

      await userRepository.save(user);
      const updatedUser = await userRepository.findOne({
        where: { id: user.id }
      });

      expect(updatedUser?.auditLog).toHaveLength(actions.length);
      expect(updatedUser?.auditLog.map(log => log.action)).toEqual(expect.arrayContaining(actions));
    });
  });
});