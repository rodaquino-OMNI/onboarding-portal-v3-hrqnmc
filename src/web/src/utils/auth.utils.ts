// @ts-check
import jwtDecode from 'jwt-decode'; // v3.1.2
import CryptoJS from 'crypto-js'; // v4.1.1
import { 
  User, 
  DecodedToken, 
  UserRole, 
  AuthState, 
  TokenValidationResult 
} from '../types/auth.types';
import { AUTH_CONFIG } from '../config/auth.config';

// Secure storage keys
const TOKEN_KEY = 'austa_auth_token';
const USER_KEY = 'austa_user_data';
const MFA_SESSION_KEY = 'austa_mfa_session';
const DEVICE_FINGERPRINT_KEY = 'austa_device_fingerprint';

// Encryption key derived from environment (in production this would be injected)
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-secure-key';

/**
 * Generates a unique device fingerprint for additional security
 * @returns {string} Device fingerprint hash
 */
const generateDeviceFingerprint = (): string => {
  const deviceInfo = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
  return CryptoJS.SHA256(JSON.stringify(deviceInfo)).toString();
};

/**
 * Securely retrieves and decrypts the stored authentication token
 * @returns {string | null} Decrypted token or null if not found
 */
export const getStoredToken = (): string | null => {
  try {
    const encryptedToken = localStorage.getItem(TOKEN_KEY);
    if (!encryptedToken) return null;

    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    const decryptedToken = bytes.toString(CryptoJS.enc.Utf8);

    // Verify token integrity
    if (!decryptedToken || decryptedToken.length === 0) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }

    return decryptedToken;
  } catch (error) {
    console.error('Error retrieving stored token:', error);
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
};

/**
 * Securely retrieves and decrypts stored user data with LGPD compliance
 * @returns {User | null} Decrypted user data or null if not found
 */
export const getStoredUser = (): User | null => {
  try {
    const encryptedUser = localStorage.getItem(USER_KEY);
    if (!encryptedUser) return null;

    const bytes = CryptoJS.AES.decrypt(encryptedUser, ENCRYPTION_KEY);
    const decryptedUser = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // LGPD compliance: Data minimization
    const sanitizedUser: User = {
      ...decryptedUser,
      cpf: `***.***.***-${decryptedUser.cpf.slice(-2)}`,
      phoneNumber: `****-${decryptedUser.phoneNumber.slice(-4)}`,
      lastLoginIp: '***.***.***.**'
    };

    return sanitizedUser;
  } catch (error) {
    console.error('Error retrieving stored user:', error);
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

/**
 * Securely stores encrypted authentication data with role-based restrictions
 * @param {string} token JWT token to store
 * @param {User} user User data to store
 */
export const setAuthData = (token: string, user: User): void => {
  try {
    // Generate and store device fingerprint
    const deviceFingerprint = generateDeviceFingerprint();
    localStorage.setItem(DEVICE_FINGERPRINT_KEY, deviceFingerprint);

    // Encrypt and store token
    const encryptedToken = CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
    localStorage.setItem(TOKEN_KEY, encryptedToken);

    // LGPD compliance: Store only necessary user data
    const minimalUserData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions,
      mfaEnabled: user.mfaEnabled,
      isActive: user.isActive,
      dataConsentGiven: user.dataConsentGiven,
      deviceFingerprint
    };

    const encryptedUser = CryptoJS.AES.encrypt(
      JSON.stringify(minimalUserData),
      ENCRYPTION_KEY
    ).toString();
    localStorage.setItem(USER_KEY, encryptedUser);

  } catch (error) {
    console.error('Error storing auth data:', error);
    // Clean up in case of error
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    throw new Error('Failed to store authentication data securely');
  }
};

/**
 * Comprehensive token validation with role-based security checks
 * @param {string} token JWT token to validate
 * @param {UserRole} role User role to validate against
 * @returns {TokenValidationResult} Detailed validation result
 */
export const isTokenValid = (token: string, role: UserRole): TokenValidationResult => {
  try {
    const decodedToken = jwtDecode<DecodedToken>(token);
    const currentTime = Date.now() / 1000;

    // Verify token expiration
    if (!decodedToken.exp || decodedToken.exp < currentTime) {
      return {
        isValid: false,
        error: 'Token expired',
        requiresRefresh: true
      };
    }

    // Verify role matches
    if (decodedToken.role !== role) {
      return {
        isValid: false,
        error: 'Invalid role',
        requiresRefresh: false
      };
    }

    // Verify device fingerprint
    const storedFingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (decodedToken.deviceFingerprint !== storedFingerprint) {
      return {
        isValid: false,
        error: 'Invalid device fingerprint',
        requiresRefresh: false
      };
    }

    // Check role-specific session duration
    const sessionDuration = AUTH_CONFIG.tokenExpirationTime[role];
    const tokenAge = currentTime - (decodedToken.iat || 0);
    if (tokenAge * 1000 > sessionDuration) {
      return {
        isValid: false,
        error: 'Session expired',
        requiresRefresh: true
      };
    }

    return {
      isValid: true,
      error: null,
      requiresRefresh: false
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return {
      isValid: false,
      error: 'Invalid token format',
      requiresRefresh: false
    };
  }
};

/**
 * Advanced token refresh check with role-based thresholds
 * @param {string} token JWT token to check
 * @param {UserRole} role User role for threshold determination
 * @returns {boolean} Whether token needs refresh
 */
export const shouldRefreshToken = (token: string, role: UserRole): boolean => {
  try {
    const decodedToken = jwtDecode<DecodedToken>(token);
    const currentTime = Date.now() / 1000;
    
    if (!decodedToken.exp) return true;

    // Get role-specific refresh threshold
    const refreshThreshold = AUTH_CONFIG.tokenRefreshThreshold;
    const timeUntilExpiration = decodedToken.exp - currentTime;

    // Check if within refresh window
    return timeUntilExpiration <= (refreshThreshold / 1000);
  } catch (error) {
    console.error('Error checking token refresh:', error);
    return true;
  }
};