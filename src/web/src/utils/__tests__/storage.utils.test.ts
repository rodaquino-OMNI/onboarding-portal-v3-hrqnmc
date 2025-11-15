/**
 * Storage Utils Tests
 * Comprehensive test coverage for secure storage utilities
 */

import {
  setSecureItem,
  getSecureItem,
  removeItem,
  clearStorage,
  isStorageExpired
} from '../storage.utils';
import { UserRole } from '../../types/auth.types';
import CryptoJS from 'crypto-js';

// Mock CryptoJS
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(() => ({ toString: () => 'encrypted-data' })),
    decrypt: jest.fn(() => ({
      toString: jest.fn(() => JSON.stringify({ testData: 'value' }))
    }))
  },
  HmacSHA256: jest.fn(() => ({ toString: () => 'hmac-hash' })),
  enc: {
    Utf8: { parse: jest.fn(), stringify: jest.fn(() => '{"testData":"value"}') },
    Base64: { parse: jest.fn(), stringify: jest.fn(() => 'compressed-data') }
  },
  mode: { CBC: 'CBC' },
  pad: { Pkcs7: 'Pkcs7' }
}));

// Mock AUTH_CONFIG
jest.mock('../../config/auth.config', () => ({
  AUTH_CONFIG: {
    tokenExpirationTime: {
      ADMIN: 14400000,
      BENEFICIARY: 1800000,
      BROKER: 28800000,
      HR: 28800000,
      UNDERWRITER: 14400000,
      PARENT: 1800000
    }
  }
}));

describe('Storage Utils', () => {
  let mockLocalStorage: Storage;
  let mockSessionStorage: Storage;

  beforeEach(() => {
    // Create mock storage
    const createMockStorage = (): Storage => {
      let store: Record<string, string> = {};
      return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          store = {};
        }),
        key: jest.fn((index: number) => Object.keys(store)[index] || null),
        get length() {
          return Object.keys(store).length;
        }
      };
    };

    mockLocalStorage = createMockStorage();
    mockSessionStorage = createMockStorage();

    // Mock window.localStorage and sessionStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });

    // Mock window.dispatchEvent
    jest.spyOn(window, 'dispatchEvent').mockImplementation(() => true);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setSecureItem', () => {
    it('should store data in localStorage by default', async () => {
      const result = await setSecureItem('testKey', { test: 'data' });

      expect(result.success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should store data in sessionStorage when specified', async () => {
      const result = await setSecureItem('testKey', { test: 'data' }, { type: 'session' });

      expect(result.success).toBe(true);
      expect(mockSessionStorage.setItem).toHaveBeenCalled();
    });

    it('should encrypt data before storing', async () => {
      await setSecureItem('testKey', { sensitive: 'data' });

      expect(CryptoJS.AES.encrypt).toHaveBeenCalled();
      expect(CryptoJS.HmacSHA256).toHaveBeenCalled();
    });

    it('should use namespace when provided', async () => {
      await setSecureItem('testKey', { test: 'data' }, { namespace: 'app' });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'app:testKey',
        expect.any(String)
      );
    });

    it('should compress data when compress option is true', async () => {
      await setSecureItem('testKey', { test: 'data' }, { compress: true });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle quota exceeded error', async () => {
      mockLocalStorage.setItem = jest.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const result = await setSecureItem('testKey', { test: 'data' });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Storage quota exceeded');
    });

    it('should emit storage event', async () => {
      await setSecureItem('testKey', { test: 'data' });

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'storage'
        })
      );
    });
  });

  describe('getSecureItem', () => {
    it('should retrieve and decrypt data from localStorage', async () => {
      const mockEncryptedData = {
        data: 'encrypted-data',
        metadata: {
          version: '1',
          timestamp: Date.now(),
          compressed: false,
          hmac: 'hmac-hash',
          type: 'object'
        }
      };

      mockLocalStorage.getItem = jest.fn(() => JSON.stringify(mockEncryptedData));

      const result = await getSecureItem('testKey');

      expect(result.success).toBe(true);
      expect(CryptoJS.AES.decrypt).toHaveBeenCalled();
    });

    it('should return null when key does not exist', async () => {
      mockLocalStorage.getItem = jest.fn(() => null);

      const result = await getSecureItem('nonExistentKey');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should use sessionStorage when specified', async () => {
      const mockEncryptedData = {
        data: 'encrypted-data',
        metadata: {
          version: '1',
          timestamp: Date.now(),
          compressed: false,
          hmac: 'hmac-hash',
          type: 'object'
        }
      };

      mockSessionStorage.getItem = jest.fn(() => JSON.stringify(mockEncryptedData));

      await getSecureItem('testKey', { type: 'session' });

      expect(mockSessionStorage.getItem).toHaveBeenCalled();
    });

    it('should use namespace when provided', async () => {
      const mockEncryptedData = {
        data: 'encrypted-data',
        metadata: {
          version: '1',
          timestamp: Date.now(),
          compressed: false,
          hmac: 'hmac-hash',
          type: 'object'
        }
      };

      mockLocalStorage.getItem = jest.fn(() => JSON.stringify(mockEncryptedData));

      await getSecureItem('testKey', { namespace: 'app' });

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('app:testKey');
    });

    it('should verify HMAC', async () => {
      const mockEncryptedData = {
        data: 'encrypted-data',
        metadata: {
          version: '1',
          timestamp: Date.now(),
          compressed: false,
          hmac: 'different-hash',
          type: 'object'
        }
      };

      mockLocalStorage.getItem = jest.fn(() => JSON.stringify(mockEncryptedData));

      const result = await getSecureItem('testKey');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Data integrity check failed');
    });

    it('should check expiration for role-based storage', async () => {
      const expiredTimestamp = Date.now() - 2000000; // 2000 seconds ago
      const mockEncryptedData = {
        data: 'encrypted-data',
        metadata: {
          version: '1',
          timestamp: expiredTimestamp,
          compressed: false,
          hmac: 'hmac-hash',
          type: 'object'
        }
      };

      mockLocalStorage.getItem = jest.fn(() => JSON.stringify(mockEncryptedData));

      const result = await getSecureItem('testKey', { role: UserRole.BENEFICIARY });

      // Should return null for expired data
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle incompatible storage version', async () => {
      const mockEncryptedData = {
        data: 'encrypted-data',
        metadata: {
          version: '0',
          timestamp: Date.now(),
          compressed: false,
          hmac: 'hmac-hash',
          type: 'object'
        }
      };

      mockLocalStorage.getItem = jest.fn(() => JSON.stringify(mockEncryptedData));

      const result = await getSecureItem('testKey');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Incompatible storage version');
    });
  });

  describe('removeItem', () => {
    it('should remove item from localStorage', async () => {
      const result = await removeItem('testKey');

      expect(result.success).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('testKey');
    });

    it('should remove item from sessionStorage when specified', async () => {
      const result = await removeItem('testKey', { type: 'session' });

      expect(result.success).toBe(true);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('testKey');
    });

    it('should use namespace when provided', async () => {
      await removeItem('testKey', { namespace: 'app' });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('app:testKey');
    });

    it('should emit storage event', async () => {
      await removeItem('testKey');

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'storage',
          newValue: null
        })
      );
    });
  });

  describe('clearStorage', () => {
    it('should clear all localStorage items', async () => {
      const result = await clearStorage();

      expect(result.success).toBe(true);
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });

    it('should clear sessionStorage when specified', async () => {
      const result = await clearStorage({ type: 'session' });

      expect(result.success).toBe(true);
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('should clear only namespace items when namespace provided', async () => {
      // Setup storage with multiple namespaced items
      const store: Record<string, string> = {
        'app:key1': 'value1',
        'app:key2': 'value2',
        'other:key3': 'value3'
      };

      mockLocalStorage.removeItem = jest.fn((key: string) => {
        delete store[key];
      });

      Object.defineProperty(mockLocalStorage, 'length', {
        get: () => Object.keys(store).length
      });

      // Mock Object.keys to return our store keys
      Object.keys = jest.fn(() => ['app:key1', 'app:key2', 'other:key3']);

      await clearStorage({ namespace: 'app' });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('app:key1');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('app:key2');
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('other:key3');
    });

    it('should emit storage clear event', async () => {
      await clearStorage();

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'storage',
          key: null
        })
      );
    });
  });

  describe('isStorageExpired', () => {
    it('should return true for non-existent items', async () => {
      mockLocalStorage.getItem = jest.fn(() => null);

      const result = await isStorageExpired('testKey');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return true for incompatible version', async () => {
      const mockEncryptedData = {
        data: 'encrypted-data',
        metadata: {
          version: '0',
          timestamp: Date.now(),
          compressed: false,
          hmac: 'hmac-hash',
          type: 'object'
        }
      };

      mockLocalStorage.getItem = jest.fn(() => JSON.stringify(mockEncryptedData));

      const result = await isStorageExpired('testKey');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return true for expired role-based storage', async () => {
      const expiredTimestamp = Date.now() - 2000000;
      const mockEncryptedData = {
        data: 'encrypted-data',
        metadata: {
          version: '1',
          timestamp: expiredTimestamp,
          compressed: false,
          hmac: 'hmac-hash',
          type: 'object'
        }
      };

      mockLocalStorage.getItem = jest.fn(() => JSON.stringify(mockEncryptedData));

      const result = await isStorageExpired('testKey', { role: UserRole.BENEFICIARY });

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false for valid non-expired storage', async () => {
      const mockEncryptedData = {
        data: 'encrypted-data',
        metadata: {
          version: '1',
          timestamp: Date.now(),
          compressed: false,
          hmac: 'hmac-hash',
          type: 'object'
        }
      };

      mockLocalStorage.getItem = jest.fn(() => JSON.stringify(mockEncryptedData));

      const result = await isStorageExpired('testKey');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });
});
