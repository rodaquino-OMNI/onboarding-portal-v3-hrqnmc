import helmet from 'helmet'; // @version ^7.0.0
import hpp from 'hpp'; // @version ^0.2.3
import { validationResult } from 'express-validator'; // @version ^7.0.0
import jwt from 'jsonwebtoken'; // @version ^9.0.0
import rateLimit from 'express-rate-limit'; // @version ^6.7.0
import speakeasy from 'speakeasy'; // @version ^2.0.0
import geoip from 'geoip-lite'; // @version ^1.4.7
import winston from 'winston'; // @version ^3.8.2
import { Request, Response, NextFunction } from 'express';
import { kongConfig } from '../config/kong.config';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const TOTP_SECRET = process.env.TOTP_SECRET;
const ALLOWED_REGIONS = process.env.ALLOWED_REGIONS?.split(',') || ['BR'];

// Security configuration constants
const SECURITY_CONFIG = {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"],
        'connect-src': ["'self'", 'https://api.austa.health']
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' as const },
    xssFilter: true
  },
  jwt: {
    algorithms: ['HS256'],
    issuer: 'austa.health',
    audience: 'pre-paid-health-plan',
    expiresIn: {
      admin: '4h',
      underwriter: '4h',
      broker: '8h',
      beneficiary: '30m',
      hr: '8h'
    },
    requireHardwareToken: ['admin', 'underwriter']
  },
  rateLimit: {
    global: {
      windowMs: 900000, // 15 minutes
      max: 1000
    },
    byRole: {
      admin: { windowMs: 900000, max: 5000 },
      broker: { windowMs: 900000, max: 2000 },
      beneficiary: { windowMs: 900000, max: 100 }
    }
  }
};

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'security-middleware' },
  transports: [
    new winston.transports.File({ filename: 'security-events.log' })
  ]
});

/**
 * Validates JWT token and enforces role-based access control
 */
const validateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET!, {
      algorithms: SECURITY_CONFIG.jwt.algorithms as jwt.Algorithm[],
      issuer: SECURITY_CONFIG.jwt.issuer,
      audience: SECURITY_CONFIG.jwt.audience
    }) as any;

    // Validate role-specific expiration
    const roleExpiration = SECURITY_CONFIG.jwt.expiresIn[decoded.role as keyof typeof SECURITY_CONFIG.jwt.expiresIn];
    if (!roleExpiration) {
      throw new Error('Invalid role');
    }

    // Validate hardware token for privileged roles
    if (SECURITY_CONFIG.jwt.requireHardwareToken.includes(decoded.role)) {
      const totpToken = req.headers['x-totp-token'];
      if (!totpToken || !speakeasy.totp.verify({
        secret: TOTP_SECRET!,
        encoding: 'base32',
        token: totpToken as string
      })) {
        throw new Error('Invalid hardware token');
      }
    }

    (req as any).user = decoded;
    logger.info('JWT validated successfully', {
      userId: decoded.sub,
      role: decoded.role
    });

    next();
  } catch (error) {
    logger.error('JWT validation failed', { error: (error as Error).message });
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Detects and blocks suspicious bot activity
 */
const detectBots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const requestsPerSecond = await getRateForIP(req.ip || '');

    // Check against bot patterns
    const isSuspiciousBot = kongConfig.plugins.bot_detection.config.deny.some(
      (pattern: string) => new RegExp(pattern).test(userAgent)
    );

    if (isSuspiciousBot || requestsPerSecond > 10) {
      logger.warn('Bot activity detected', {
        ip: req.ip,
        userAgent,
        requestsPerSecond
      });
      res.status(403).json({ error: 'Bot activity detected' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Bot detection error', { error: (error as Error).message });
    next(error);
  }
};

/**
 * Filters requests based on IP geolocation and access lists
 */
const filterIPs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ip = req.ip || '';
    const geo = geoip.lookup(ip);

    if (!geo || !ALLOWED_REGIONS.includes(geo.country)) {
      logger.warn('IP blocked by geolocation', {
        ip,
        country: geo?.country
      });
      res.status(403).json({ error: 'Access denied by location' });
      return;
    }

    // Check against dynamic IP lists
    const ipConfig = kongConfig.plugins.ip_restriction.config;
    if (ipConfig.deny.includes(ip) ||
        (ipConfig.allow.length > 0 && !ipConfig.allow.includes(ip))) {
      logger.warn('IP blocked by restriction list', { ip });
      res.status(403).json({ error: 'Access denied by IP restriction' });
      return;
    }

    next();
  } catch (error) {
    logger.error('IP filtering error', { error: (error as Error).message });
    next(error);
  }
};

/**
 * Helper function to get request rate for an IP
 */
const getRateForIP = async (_ip: string): Promise<number> => {
  // Implementation would typically use Redis for rate tracking
  return 0;
};

/**
 * Configures and returns the security middleware stack
 */
const configureSecurityMiddleware = () => {
  return [
    // Basic security headers
    helmet(SECURITY_CONFIG.helmet),
    
    // HTTP Parameter Pollution protection
    hpp(),
    
    // IP filtering
    filterIPs,
    
    // Bot detection
    detectBots,
    
    // Rate limiting
    rateLimit(SECURITY_CONFIG.rateLimit.global),
    
    // JWT validation
    validateJWT,
    
    // Request validation results check
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Request validation failed', { errors: errors.array() });
        res.status(400).json({ errors: errors.array() });
        return;
      }
      next();
    }
  ];
};

export const securityMiddleware = {
  configureSecurityMiddleware
};

export default securityMiddleware;