import { describe, beforeAll, afterAll, beforeEach, afterEach, test, expect } from '@jest/globals'; // @version ^29.5.0
import supertest from 'supertest'; // @version ^6.3.3
import nock from 'nock'; // @version ^13.3.1
import Redis from 'ioredis-mock'; // @version ^8.2.2
import { metrics } from '@opentelemetry/api'; // @version ^1.4.0
import { app } from '../../src/index';
import { securityMiddleware } from '../../src/middleware/security';
import { rateLimiter } from '../../src/middleware/rate-limiter';

// Test constants
const TEST_JWT_ADMIN = process.env.TEST_JWT_ADMIN;
const TEST_JWT_BROKER = process.env.TEST_JWT_BROKER;
const TEST_JWT_BENEFICIARY = process.env.TEST_JWT_BENEFICIARY;

const RATE_LIMIT_THRESHOLDS = {
  ADMIN: 5000,
  BROKER: 1000,
  BENEFICIARY: 100
};

const SERVICE_ENDPOINTS = {
  AUTH: '/api/v1/auth',
  HEALTH: '/api/v1/health',
  ENROLLMENT: '/api/v1/enrollments',
  POLICY: '/api/v1/policies',
  DOCUMENT: '/api/v1/documents'
};

@describe('API Gateway Integration Tests')
class GatewayIntegrationTest {
  private request: supertest.SuperTest<supertest.Test>;
  private redisMock: Redis;
  private serviceMocks: Map<string, nock.Scope>;
  private metricsCollector: metrics.Meter;

  constructor() {
    this.request = supertest(app);
    this.redisMock = new Redis();
    this.serviceMocks = new Map();
    this.metricsCollector = metrics.getMeterProvider().getMeter('api-gateway-tests');
  }

  @beforeAll
  async setupTestEnvironment(): Promise<void> {
    // Configure Redis mock
    rateLimiter.createRateLimiter = jest.fn().mockImplementation(() => {
      return async (req: any, res: any, next: any) => next();
    });

    // Initialize service mocks
    Object.entries(SERVICE_ENDPOINTS).forEach(([service, endpoint]) => {
      this.serviceMocks.set(service, nock(`http://localhost:3000`).persist());
    });

    // Configure monitoring
    this.metricsCollector.createCounter('api_requests_total');
    this.metricsCollector.createHistogram('api_request_duration_seconds');
  }

  @afterAll
  async cleanupTestEnvironment(): Promise<void> {
    await this.redisMock.quit();
    nock.cleanAll();
    this.serviceMocks.clear();
    metrics.disable();
  }

  @beforeEach
  async setupTest(): Promise<void> {
    await this.redisMock.flushall();
    nock.cleanAll();
  }

  @afterEach
  async cleanupTest(): Promise<void> {
    await this.redisMock.flushall();
  }

  @test
  async testSecurityMiddleware(): Promise<void> {
    // Test CORS headers
    const corsResponse = await this.request
      .options(SERVICE_ENDPOINTS.AUTH)
      .set('Origin', 'http://localhost:3000');

    expect(corsResponse.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(corsResponse.headers['access-control-allow-methods']).toContain('GET');
    expect(corsResponse.headers['strict-transport-security']).toBeDefined();

    // Test JWT validation
    const noAuthResponse = await this.request
      .get(SERVICE_ENDPOINTS.AUTH);
    expect(noAuthResponse.status).toBe(401);

    const invalidJwtResponse = await this.request
      .get(SERVICE_ENDPOINTS.AUTH)
      .set('Authorization', 'Bearer invalid');
    expect(invalidJwtResponse.status).toBe(401);

    // Test role-based access
    const adminResponse = await this.request
      .get(SERVICE_ENDPOINTS.AUTH)
      .set('Authorization', `Bearer ${TEST_JWT_ADMIN}`)
      .set('x-totp-token', '123456');
    expect(adminResponse.status).toBe(200);

    // Test bot detection
    const botResponse = await this.request
      .get(SERVICE_ENDPOINTS.AUTH)
      .set('User-Agent', 'BadBot/1.0');
    expect(botResponse.status).toBe(403);

    // Test IP filtering
    const blockedIpResponse = await this.request
      .get(SERVICE_ENDPOINTS.AUTH)
      .set('X-Forwarded-For', '1.2.3.4');
    expect(blockedIpResponse.status).toBe(403);
  }

  @test
  async testRateLimiting(): Promise<void> {
    // Test rate limit headers
    const response = await this.request
      .get(SERVICE_ENDPOINTS.AUTH)
      .set('Authorization', `Bearer ${TEST_JWT_BROKER}`);

    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();

    // Test role-based limits
    const requests = Array(RATE_LIMIT_THRESHOLDS.BROKER + 1).fill(null);
    for (const _ of requests) {
      await this.request
        .get(SERVICE_ENDPOINTS.AUTH)
        .set('Authorization', `Bearer ${TEST_JWT_BROKER}`);
    }

    const limitExceededResponse = await this.request
      .get(SERVICE_ENDPOINTS.AUTH)
      .set('Authorization', `Bearer ${TEST_JWT_BROKER}`);
    expect(limitExceededResponse.status).toBe(429);

    // Test Redis cluster failover
    await this.redisMock.quit();
    const failoverResponse = await this.request
      .get(SERVICE_ENDPOINTS.AUTH)
      .set('Authorization', `Bearer ${TEST_JWT_BROKER}`);
    expect(failoverResponse.status).toBe(200);
  }

  @test
  async testServiceRouting(): Promise<void> {
    // Mock service responses
    this.serviceMocks.get('AUTH')!
      .get('/api/v1/auth')
      .reply(200, { status: 'ok' });

    this.serviceMocks.get('HEALTH')!
      .get('/api/v1/health')
      .reply(200, { status: 'healthy' });

    // Test successful routing
    const authResponse = await this.request
      .get(SERVICE_ENDPOINTS.AUTH)
      .set('Authorization', `Bearer ${TEST_JWT_ADMIN}`)
      .set('x-totp-token', '123456');
    expect(authResponse.status).toBe(200);

    // Test circuit breaker
    this.serviceMocks.get('HEALTH')!
      .get('/api/v1/health')
      .times(5)
      .reply(500);

    const circuitBreakerResponses = await Promise.all(
      Array(6).fill(null).map(() => 
        this.request
          .get(SERVICE_ENDPOINTS.HEALTH)
          .set('Authorization', `Bearer ${TEST_JWT_ADMIN}`)
          .set('x-totp-token', '123456')
      )
    );

    expect(circuitBreakerResponses[5].status).toBe(503);
  }

  @test
  async testMonitoring(): Promise<void> {
    // Test metrics endpoint
    const metricsResponse = await this.request
      .get('/metrics')
      .set('Authorization', `Bearer ${TEST_JWT_ADMIN}`)
      .set('x-totp-token', '123456');

    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.type).toBe('text/plain');

    // Verify metrics collection
    const counter = this.metricsCollector.createCounter('test_requests');
    counter.add(1);

    const histogram = this.metricsCollector.createHistogram('test_latency');
    histogram.record(100);

    const metricsData = await this.request
      .get('/metrics')
      .set('Authorization', `Bearer ${TEST_JWT_ADMIN}`)
      .set('x-totp-token', '123456');

    expect(metricsData.text).toContain('test_requests_total');
    expect(metricsData.text).toContain('test_latency_bucket');
  }
}

export default GatewayIntegrationTest;