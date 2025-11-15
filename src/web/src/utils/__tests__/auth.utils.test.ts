/**
 * Auth Utils Tests
 * Comprehensive test coverage for authentication utilities
 */

import {
  getStoredToken,
  getStoredUser,
  setAuthData,
  isTokenValid,
  shouldRefreshToken
} from '../auth.utils';
import { UserRole } from '../../types/auth.types';
import jwtDecode from 'jwt-decode';
import CryptoJS from 'crypto-js';

// Mock dependencies
jest.mock('jwt-decode');
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(() => ({ toString: () => 'encrypted-data' })),
    decrypt: jest.fn(() => ({
      toString: jest.fn((format: any) => {
        if (format === 'Utf8') {
          return JSON.stringify({
            id: 'user-123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'BENEFICIARY',
            permissions: [],
            mfaEnabled: false,
            cpf: '12345678900',
            phoneNumber: '11999999999',
            lastLoginIp: '192.168.1.1'
          });
        }
        return 'decrypted-data';
      })
    }))
  },
  SHA256: jest.fn(() => ({ toString: () => 'device-fingerprint-hash' })),
  enc: { Utf8: 'Utf8' }
}));

jest.mock('../../config/auth.config', () => ({
  AUTH_CONFIG: {
    tokenExpirationTime: {
      ADMIN: 14400000,
      BENEFICIARY: 1800000,
      BROKER: 28800000,
      HR: 28800000,
      UNDERWRITER: 14400000,
      PARENT: 1800000
    },
    tokenRefreshThreshold: 300000
  }
}));

const mockedJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;

describe('Auth Utils', () => {
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    mockLocalStorage = {};

    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key: string) => mockLocalStorage[key] || null);
    Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    Storage.prototype.removeItem = jest.fn((key: string) => {
      delete mockLocalStorage[key];
    });

    // Mock console methods
    global.console.error = jest.fn();

    jest.clearAllMocks();
  });

  describe('getStoredToken', () => {
    it('should retrieve and decrypt stored token', () => {
      mockLocalStorage['austa_auth_token'] = 'encrypted-token';

      CryptoJS.AES.decrypt = jest.fn(() => ({
        toString: jest.fn(() => 'valid-jwt-token')
      })) as any;

      const token = getStoredToken();

      expect(token).toBe('valid-jwt-token');
      expect(CryptoJS.AES.decrypt).toHaveBeenCalled();
    });

    it('should return null when no token is stored', () => {
      const token = getStoredToken();

      expect(token).toBeNull();
    });

    it('should handle decryption errors', () => {
      mockLocalStorage['austa_auth_token'] = 'invalid-encrypted-token';

      CryptoJS.AES.decrypt = jest.fn(() => {
        throw new Error('Decryption failed');
      }) as any;

      const token = getStoredToken();

      expect(token).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should remove token if decryption results in empty string', () => {
      mockLocalStorage['austa_auth_token'] = 'encrypted-token';

      CryptoJS.AES.decrypt = jest.fn(() => ({
        toString: jest.fn(() => '')
      })) as any;

      const token = getStoredToken();

      expect(token).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('austa_auth_token');
    });
  });

  describe('getStoredUser', () => {
    it('should retrieve and decrypt stored user data', () => {
      mockLocalStorage['austa_user_data'] = 'encrypted-user';

      const user = getStoredUser();

      expect(user).toBeDefined();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('test@example.com');
    });

    it('should sanitize sensitive user data for LGPD compliance', () => {
      mockLocalStorage['austa_user_data'] = 'encrypted-user';

      const user = getStoredUser();

      expect(user?.cpf).toMatch(/\*\*\*\.\*\*\*\.\*\*\*-\d{2}/);
      expect(user?.phoneNumber).toMatch(/\*\*\*\*-\d{4}/);
      expect(user?.lastLoginIp).toBe('***.***.***.**');
    });

    it('should return null when no user data is stored', () => {
      const user = getStoredUser();

      expect(user).toBeNull();
    });

    it('should handle decryption errors', () => {
      mockLocalStorage['austa_user_data'] = 'invalid-encrypted-user';

      CryptoJS.AES.decrypt = jest.fn(() => {
        throw new Error('Decryption failed');
      }) as any;

      const user = getStoredUser();

      expect(user).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('setAuthData', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.BENEFICIARY,
      permissions: ['read'],
      mfaEnabled: false,
      isActive: true,
      dataConsentGiven: true,
      cpf: '12345678900',
      phoneNumber: '11999999999',
      lastLoginIp: '192.168.1.1',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date()
    };

    it('should encrypt and store token and user data', () => {
      setAuthData('jwt-token', mockUser);

      expect(CryptoJS.AES.encrypt).toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalledWith('austa_auth_token', expect.any(String));
      expect(localStorage.setItem).toHaveBeenCalledWith('austa_user_data', expect.any(String));
    });

    it('should generate and store device fingerprint', () => {
      setAuthData('jwt-token', mockUser);

      expect(CryptoJS.SHA256).toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'austa_device_fingerprint',
        expect.any(String)
      );
    });

    it('should store only minimal user data for LGPD compliance', () => {
      setAuthData('jwt-token', mockUser);

      // Verify that sensitive data like cpf, phoneNumber are not stored
      const encryptCall = (CryptoJS.AES.encrypt as jest.Mock).mock.calls.find((call: any[]) =>
        call[0].includes('user-123')
      );

      expect(encryptCall).toBeDefined();
      const storedData = JSON.parse(encryptCall[0]);
      expect(storedData).not.toHaveProperty('cpf');
      expect(storedData).not.toHaveProperty('phoneNumber');
      expect(storedData).not.toHaveProperty('lastLoginIp');
    });

    it('should cleanup on encryption error', () => {
      CryptoJS.AES.encrypt = jest.fn(() => {
        throw new Error('Encryption failed');
      }) as any;

      expect(() => setAuthData('jwt-token', mockUser)).toThrow(
        'Failed to store authentication data securely'
      );

      expect(localStorage.removeItem).toHaveBeenCalledWith('austa_auth_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('austa_user_data');
    });
  });

  describe('isTokenValid', () => {
    const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const currentTime = Math.floor(Date.now() / 1000);

    beforeEach(() => {
      mockLocalStorage['austa_device_fingerprint'] = 'device-fingerprint-hash';
    });

    it('should return valid for a valid token', () => {
      mockedJwtDecode.mockReturnValue({
        exp: futureTime,
        role: UserRole.BENEFICIARY,
        deviceFingerprint: 'device-fingerprint-hash',
        iat: currentTime - 100,
        sub: 'user-123',
        email: 'test@example.com'
      });

      const result = isTokenValid('valid-token', UserRole.BENEFICIARY);

      expect(result.isValid).toBe(true);
      expect(result.expired).toBe(false);
      expect(result.requiresRefresh).toBe(false);
    });

    it('should return invalid for expired token', () => {
      mockedJwtDecode.mockReturnValue({
        exp: pastTime,
        role: UserRole.BENEFICIARY,
        deviceFingerprint: 'device-fingerprint-hash',
        iat: pastTime - 1000,
        sub: 'user-123',
        email: 'test@example.com'
      });

      const result = isTokenValid('expired-token', UserRole.BENEFICIARY);

      expect(result.isValid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.error).toBe('Token expired');
      expect(result.requiresRefresh).toBe(true);
    });

    it('should return invalid for role mismatch', () => {
      mockedJwtDecode.mockReturnValue({
        exp: futureTime,
        role: UserRole.ADMIN,
        deviceFingerprint: 'device-fingerprint-hash',
        iat: currentTime - 100,
        sub: 'user-123',
        email: 'test@example.com'
      });

      const result = isTokenValid('token', UserRole.BENEFICIARY);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid role');
      expect(result.requiresRefresh).toBe(false);
    });

    it('should return invalid for device fingerprint mismatch', () => {
      mockedJwtDecode.mockReturnValue({
        exp: futureTime,
        role: UserRole.BENEFICIARY,
        deviceFingerprint: 'different-fingerprint',
        iat: currentTime - 100,
        sub: 'user-123',
        email: 'test@example.com'
      });

      const result = isTokenValid('token', UserRole.BENEFICIARY);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid device fingerprint');
      expect(result.requiresRefresh).toBe(false);
    });

    it('should return invalid for session expiration', () => {
      const oldIat = currentTime - 10000; // Very old token

      mockedJwtDecode.mockReturnValue({
        exp: futureTime,
        role: UserRole.BENEFICIARY,
        deviceFingerprint: 'device-fingerprint-hash',
        iat: oldIat,
        sub: 'user-123',
        email: 'test@example.com'
      });

      const result = isTokenValid('token', UserRole.BENEFICIARY);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Session expired');
      expect(result.requiresRefresh).toBe(true);
    });

    it('should handle invalid token format', () => {
      mockedJwtDecode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = isTokenValid('invalid-token', UserRole.BENEFICIARY);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid token format');
      expect(result.requiresRefresh).toBe(false);
    });
  });

  describe('shouldRefreshToken', () => {
    it('should return true when token is near expiration', () => {
      const nearExpirationTime = Math.floor(Date.now() / 1000) + 200; // 200 seconds from now

      mockedJwtDecode.mockReturnValue({
        exp: nearExpirationTime,
        role: UserRole.BENEFICIARY,
        deviceFingerprint: 'device-fingerprint-hash',
        iat: Math.floor(Date.now() / 1000) - 1000,
        sub: 'user-123',
        email: 'test@example.com'
      });

      const result = shouldRefreshToken('token', UserRole.BENEFICIARY);

      expect(result).toBe(true);
    });

    it('should return false when token has plenty of time left', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      mockedJwtDecode.mockReturnValue({
        exp: futureTime,
        role: UserRole.BENEFICIARY,
        deviceFingerprint: 'device-fingerprint-hash',
        iat: Math.floor(Date.now() / 1000) - 100,
        sub: 'user-123',
        email: 'test@example.com'
      });

      const result = shouldRefreshToken('token', UserRole.BENEFICIARY);

      expect(result).toBe(false);
    });

    it('should return true when token has no expiration', () => {
      mockedJwtDecode.mockReturnValue({
        role: UserRole.BENEFICIARY,
        deviceFingerprint: 'device-fingerprint-hash',
        iat: Math.floor(Date.now() / 1000) - 100,
        sub: 'user-123',
        email: 'test@example.com'
      } as any);

      const result = shouldRefreshToken('token', UserRole.BENEFICIARY);

      expect(result).toBe(true);
    });

    it('should return true on decode error', () => {
      mockedJwtDecode.mockImplementation(() => {
        throw new Error('Decode failed');
      });

      const result = shouldRefreshToken('invalid-token', UserRole.BENEFICIARY);

      expect(result).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
