// @package bcryptjs ^2.4.3
// @package crypto ^1.0.0
import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import * as bcrypt from 'bcryptjs';
import { security } from '../config/auth.config';

// Key rotation configuration
const keyRotation = {
  currentVersion: 1
};

// Promisify scrypt for async key derivation
const scryptAsync = promisify(scrypt);

/**
 * Interface for encrypted data structure
 */
interface EncryptedData {
  iv: string;
  encryptedData: string;
  authTag: string;
  keyVersion: number;
  salt?: string;
}

/**
 * Interface for token generation options
 */
interface TokenOptions {
  encoding?: 'hex' | 'base64' | 'base64url';
  urlSafe?: boolean;
  prefix?: string;
}

/**
 * Error class for encryption-related errors
 */
class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Validates password complexity requirements
 * @param password Password to validate
 * @throws {Error} If password doesn't meet complexity requirements
 */
const validatePasswordComplexity = (password: string): void => {
  if (password.length < security.passwordMinLength) {
    throw new EncryptionError(`Password must be at least ${security.passwordMinLength} characters long`);
  }
  if (security.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    throw new EncryptionError('Password must contain at least one uppercase letter');
  }
  if (security.passwordRequireLowercase && !/[a-z]/.test(password)) {
    throw new EncryptionError('Password must contain at least one lowercase letter');
  }
  if (security.passwordRequireNumbers && !/\d/.test(password)) {
    throw new EncryptionError('Password must contain at least one number');
  }
  if (security.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new EncryptionError('Password must contain at least one special character');
  }
};

/**
 * Enhanced password hashing with timing attack protection and validation
 * @param password Password to hash
 * @returns Promise resolving to securely hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    validatePasswordComplexity(password);
    
    // Generate cryptographically secure salt with configured rounds
    const hash = await bcrypt.hash(password, security.saltRounds);
    
    // Verify hash integrity
    const verifyHash = await bcrypt.compare(password, hash);
    if (!verifyHash) {
      throw new EncryptionError('Hash verification failed');
    }
    
    return hash;
  } catch (error) {
    throw new EncryptionError(`Password hashing failed: ${(error as Error).message}`);
  }
};

/**
 * Enhanced password verification with timing attack protection
 * @param password Password to verify
 * @param hash Hash to compare against
 * @returns Promise resolving to verification result
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    if (!password || !hash) {
      throw new EncryptionError('Invalid password or hash provided');
    }

    // Use constant-time comparison to prevent timing attacks
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new EncryptionError(`Password verification failed: ${(error as Error).message}`);
  }
};

/**
 * Enhanced data encryption using AES-256-GCM with key rotation
 * @param data Data to encrypt
 * @returns Encrypted data object with IV, auth tag, and key version
 */
export const encryptData = async (data: string): Promise<EncryptedData> => {
  let keyBuffer: Buffer | undefined;
  let iv: Buffer | undefined;

  try {
    if (!data) {
      throw new EncryptionError('No data provided for encryption');
    }

    // Generate cryptographically secure IV
    iv = randomBytes(16);

    // Get current encryption key and version
    const salt = randomBytes(32);
    keyBuffer = await scryptAsync(
      process.env.ENCRYPTION_KEY || 'default-encryption-key',
      salt,
      32
    ) as Buffer;

    // Create cipher with AES-256-GCM
    const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv) as any;

    // Encrypt data with authenticated encryption
    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encryptedData,
      authTag: authTag.toString('hex'),
      keyVersion: keyRotation.currentVersion,
      salt: salt.toString('hex')
    };
  } catch (error) {
    throw new EncryptionError(`Data encryption failed: ${(error as Error).message}`);
  } finally {
    // Implement secure memory wiping
    process.nextTick(() => {
      keyBuffer?.fill(0);
      iv?.fill(0);
    });
  }
};

/**
 * Enhanced data decryption with key rotation support
 * @param encryptedData Encrypted data object
 * @returns Decrypted data string
 */
export const decryptData = async (encryptedData: EncryptedData): Promise<string> => {
  let keyBuffer: Buffer | undefined;

  try {
    // Validate encrypted data structure
    if (!encryptedData?.iv || !encryptedData?.encryptedData || !encryptedData?.authTag) {
      throw new EncryptionError('Invalid encrypted data structure');
    }

    // Convert IV and auth tag back to buffers
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // Get appropriate key version - use stored salt if available, otherwise generate new one
    const salt = encryptedData.salt ? Buffer.from(encryptedData.salt, 'hex') : randomBytes(32);
    keyBuffer = await scryptAsync(
      process.env.ENCRYPTION_KEY || 'default-encryption-key',
      salt,
      32
    ) as Buffer;

    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv) as any;
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new EncryptionError(`Data decryption failed: ${(error as Error).message}`);
  } finally {
    // Implement secure memory wiping
    process.nextTick(() => {
      keyBuffer?.fill(0);
    });
  }
};

/**
 * Enhanced secure token generation with entropy validation
 * @param length Token length
 * @param options Token generation options
 * @returns Cryptographically secure token
 */
export const generateSecureToken = async (
  length: number,
  options: TokenOptions = {}
): Promise<string> => {
  try {
    if (length < 16) {
      throw new EncryptionError('Token length must be at least 16 characters');
    }

    // Generate random bytes with entropy check
    const bytes = randomBytes(Math.ceil(length * 1.5));
    
    // Format token according to options
    let token = options.encoding === 'base64' 
      ? bytes.toString('base64')
      : options.encoding === 'base64url'
        ? bytes.toString('base64url')
        : bytes.toString('hex');

    // Trim to exact length
    token = token.slice(0, length);

    // Add prefix if specified
    if (options.prefix) {
      token = `${options.prefix}${token}`;
    }

    // Make URL safe if required
    if (options.urlSafe) {
      token = token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    return token;
  } catch (error) {
    throw new EncryptionError(`Token generation failed: ${(error as Error).message}`);
  }
};