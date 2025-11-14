import rateLimit from 'express-rate-limit'; // @version ^6.7.0
import Redis from 'ioredis'; // @version ^5.3.0
import RedisStore from 'rate-limit-redis'; // @version ^3.0.0
import CircuitBreaker from 'opossum'; // @version ^7.1.0
import winston from 'winston'; // @version ^3.8.0

// Environment variables
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NODE_ENV = process.env.NODE_ENV || 'development';
const REDIS_CLUSTER_URLS = process.env.REDIS_CLUSTER_URLS?.split(',') || [];

// Constants for rate limiting configuration
const DEFAULT_RATE_LIMIT = {
  windowMs: 3600000, // 1 hour
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later'
};

const ROLE_LIMITS = {
  admin: { windowMs: 3600000, max: 5000 },
  broker: { windowMs: 3600000, max: 2000 },
  underwriter: { windowMs: 3600000, max: 3000 },
  beneficiary: { windowMs: 3600000, max: 1000 }
};

const ENDPOINT_LIMITS = {
  '/api/v1/health-assessment': { windowMs: 3600000, max: 100 },
  '/api/v1/documents': { windowMs: 3600000, max: 50 },
  '/api/v1/auth': { windowMs: 300000, max: 5 }
};

const REDIS_OPTIONS = {
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  maxRetries: 3,
  connectTimeout: 10000,
  enableReadyCheck: true,
  enableOfflineQueue: true
};

const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

const MONITORING_THRESHOLDS = {
  warningThreshold: 800,
  criticalThreshold: 950,
  alertInterval: 300000
};

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'rate-limiter' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Initialize Redis client with cluster support
const createRedisClient = async (): Promise<Redis> => {
  if (REDIS_CLUSTER_URLS.length > 0) {
    return new Redis.Cluster(REDIS_CLUSTER_URLS, {
      ...REDIS_OPTIONS,
      redisOptions: REDIS_OPTIONS
    }) as any;
  }
  return new Redis(REDIS_URL, REDIS_OPTIONS);
};

// Circuit breaker for Redis operations
const redisBreaker = new CircuitBreaker(createRedisClient, CIRCUIT_BREAKER_OPTIONS);

redisBreaker.fallback(() => {
  logger.warn('Redis circuit breaker activated, falling back to memory store');
  return null;
});

// Role-based rate limit configuration
export const getRoleLimits = (role: string): typeof DEFAULT_RATE_LIMIT => {
  const roleLimits = ROLE_LIMITS[role as keyof typeof ROLE_LIMITS];
  if (roleLimits) {
    return { ...DEFAULT_RATE_LIMIT, ...roleLimits };
  }
  return DEFAULT_RATE_LIMIT;
};

// Monitoring function for rate limit metrics
export const monitorRateLimits = async (endpoint: string, hits: number): Promise<void> => {
  const { warningThreshold, criticalThreshold } = MONITORING_THRESHOLDS;
  
  try {
    if (hits >= criticalThreshold) {
      logger.error('Critical rate limit threshold exceeded', {
        endpoint,
        hits,
        threshold: criticalThreshold
      });
    } else if (hits >= warningThreshold) {
      logger.warn('Warning rate limit threshold reached', {
        endpoint,
        hits,
        threshold: warningThreshold
      });
    }

    // Update metrics in Redis
    const redis = await redisBreaker.fire() as Redis | null;
    if (redis) {
      await redis.hincrby('rate_limit_metrics', endpoint, 1);
    }
  } catch (error) {
    logger.error('Error monitoring rate limits', { error, endpoint, hits });
  }
};

// Create rate limiter middleware
export const createRateLimiter = (options: Partial<typeof DEFAULT_RATE_LIMIT> = {}) => {
  const config = { ...DEFAULT_RATE_LIMIT, ...options };

  return async (req: any, res: any, next: any) => {
    try {
      const redis = await redisBreaker.fire() as Redis | null;
      const store = redis ? new RedisStore({
        sendCommand: (...args: any[]) => (redis as any).call(...args),
      }) : undefined;

      const endpoint = req.path;
      const endpointLimit = ENDPOINT_LIMITS[endpoint as keyof typeof ENDPOINT_LIMITS];
      const userRole = req.user?.role || 'beneficiary';
      const roleLimits = getRoleLimits(userRole);

      const finalConfig = {
        ...config,
        ...(endpointLimit || {}),
        ...roleLimits,
        store,
        keyGenerator: (req: any) => {
          return `${req.ip}-${userRole}-${endpoint}`;
        },
        handler: (req: any, res: any) => {
          logger.warn('Rate limit exceeded', {
            ip: req.ip,
            endpoint,
            role: userRole
          });
          res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil(config.windowMs / 1000)
          });
        },
        skip: (req: any) => {
          return req.ip === '127.0.0.1' && NODE_ENV === 'development';
        },
        onLimitReached: (_req: any) => {
          monitorRateLimits(endpoint, config.max);
        }
      };

      const limiter = rateLimit(finalConfig);
      return limiter(req, res, next);
    } catch (error) {
      logger.error('Rate limiter error', { error });
      // Fail open in case of rate limiter error
      next();
    }
  };
};

export default {
  createRateLimiter,
  getRoleLimits,
  monitorRateLimits
};