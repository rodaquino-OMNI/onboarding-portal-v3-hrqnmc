import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  encryptData,
  decryptData,
  generateSecureToken,
  hashPassword,
  verifyPassword
} from '../../utils/encryption';

describe('Encryption Utils', () => {
  // Setup test environment variables
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-long!!';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  });
  describe('encryptData', () => {
    it('should encrypt data successfully', async () => {
      const data = 'sensitive data';
      const encrypted = await encryptData(data);

      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('keyVersion');
    });

    it('should produce different output for different inputs', async () => {
      const data1 = 'data1';
      const data2 = 'data2';

      const encrypted1 = await encryptData(data1);
      const encrypted2 = await encryptData(data2);

      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
    });

    it('should produce different IVs for same data', async () => {
      const data = 'same data';
      const encrypted1 = await encryptData(data);
      const encrypted2 = await encryptData(data);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should handle empty string', async () => {
      await expect(encryptData('')).rejects.toThrow();
    });

    it('should encrypt long strings', async () => {
      const longData = 'a'.repeat(10000);
      const encrypted = await encryptData(longData);

      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted.encryptedData.length).toBeGreaterThan(0);
    });

    it('should encrypt special characters', async () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = await encryptData(specialData);

      expect(encrypted).toHaveProperty('encryptedData');
    });
  });

  describe('decryptData', () => {
    it('should decrypt data successfully', async () => {
      const originalData = 'test data';
      const encrypted = await encryptData(originalData);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should handle various data types', async () => {
      const jsonData = JSON.stringify({ test: 'value', number: 123 });
      const encrypted = await encryptData(jsonData);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBe(jsonData);
    });

    it('should throw error for invalid encrypted data structure', async () => {
      const invalidData = {
        iv: '',
        encryptedData: '',
        authTag: '',
        keyVersion: 1
      };

      await expect(decryptData(invalidData)).rejects.toThrow();
    });

    it('should throw error for missing IV', async () => {
      const invalidData = {
        iv: null as any,
        encryptedData: 'data',
        authTag: 'tag',
        keyVersion: 1
      };

      await expect(decryptData(invalidData)).rejects.toThrow();
    });

    it('should decrypt long encrypted data', async () => {
      const longData = 'test'.repeat(1000);
      const encrypted = await encryptData(longData);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBe(longData);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of specified length', async () => {
      const length = 32;
      const token = await generateSecureToken(length);

      expect(token).toHaveLength(length);
    });

    it('should generate different tokens each time', async () => {
      const token1 = await generateSecureToken(32);
      const token2 = await generateSecureToken(32);

      expect(token1).not.toBe(token2);
    });

    it('should handle various token lengths', async () => {
      const lengths = [16, 32, 64, 128];

      for (const length of lengths) {
        const token = await generateSecureToken(length);
        expect(token).toHaveLength(length);
      }
    });

    it('should generate alphanumeric tokens', async () => {
      const token = await generateSecureToken(32);
      expect(token).toMatch(/^[0-9a-f]+$/i);
    });

    it('should throw error for token length less than 16', async () => {
      await expect(generateSecureToken(10)).rejects.toThrow();
    });

    it('should generate base64 encoded tokens', async () => {
      const token = await generateSecureToken(32, { encoding: 'base64' });

      expect(token).toHaveLength(32);
      expect(typeof token).toBe('string');
    });

    it('should generate base64url encoded tokens', async () => {
      const token = await generateSecureToken(32, { encoding: 'base64url' });

      expect(token).toHaveLength(32);
      expect(typeof token).toBe('string');
    });

    it('should add prefix to token', async () => {
      const prefix = 'tok_';
      const token = await generateSecureToken(32, { prefix });

      expect(token.startsWith(prefix)).toBe(true);
    });

    it('should generate URL-safe tokens', async () => {
      const token = await generateSecureToken(32, { urlSafe: true, encoding: 'base64' });

      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
      expect(token).not.toContain('=');
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'Password123!@#';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Password123!@#';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for weak password without uppercase', async () => {
      const password = 'password123!@#';

      await expect(hashPassword(password)).rejects.toThrow();
    });

    it('should throw error for weak password without lowercase', async () => {
      const password = 'PASSWORD123!@#';

      await expect(hashPassword(password)).rejects.toThrow();
    });

    it('should throw error for weak password without numbers', async () => {
      const password = 'Password!@#';

      await expect(hashPassword(password)).rejects.toThrow();
    });

    it('should throw error for weak password without special characters', async () => {
      const password = 'Password123';

      await expect(hashPassword(password)).rejects.toThrow();
    });

    it('should throw error for short password', async () => {
      const password = 'Pwd1!';

      await expect(hashPassword(password)).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'Password123!@#';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Password123!@#';
      const wrongPassword = 'WrongPassword123!@#';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should throw error for empty password', async () => {
      const hash = await hashPassword('Password123!@#');

      await expect(verifyPassword('', hash)).rejects.toThrow();
    });

    it('should throw error for empty hash', async () => {
      await expect(verifyPassword('Password123!@#', '')).rejects.toThrow();
    });

    it('should handle multiple verification attempts', async () => {
      const password = 'Password123!@#';
      const hash = await hashPassword(password);

      for (let i = 0; i < 5; i++) {
        const isValid = await verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });
  });
});
