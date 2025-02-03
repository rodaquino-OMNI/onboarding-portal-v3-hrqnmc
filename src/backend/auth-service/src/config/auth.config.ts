// @package dotenv ^16.3.1
import dotenv from 'dotenv';
dotenv.config();

/**
 * Security configuration interface defining password policies and encryption settings
 */
interface SecurityConfig {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecial: boolean;
    passwordHistoryLimit: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    encryptionAlgorithm: string;
    hashAlgorithm: string;
    saltRounds: number;
    keyRotationInterval: number;
    securityHeaders: {
        strictTransportSecurity: string;
        contentSecurityPolicy: string;
        xFrameOptions: string;
        xContentTypeOptions: string;
    };
}

/**
 * JWT configuration interface for token management and validation
 */
interface JWTConfig {
    secret: string;
    algorithm: string;
    issuer: string;
    audience: string;
    tokenPrefix: string;
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
    clockTolerance: number;
    jwtid: boolean;
    verifyOptions: {
        ignoreExpiration: boolean;
        ignoreNotBefore: boolean;
    };
}

/**
 * Session configuration interface for role-based session management
 */
interface SessionConfig {
    [key: string]: {
        duration: number;
        requireMFA: boolean;
        inactivityTimeout: number;
        maxConcurrentSessions: number;
    };
}

/**
 * MFA configuration interface for multi-factor authentication settings
 */
interface MFAConfig {
    tokenLength: number;
    tokenExpiry: number;
    maxAttempts: number;
    cooldownPeriod: number;
    methods: {
        sms: {
            enabled: boolean;
            provider: string;
            retryLimit: number;
            rateLimit: {
                window: number;
                maxRequests: number;
            };
            messageTemplate: string;
        };
        totp: {
            enabled: boolean;
            issuer: string;
            algorithm: string;
            digits: number;
            period: number;
            window: number;
            backupCodes: {
                count: number;
                length: number;
            };
        };
    };
    fallback: {
        enabled: boolean;
        methods: string[];
        cooldown: number;
    };
}

/**
 * Retrieves and validates configuration values with environment variable override support
 * @param key Configuration key to retrieve
 * @param defaultValue Default value if no override exists
 * @returns Validated configuration value
 */
function getConfigValue<T>(key: string, defaultValue: T): T {
    const envKey = `AUTH_${key.toUpperCase()}`;
    const envValue = process.env[envKey];

    if (envValue !== undefined) {
        try {
            return JSON.parse(envValue) as T;
        } catch {
            return envValue as unknown as T;
        }
    }

    return defaultValue;
}

/**
 * Security configuration with strict password and encryption policies
 */
export const security: SecurityConfig = {
    passwordMinLength: getConfigValue('security_passwordMinLength', 8),
    passwordRequireUppercase: getConfigValue('security_passwordRequireUppercase', true),
    passwordRequireLowercase: getConfigValue('security_passwordRequireLowercase', true),
    passwordRequireNumbers: getConfigValue('security_passwordRequireNumbers', true),
    passwordRequireSpecial: getConfigValue('security_passwordRequireSpecial', true),
    passwordHistoryLimit: getConfigValue('security_passwordHistoryLimit', 5),
    maxLoginAttempts: getConfigValue('security_maxLoginAttempts', 5),
    lockoutDuration: getConfigValue('security_lockoutDuration', 900),
    encryptionAlgorithm: getConfigValue('security_encryptionAlgorithm', 'AES-256-GCM'),
    hashAlgorithm: getConfigValue('security_hashAlgorithm', 'SHA-256'),
    saltRounds: getConfigValue('security_saltRounds', 12),
    keyRotationInterval: getConfigValue('security_keyRotationInterval', 86400),
    securityHeaders: {
        strictTransportSecurity: getConfigValue('security_headers_hsts', 'max-age=31536000; includeSubDomains'),
        contentSecurityPolicy: getConfigValue('security_headers_csp', "default-src 'self'"),
        xFrameOptions: getConfigValue('security_headers_xframe', 'DENY'),
        xContentTypeOptions: getConfigValue('security_headers_contentType', 'nosniff')
    }
};

/**
 * JWT configuration for secure token management
 */
export const jwt: JWTConfig = {
    secret: process.env.JWT_SECRET || '',
    algorithm: getConfigValue('jwt_algorithm', 'HS256'),
    issuer: getConfigValue('jwt_issuer', 'AUSTA Health Portal'),
    audience: getConfigValue('jwt_audience', 'AUSTA Health Portal Users'),
    tokenPrefix: getConfigValue('jwt_tokenPrefix', 'Bearer'),
    accessTokenExpiry: getConfigValue('jwt_accessTokenExpiry', 3600),
    refreshTokenExpiry: getConfigValue('jwt_refreshTokenExpiry', 86400),
    clockTolerance: getConfigValue('jwt_clockTolerance', 30),
    jwtid: getConfigValue('jwt_jwtid', true),
    verifyOptions: {
        ignoreExpiration: getConfigValue('jwt_verifyOptions_ignoreExpiration', false),
        ignoreNotBefore: getConfigValue('jwt_verifyOptions_ignoreNotBefore', false)
    }
};

/**
 * Role-based session configuration
 */
export const session: SessionConfig = {
    administrator: {
        duration: getConfigValue('session_administrator_duration', 14400),
        requireMFA: getConfigValue('session_administrator_requireMFA', true),
        inactivityTimeout: getConfigValue('session_administrator_inactivityTimeout', 900),
        maxConcurrentSessions: getConfigValue('session_administrator_maxConcurrentSessions', 1)
    },
    underwriter: {
        duration: getConfigValue('session_underwriter_duration', 14400),
        requireMFA: getConfigValue('session_underwriter_requireMFA', true),
        inactivityTimeout: getConfigValue('session_underwriter_inactivityTimeout', 900),
        maxConcurrentSessions: getConfigValue('session_underwriter_maxConcurrentSessions', 2)
    },
    broker: {
        duration: getConfigValue('session_broker_duration', 28800),
        requireMFA: getConfigValue('session_broker_requireMFA', true),
        inactivityTimeout: getConfigValue('session_broker_inactivityTimeout', 1800),
        maxConcurrentSessions: getConfigValue('session_broker_maxConcurrentSessions', 3)
    },
    hrPersonnel: {
        duration: getConfigValue('session_hrPersonnel_duration', 28800),
        requireMFA: getConfigValue('session_hrPersonnel_requireMFA', true),
        inactivityTimeout: getConfigValue('session_hrPersonnel_inactivityTimeout', 1800),
        maxConcurrentSessions: getConfigValue('session_hrPersonnel_maxConcurrentSessions', 3)
    },
    beneficiary: {
        duration: getConfigValue('session_beneficiary_duration', 1800),
        requireMFA: getConfigValue('session_beneficiary_requireMFA', false),
        inactivityTimeout: getConfigValue('session_beneficiary_inactivityTimeout', 900),
        maxConcurrentSessions: getConfigValue('session_beneficiary_maxConcurrentSessions', 1)
    },
    parentGuardian: {
        duration: getConfigValue('session_parentGuardian_duration', 1800),
        requireMFA: getConfigValue('session_parentGuardian_requireMFA', false),
        inactivityTimeout: getConfigValue('session_parentGuardian_inactivityTimeout', 900),
        maxConcurrentSessions: getConfigValue('session_parentGuardian_maxConcurrentSessions', 1)
    }
};

/**
 * Multi-factor authentication configuration
 */
export const mfa: MFAConfig = {
    tokenLength: getConfigValue('mfa_tokenLength', 6),
    tokenExpiry: getConfigValue('mfa_tokenExpiry', 300),
    maxAttempts: getConfigValue('mfa_maxAttempts', 3),
    cooldownPeriod: getConfigValue('mfa_cooldownPeriod', 300),
    methods: {
        sms: {
            enabled: getConfigValue('mfa_sms_enabled', true),
            provider: getConfigValue('mfa_sms_provider', 'twilio'),
            retryLimit: getConfigValue('mfa_sms_retryLimit', 3),
            rateLimit: {
                window: getConfigValue('mfa_sms_rateLimit_window', 3600),
                maxRequests: getConfigValue('mfa_sms_rateLimit_maxRequests', 10)
            },
            messageTemplate: getConfigValue('mfa_sms_messageTemplate', 'Your AUSTA Health Portal verification code is: {code}')
        },
        totp: {
            enabled: getConfigValue('mfa_totp_enabled', true),
            issuer: getConfigValue('mfa_totp_issuer', 'AUSTA Health Portal'),
            algorithm: getConfigValue('mfa_totp_algorithm', 'SHA1'),
            digits: getConfigValue('mfa_totp_digits', 6),
            period: getConfigValue('mfa_totp_period', 30),
            window: getConfigValue('mfa_totp_window', 1),
            backupCodes: {
                count: getConfigValue('mfa_totp_backupCodes_count', 10),
                length: getConfigValue('mfa_totp_backupCodes_length', 10)
            }
        }
    },
    fallback: {
        enabled: getConfigValue('mfa_fallback_enabled', true),
        methods: getConfigValue('mfa_fallback_methods', ['email']),
        cooldown: getConfigValue('mfa_fallback_cooldown', 3600)
    }
};

/**
 * Export combined authentication configuration
 */
export const authConfig = {
    security,
    jwt,
    session,
    mfa
};

export default authConfig;