/**
 * Auth Service Tests
 * Comprehensive test coverage for authentication service
 */

import { authService } from '../auth.service';
import { authApi } from '../../api/auth.api';
import { setSecureItem, getSecureItem } from '../../utils/storage.utils';
import { UserRole, AuthErrorCode } from '../../types/auth.types';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Mock dependencies
jest.mock('../../api/auth.api');
jest.mock('../../utils/storage.utils');
jest.mock('@fingerprintjs/fingerprintjs');
jest.mock('jwt-decode');
jest.mock('crypto-js', () => ({
  lib: {
    WordArray: {
      random: jest.fn(() => ({
        toString: jest.fn(() => 'mock-random-string')
      }))
    }
  },
  AES: {
    encrypt: jest.fn(() => ({ toString: jest.fn(() => 'encrypted') })),
    decrypt: jest.fn(() => ({ toString: jest.fn(() => 'decrypted') }))
  },
  enc: {
    Utf8: 'Utf8'
  }
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockSetSecureItem = setSecureItem as jest.MockedFunction<typeof setSecureItem>;
const mockGetSecureItem = getSecureItem as jest.MockedFunction<typeof getSecureItem>;
const mockFingerprintJS = FingerprintJS as jest.Mocked<typeof FingerprintJS>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fingerprint
    mockFingerprintJS.load = jest.fn().mockResolvedValue({
      get: jest.fn().mockResolvedValue({
        visitorId: 'test-device-id'
      })
    } as any);
  });

  describe('login', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'password123',
      ipAddress: '127.0.0.1'
    };

    it('should successfully login without MFA', async () => {
      const mockResponse = {
        requiresMFA: false,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: UserRole.BENEFICIARY,
          name: 'Test User',
          permissions: [],
          mfaEnabled: false,
          lastLogin: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      mockAuthApi.login.mockResolvedValue(mockResponse as any);
      mockSetSecureItem.mockResolvedValue(undefined);

      const result = await authService.login(mockCredentials);

      expect(result.isAuthenticated).toBe(true);
      expect(result.user).toEqual(mockResponse.user);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.requiresMFA).toBe(false);
      expect(mockAuthApi.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockCredentials.email,
          password: mockCredentials.password,
          deviceFingerprint: 'test-device-id'
        })
      );
    });

    it('should return MFA required state', async () => {
      const mockResponse = {
        requiresMFA: true,
        sessionToken: 'mfa-session-token',
        user: null
      };

      mockAuthApi.login.mockResolvedValue(mockResponse as any);
      mockSetSecureItem.mockResolvedValue(undefined);

      const result = await authService.login(mockCredentials);

      expect(result.isAuthenticated).toBe(false);
      expect(result.requiresMFA).toBe(true);
      expect(result.user).toBeNull();
      expect(mockSetSecureItem).toHaveBeenCalledWith(
        'mfa_session',
        expect.objectContaining({
          sessionToken: 'mfa-session-token'
        }),
        { type: 'session' }
      );
    });

    it('should handle login failure', async () => {
      mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));

      const result = await authService.login(mockCredentials);

      expect(result.isAuthenticated).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });

    it('should store security context on successful login', async () => {
      const mockResponse = {
        requiresMFA: false,
        accessToken: 'token',
        refreshToken: 'refresh',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: UserRole.ADMIN,
          name: 'Admin User',
          permissions: [],
          mfaEnabled: false,
          lastLogin: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      mockAuthApi.login.mockResolvedValue(mockResponse as any);
      mockSetSecureItem.mockResolvedValue(undefined);

      await authService.login(mockCredentials);

      expect(mockSetSecureItem).toHaveBeenCalledWith(
        'security_context',
        expect.objectContaining({
          deviceId: 'test-device-id',
          sessionId: 'mock-random-string'
        }),
        { type: 'session' }
      );
    });
  });

  describe('verifyMFA', () => {
    const mockSecurityContext = {
      deviceId: 'device-123',
      sessionId: 'session-123',
      deviceFingerprint: 'device-123',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: Date.now()
    };

    it('should successfully verify MFA code', async () => {
      mockGetSecureItem.mockResolvedValueOnce({
        success: true,
        data: mockSecurityContext
      } as any);

      mockGetSecureItem.mockResolvedValueOnce({
        success: true,
        data: {
          sessionToken: 'mfa-session-token',
          expiresAt: Date.now() + 300000
        }
      } as any);

      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: UserRole.ADMIN,
          name: 'Admin User',
          permissions: [],
          mfaEnabled: true,
          lastLogin: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      mockAuthApi.verifyMFA.mockResolvedValue(mockResponse as any);
      mockSetSecureItem.mockResolvedValue(undefined);

      const result = await authService.verifyMFA('123456', mockSecurityContext);

      expect(result.isAuthenticated).toBe(true);
      expect(result.requiresMFA).toBe(false);
      expect(mockAuthApi.verifyMFA).toHaveBeenCalledWith(
        expect.objectContaining({
          mfaCode: '123456',
          sessionToken: 'mfa-session-token'
        })
      );
    });

    it('should handle invalid security context', async () => {
      mockGetSecureItem.mockResolvedValue({
        success: false,
        data: null
      } as any);

      const result = await authService.verifyMFA('123456', mockSecurityContext);

      expect(result.isAuthenticated).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle expired MFA session', async () => {
      mockGetSecureItem.mockResolvedValueOnce({
        success: true,
        data: mockSecurityContext
      } as any);

      mockGetSecureItem.mockResolvedValueOnce({
        success: false,
        data: null
      } as any);

      const result = await authService.verifyMFA('123456', mockSecurityContext);

      expect(result.isAuthenticated).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should successfully logout with valid token', async () => {
      mockGetSecureItem.mockResolvedValue({
        success: true,
        data: 'valid-token'
      } as any);

      mockAuthApi.logout.mockResolvedValue(undefined);
      mockSetSecureItem.mockResolvedValue(undefined);

      await authService.logout();

      expect(mockAuthApi.logout).toHaveBeenCalledWith('valid-token');
      expect(mockSetSecureItem).toHaveBeenCalledTimes(5); // All storage keys cleared
    });

    it('should handle logout without token', async () => {
      mockGetSecureItem.mockResolvedValue({
        success: false,
        data: null
      } as any);

      mockSetSecureItem.mockResolvedValue(undefined);

      await authService.logout();

      expect(mockAuthApi.logout).not.toHaveBeenCalled();
      expect(mockSetSecureItem).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token when near expiration', async () => {
      const jwtDecode = require('jwt-decode');
      const mockToken = 'old-token';
      const nearExpirationTime = Math.floor(Date.now() / 1000) + 200; // 200 seconds from now

      jwtDecode.mockReturnValue({ exp: nearExpirationTime });
      mockAuthApi.refreshToken.mockResolvedValue('new-token');
      mockSetSecureItem.mockResolvedValue(undefined);

      const result = await authService.refreshToken(mockToken);

      expect(result).toBe('new-token');
      expect(mockAuthApi.refreshToken).toHaveBeenCalledWith(mockToken);
      expect(mockSetSecureItem).toHaveBeenCalledWith('auth_token', 'new-token', { type: 'session' });
    });

    it('should return current token when not near expiration', async () => {
      const jwtDecode = require('jwt-decode');
      const mockToken = 'current-token';
      const futureExpirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      jwtDecode.mockReturnValue({ exp: futureExpirationTime });

      const result = await authService.refreshToken(mockToken);

      expect(result).toBe(mockToken);
      expect(mockAuthApi.refreshToken).not.toHaveBeenCalled();
    });

    it('should handle refresh token failure', async () => {
      const jwtDecode = require('jwt-decode');
      const mockToken = 'old-token';
      const nearExpirationTime = Math.floor(Date.now() / 1000) + 200;

      jwtDecode.mockReturnValue({ exp: nearExpirationTime });
      mockAuthApi.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      const result = await authService.refreshToken(mockToken);

      expect(result).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('should return true for valid session', async () => {
      const jwtDecode = require('jwt-decode');
      const futureExpirationTime = Math.floor(Date.now() / 1000) + 3600;

      mockGetSecureItem.mockResolvedValue({
        success: true,
        data: 'valid-token'
      } as any);

      jwtDecode.mockReturnValue({ exp: futureExpirationTime });

      const result = await authService.validateSession();

      expect(result).toBe(true);
    });

    it('should return false for expired session', async () => {
      const jwtDecode = require('jwt-decode');
      const pastExpirationTime = Math.floor(Date.now() / 1000) - 3600;

      mockGetSecureItem.mockResolvedValue({
        success: true,
        data: 'expired-token'
      } as any);

      jwtDecode.mockReturnValue({ exp: pastExpirationTime });

      const result = await authService.validateSession();

      expect(result).toBe(false);
    });

    it('should return false when no token exists', async () => {
      mockGetSecureItem.mockResolvedValue({
        success: false,
        data: null
      } as any);

      const result = await authService.validateSession();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from storage', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.BENEFICIARY,
        name: 'Test User',
        permissions: [],
        mfaEnabled: false,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetSecureItem.mockResolvedValue({
        success: true,
        data: mockUser
      } as any);

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user in storage', async () => {
      mockGetSecureItem.mockResolvedValue({
        success: false,
        data: null
      } as any);

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should successfully initiate password reset', async () => {
      mockAuthApi.resetPassword.mockResolvedValue(undefined);

      await expect(authService.resetPassword('test@example.com')).resolves.not.toThrow();
      expect(mockAuthApi.resetPassword).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle password reset failure', async () => {
      mockAuthApi.resetPassword.mockRejectedValue(new Error('Reset failed'));

      await expect(authService.resetPassword('test@example.com')).rejects.toThrow(
        'Failed to initiate password reset'
      );
    });
  });

  describe('validateAdminAccess', () => {
    it('should return true for admin users', async () => {
      const mockAdminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: UserRole.ADMINISTRATOR,
        name: 'Admin User',
        permissions: [],
        mfaEnabled: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetSecureItem.mockResolvedValue({
        success: true,
        data: mockAdminUser
      } as any);

      const result = await authService.validateAdminAccess('admin-123');

      expect(result).toBe(true);
    });

    it('should return false for non-admin users', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        role: UserRole.BENEFICIARY,
        name: 'Regular User',
        permissions: [],
        mfaEnabled: false,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGetSecureItem.mockResolvedValue({
        success: true,
        data: mockUser
      } as any);

      const result = await authService.validateAdminAccess('user-123');

      expect(result).toBe(false);
    });
  });

  describe('getSecurityContext', () => {
    it('should return security context when available', async () => {
      const mockContext = {
        deviceId: 'device-123',
        sessionId: 'session-123',
        deviceFingerprint: 'device-123',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: Date.now()
      };

      mockGetSecureItem.mockResolvedValue({
        success: true,
        data: mockContext
      } as any);

      const result = await authService.getSecurityContext();

      expect(result).toEqual(mockContext);
    });

    it('should return null when no context available', async () => {
      mockGetSecureItem.mockResolvedValue({
        success: false,
        data: null
      } as any);

      const result = await authService.getSecurityContext();

      expect(result).toBeNull();
    });
  });

  describe('checkResetAttempts', () => {
    it('should return allowed status and remaining attempts', async () => {
      const result = await authService.checkResetAttempts('test@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(3);
    });
  });

  describe('register', () => {
    it('should successfully register new user', async () => {
      const mockUserData = {
        email: 'newuser@example.com',
        password: 'password123',
        ipAddress: '127.0.0.1'
      };

      const mockResponse = {
        requiresMFA: false,
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: 'new-user-123',
          email: 'newuser@example.com',
          role: UserRole.BENEFICIARY,
          name: 'New User',
          permissions: [],
          mfaEnabled: false,
          lastLogin: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      mockAuthApi.login.mockResolvedValue(mockResponse as any);
      mockSetSecureItem.mockResolvedValue(undefined);

      const result = await authService.register(mockUserData);

      expect(result.isAuthenticated).toBe(true);
      expect(result.user?.email).toBe('newuser@example.com');
    });
  });

  describe('setupMFA', () => {
    it('should return MFA setup data', async () => {
      const result = await authService.setupMFA('user-123');

      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('secret');
    });
  });

  describe('validateDevice', () => {
    it('should return true for matching device ID', async () => {
      mockGetSecureItem.mockResolvedValue({
        success: true,
        data: 'device-123'
      } as any);

      const result = await authService.validateDevice('device-123');

      expect(result).toBe(true);
    });

    it('should return false for non-matching device ID', async () => {
      mockGetSecureItem.mockResolvedValue({
        success: true,
        data: 'device-123'
      } as any);

      const result = await authService.validateDevice('different-device');

      expect(result).toBe(false);
    });
  });
});
