import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('Security hardening (metrics, RAG retrieve, guest quota)', () => {
  const app = createApp();
  const metricsSecret = 'metrics-test-secret-thirty-two-chars-min';
  const adminApiKey = 'rag-admin-api-key-for-tests-only';

  beforeEach(() => {
    process.env.RAG_ADMIN_API_KEY = adminApiKey;
  });

  afterEach(() => {
    delete process.env.METRICS_SECRET;
    delete process.env.NODE_ENV;
    delete process.env.RAG_ADMIN_API_KEY;
  });

  describe('GET /metrics', () => {
    it('allows unauthenticated access in non-production when METRICS_SECRET is unset', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.METRICS_SECRET;

      const res = await request(app).get('/metrics');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(500);
    });

    it('requires bearer token when METRICS_SECRET is set', async () => {
      process.env.NODE_ENV = 'development';
      process.env.METRICS_SECRET = metricsSecret;

      const denied = await request(app).get('/metrics');
      expect(denied.status).toBe(401);

      const allowed = await request(app)
        .get('/metrics')
        .set('Authorization', `Bearer ${metricsSecret}`);
      expect(allowed.status).toBeGreaterThanOrEqual(200);
      expect(allowed.status).toBeLessThan(500);
    });

    it('blocks access in production when METRICS_SECRET is unset', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.METRICS_SECRET;

      const res = await request(app).get('/metrics');
      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/rag/retrieve', () => {
    it('returns 403 without admin credentials', async () => {
      const res = await request(app)
        .post('/api/rag/retrieve')
        .send({ query: 'privacy policy' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ADMIN_ACCESS_REQUIRED');
    });

    it('accepts admin API key', async () => {
      const res = await request(app)
        .post('/api/rag/retrieve')
        .set('X-Admin-API-Key', adminApiKey)
        .send({ query: 'privacy policy' });

      expect(res.status).not.toBe(403);
    });
  });
});
