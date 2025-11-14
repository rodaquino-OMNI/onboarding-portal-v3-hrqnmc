import express, { Express, Request, Response, NextFunction } from 'express'; // @version ^4.18.2
// TODO: Replace with actual Kong SDK when available
// The @kong/kong-nodejs-sdk package does not exist in npm registry
// import { Kong } from '@kong/kong-nodejs-sdk'; // @version ^1.0.0
import morgan from 'morgan'; // @version ^1.10.0
import winston from 'winston'; // @version ^3.8.2
import { v4 as uuidv4 } from 'uuid'; // @version ^9.0.0
import configureCorsMiddleware from './middleware/cors';
import rateLimiter from './middleware/rate-limiter';
import securityMiddleware from './middleware/security';

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const CORRELATION_ID_HEADER = 'x-correlation-id';

// Configure Winston logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
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

// Initialize Express app
const app: Express = express();

// Initialize Kong client
// TODO: Implement Kong Gateway integration when SDK is available
// The @kong/kong-nodejs-sdk package does not exist in npm registry
// Options: 1) Use direct HTTP calls to Kong Admin API
//          2) Use alternative Kong client library (e.g., kong-admin-api)
//          3) Wait for official SDK release
const initializeKong = async (): Promise<void> => {
  try {
    logger.warn('Kong Gateway integration is currently disabled - SDK not available');
    // Commented out until proper SDK is available:
    /*
    const kong = new Kong({
      adminUrl: process.env.KONG_ADMIN_URL,
      apiKey: process.env.KONG_ADMIN_KEY
    });

    // Configure Kong services
    await Promise.all(Object.values(kongConfig.services).map(async (service) => {
      await kong.services.create(service);
    }));

    // Configure Kong plugins
    await Promise.all(Object.entries(kongConfig.plugins).map(async ([name, config]) => {
      await kong.plugins.create({ name, config });
    }));

    logger.info('Kong Gateway initialized successfully');
    */
  } catch (error) {
    logger.error('Failed to initialize Kong Gateway', { error });
    throw error;
  }
};

// Configure middleware
const setupMiddleware = (app: Express): void => {
  // Add correlation ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.headers[CORRELATION_ID_HEADER] = req.headers[CORRELATION_ID_HEADER] || uuidv4();
    res.setHeader(CORRELATION_ID_HEADER, req.headers[CORRELATION_ID_HEADER]);
    next();
  });

  // Configure Morgan logging with correlation ID
  morgan.token('correlation-id', (req: Request) => req.headers[CORRELATION_ID_HEADER] as string);
  app.use(morgan(':method :url :status :correlation-id :response-time ms'));

  // Security middleware
  app.use(securityMiddleware.configureSecurityMiddleware());

  // CORS middleware
  app.use(configureCorsMiddleware());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting middleware
  app.use(rateLimiter.createRateLimiter());

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      correlationId: req.headers[CORRELATION_ID_HEADER]
    });

    res.status(500).json({
      error: 'Internal Server Error',
      correlationId: req.headers[CORRELATION_ID_HEADER]
    });
  });
};

// Configure routes
const setupRoutes = (app: Express): void => {
  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', (_req: Request, res: Response) => {
    res.set('Content-Type', 'text/plain');
    // Implement metrics collection logic
    res.send('# API Gateway metrics...');
  });

  // Fallback route
  app.use((req: Request, res: Response) => {
    logger.warn('Route not found', {
      path: req.path,
      method: req.method,
      correlationId: req.headers[CORRELATION_ID_HEADER]
    });
    res.status(404).json({ error: 'Not Found' });
  });
};

// Start server
const startServer = async (app: Express): Promise<void> => {
  try {
    await initializeKong();
    setupMiddleware(app);
    setupRoutes(app);

    const server = app.listen(PORT, () => {
      logger.info(`API Gateway listening on port ${PORT}`, {
        environment: NODE_ENV,
        port: PORT
      });
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down API Gateway...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force close after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Export app for testing
export const getApp = (): Express => app;

// Start server if not in test environment
if (NODE_ENV !== 'test') {
  startServer(app).catch((error) => {
    logger.error('Server startup failed', { error });
    process.exit(1);
  });
}