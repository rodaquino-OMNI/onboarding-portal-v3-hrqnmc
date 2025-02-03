import cors from 'cors'; // @version ^2.8.5
import { Request, Response, NextFunction } from 'express'; // @version ^4.18.2
import { Logger } from 'winston'; // @version ^3.8.2
import { plugins, security } from '../config/kong.config';

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_CACHE_DURATION = process.env.CORS_CACHE_DURATION || 3600;

// Origin cache for performance optimization
const originCache = new Map<string, { isValid: boolean; timestamp: number }>();

// Security headers based on environment
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'X-LGPD-Compliance': 'enforced',
  'X-Content-Security': 'restricted'
};

// CORS configuration with enhanced security
const CORS_OPTIONS: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    validateOrigin(origin, callback);
  },
  methods: plugins.cors.config.methods,
  allowedHeaders: [
    ...plugins.cors.config.headers,
    'X-LGPD-Consent',
    'X-API-Version'
  ],
  exposedHeaders: [
    ...plugins.cors.config.exposed_headers,
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  credentials: plugins.cors.config.credentials,
  maxAge: plugins.cors.config.max_age,
  preflightContinue: plugins.cors.config.preflight_continue,
  optionsSuccessStatus: 204
};

/**
 * Validates request origin against allowed patterns with caching
 * @param origin - Request origin
 * @param callback - CORS validation callback
 */
const validateOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void
): void => {
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) {
    return callback(null, true);
  }

  // Check cache first
  const cached = originCache.get(origin);
  if (cached && Date.now() - cached.timestamp < CORS_CACHE_DURATION * 1000) {
    return callback(null, cached.isValid);
  }

  // Enforce HTTPS in production
  if (NODE_ENV === 'production' && !origin.startsWith('https://')) {
    handleCorsError(new Error('HTTPS Required'), origin);
    return callback(new Error('HTTPS Required'));
  }

  // Validate against allowed patterns
  const isAllowed = plugins.cors.config.origins.some(pattern => {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(origin);
  });

  // Cache the result
  originCache.set(origin, {
    isValid: isAllowed,
    timestamp: Date.now()
  });

  if (!isAllowed) {
    handleCorsError(new Error('Origin Not Allowed'), origin);
    return callback(new Error('Origin Not Allowed'));
  }

  callback(null, true);
};

/**
 * Handles CORS-related errors with logging and monitoring
 * @param error - Error object
 * @param origin - Request origin
 */
const handleCorsError = (error: Error, origin: string): void => {
  console.error('CORS Error:', {
    error: error.message,
    origin,
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });

  // Clean up origin cache periodically
  if (originCache.size > 1000) {
    const now = Date.now();
    originCache.forEach((value, key) => {
      if (now - value.timestamp > CORS_CACHE_DURATION * 1000) {
        originCache.delete(key);
      }
    });
  }
};

/**
 * Configures and returns CORS middleware with security enhancements
 */
const configureCorsMiddleware = () => {
  const corsMiddleware = cors(CORS_OPTIONS);

  return (req: Request, res: Response, next: NextFunction) => {
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    // Add LGPD-specific headers
    res.setHeader('X-Data-Protection', 'LGPD');
    res.setHeader('X-Privacy-Policy', 'https://austa.health/privacy');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', CORS_OPTIONS.maxAge?.toString() || '3600');
    }

    // Apply CORS middleware
    return corsMiddleware(req, res, (err) => {
      if (err) {
        handleCorsError(err, req.headers.origin || 'unknown');
        return res.status(403).json({
          error: 'CORS Policy Violation',
          message: 'Access Denied by CORS Policy'
        });
      }
      next();
    });
  };
};

export default configureCorsMiddleware;