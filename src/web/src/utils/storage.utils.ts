/**
 * Secure Browser Storage Utility
 * Version: 1.0.0
 * 
 * Implements AES-256 encryption with HMAC validation for secure browser storage operations.
 * Provides type-safe storage operations with comprehensive error handling and security features.
 */

import CryptoJS from 'crypto-js'; // v4.1.1
import { AUTH_CONFIG } from '../config/auth.config';
import { Result } from '../types/common.types';
import { UserRole } from '../types/auth.types';

// Environment variables for encryption keys
const ENCRYPTION_KEY = process.env.VITE_STORAGE_ENCRYPTION_KEY as string;
const HMAC_KEY = process.env.VITE_STORAGE_HMAC_KEY as string;
const STORAGE_VERSION = '1';

// Storage configuration types
export type StorageType = 'local' | 'session';

export interface StorageOptions {
  type?: StorageType;
  compress?: boolean;
  role?: UserRole;
  namespace?: string;
}

interface StorageMetadata {
  version: string;
  timestamp: number;
  compressed: boolean;
  hmac: string;
  type: string;
}

interface EncryptedData {
  data: string;
  metadata: StorageMetadata;
}

/**
 * Securely stores data in browser storage with encryption and HMAC validation
 * @param key Storage key
 * @param value Data to store
 * @param options Storage options
 */
export async function setSecureItem<T>(
  key: string,
  value: T,
  options: StorageOptions = {}
): Promise<Result<void>> {
  try {
    const storage = options.type === 'session' ? sessionStorage : localStorage;
    
    // Validate storage availability
    if (!storage) {
      return { success: false, error: new Error('Storage not available') };
    }

    // Generate storage metadata
    const metadata: StorageMetadata = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      compressed: !!options.compress,
      hmac: '',
      type: typeof value
    };

    // Convert value to string
    const valueStr = JSON.stringify(value);
    
    // Compress if needed
    const processedData = options.compress ? 
      CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(valueStr)) : 
      valueStr;

    // Generate HMAC
    metadata.hmac = CryptoJS.HmacSHA256(processedData, HMAC_KEY).toString();

    // Encrypt data
    const encrypted = CryptoJS.AES.encrypt(
      processedData,
      ENCRYPTION_KEY,
      { mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    ).toString();

    // Prepare final storage object
    const storageData: EncryptedData = {
      data: encrypted,
      metadata
    };

    // Store with namespace if provided
    const storageKey = options.namespace ? `${options.namespace}:${key}` : key;
    storage.setItem(storageKey, JSON.stringify(storageData));

    // Emit storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: JSON.stringify(storageData)
    }));

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      return { success: false, error: new Error('Storage quota exceeded') };
    }
    return { success: false, error: new Error('Failed to store data') };
  }
}

/**
 * Retrieves and decrypts data from browser storage
 * @param key Storage key
 * @param options Storage options
 */
export async function getSecureItem<T>(
  key: string,
  options: StorageOptions = {}
): Promise<Result<T | null>> {
  try {
    const storage = options.type === 'session' ? sessionStorage : localStorage;
    
    // Validate storage availability
    if (!storage) {
      return { success: false, error: new Error('Storage not available') };
    }

    // Get stored data with namespace if provided
    const storageKey = options.namespace ? `${options.namespace}:${key}` : key;
    const storedValue = storage.getItem(storageKey);

    if (!storedValue) {
      return { success: true, data: null };
    }

    // Parse stored data
    const { data, metadata }: EncryptedData = JSON.parse(storedValue);

    // Validate storage version
    if (metadata.version !== STORAGE_VERSION) {
      return { success: false, error: new Error('Incompatible storage version') };
    }

    // Decrypt data
    const decrypted = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);

    // Verify HMAC
    const computedHmac = CryptoJS.HmacSHA256(decrypted, HMAC_KEY).toString();
    if (computedHmac !== metadata.hmac) {
      return { success: false, error: new Error('Data integrity check failed') };
    }

    // Decompress if needed
    const processedData = metadata.compressed ?
      CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(decrypted)) :
      decrypted;

    // Parse and validate JSON data
    const parsedData = JSON.parse(processedData) as T;

    // Check expiration for role-based storage
    if (options.role && AUTH_CONFIG.tokenExpirationTime[options.role]) {
      const expirationTime = metadata.timestamp + AUTH_CONFIG.tokenExpirationTime[options.role];
      if (Date.now() > expirationTime) {
        await removeItem(key, options);
        return { success: true, data: null };
      }
    }

    return { success: true, data: parsedData };
  } catch (error) {
    return { success: false, error: new Error('Failed to retrieve data') };
  }
}

/**
 * Removes an item from browser storage
 * @param key Storage key
 * @param options Storage options
 */
export async function removeItem(
  key: string,
  options: StorageOptions = {}
): Promise<Result<void>> {
  try {
    const storage = options.type === 'session' ? sessionStorage : localStorage;
    
    if (!storage) {
      return { success: false, error: new Error('Storage not available') };
    }

    const storageKey = options.namespace ? `${options.namespace}:${key}` : key;
    storage.removeItem(storageKey);

    // Emit storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: null
    }));

    return { success: true };
  } catch (error) {
    return { success: false, error: new Error('Failed to remove item') };
  }
}

/**
 * Clears all stored data with optional selective clearing
 * @param options Storage options
 */
export async function clearStorage(
  options: StorageOptions = {}
): Promise<Result<void>> {
  try {
    const storage = options.type === 'session' ? sessionStorage : localStorage;
    
    if (!storage) {
      return { success: false, error: new Error('Storage not available') };
    }

    if (options.namespace) {
      // Clear only namespace-specific items
      const keys = Object.keys(storage);
      keys.forEach(key => {
        if (key.startsWith(`${options.namespace}:`)) {
          storage.removeItem(key);
        }
      });
    } else {
      // Clear all storage
      storage.clear();
    }

    // Emit storage clear event
    window.dispatchEvent(new StorageEvent('storage', {
      key: null,
      newValue: null
    }));

    return { success: true };
  } catch (error) {
    return { success: false, error: new Error('Failed to clear storage') };
  }
}

/**
 * Checks if stored data has expired
 * @param key Storage key
 * @param options Storage options
 */
export async function isStorageExpired(
  key: string,
  options: StorageOptions = {}
): Promise<Result<boolean>> {
  try {
    const storage = options.type === 'session' ? sessionStorage : localStorage;
    
    if (!storage) {
      return { success: false, error: new Error('Storage not available') };
    }

    const storageKey = options.namespace ? `${options.namespace}:${key}` : key;
    const storedValue = storage.getItem(storageKey);

    if (!storedValue) {
      return { success: true, data: true };
    }

    const { metadata }: EncryptedData = JSON.parse(storedValue);

    if (metadata.version !== STORAGE_VERSION) {
      return { success: true, data: true };
    }

    if (options.role && AUTH_CONFIG.tokenExpirationTime[options.role]) {
      const expirationTime = metadata.timestamp + AUTH_CONFIG.tokenExpirationTime[options.role];
      return { success: true, data: Date.now() > expirationTime };
    }

    return { success: true, data: false };
  } catch (error) {
    return { success: false, error: new Error('Failed to check expiration') };
  }
}