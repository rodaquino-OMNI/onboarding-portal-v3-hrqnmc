import { describe, it, expect, beforeAll } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import configureCorsMiddleware from '../../middleware/cors';

// Mock kong config before importing modules
jest.mock('../../config/kong.config', () => ({
  plugins: {
    cors: {
      config: {
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        headers: ['Content-Type', 'Authorization'],
        exposed_headers: ['X-Total-Count'],
        credentials: true,
        max_age: 3600,
        preflight_continue: false,
        origins: ['https://*.austa.health', 'https://localhost:*']
      }
    }
  },
  kongConfig: {
    plugins: {
      bot_detection: {
        config: {
          deny: []
        }
      },
      ip_restriction: {
        config: {
          allow: [],
          deny: []
        }
      }
    }
  }
}));

describe('Middleware Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(configureCorsMiddleware());

    app.get('/api/test', (req, res) => {
      res.json({ message: 'success' });
    });

    app.options('/api/test', (req, res) => {
      res.sendStatus(204);
    });
  });

  describe('CORS Middleware Integration', () => {
    it('should apply security headers to responses', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['x-lgpd-compliance']).toBe('enforced');
    });

    it('should set LGPD compliance headers', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['x-data-protection']).toBe('LGPD');
      expect(response.headers['x-privacy-policy']).toBe('https://austa.health/privacy');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await request(app).options('/api/test');

      expect([200, 204]).toContain(response.status);
    });

    it('should set HSTS header', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    it('should set Content Security Policy', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('CORS Origin Validation', () => {
    it('should handle requests without origin header', async () => {
      const response = await request(app)
        .get('/api/test');

      expect(response.status).toBe(200);
    });

    it('should handle requests with valid origin', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://app.austa.health');

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('User-Agent', 'Test Agent');

      expect(response.status).toBe(200);
    });

    it('should not crash on invalid headers', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Custom-Header', '');

      expect(response.status).toBe(200);
    });
  });
});
