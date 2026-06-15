/**
 * Admin Retention Endpoints Integration Tests
 *
 * Tests for /api/admin/retention/* endpoints with authentication.
 * Verifies end-to-end functionality including:
 * - Authentication middleware
 * - Input validation
 * - Database operations
 * - Response formats
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

// Mock rate limiting for tests (don't actually rate limit in tests)
vi.mock('../lib/ratelimit', async () => {
  const actual = await vi.importActual('../lib/ratelimit');
  return {
    ...actual,
    adminRateLimitMiddleware: (_req: any, _res: any, next: any) => next(),
    subscriptionRateLimitMiddleware: (_req: any, _res: any, next: any) => next(),
  };
});

describe('Admin Retention Endpoints', () => {
  const app = createApp();
  const adminSecret = 'test-secret-that-is-long-enough-for-security-requirements-12345';
  const tooShortSecret = 'too-short';
  const testWallet = '0x1234567890123456789012345678901234567890';
  const testWallet2 = '0x2234567890123456789012345678901234567890';

  beforeEach(async () => {
    process.env.ADMIN_SECRET = adminSecret;

    // Clean up test data
    await prisma.encryptedChat.deleteMany({
      where: {
        walletAddress: {
          in: [testWallet.toLowerCase(), testWallet2.toLowerCase()],
        },
      },
    }).catch(() => {});
  });

  afterEach(async () => {
    await prisma.encryptedChat.deleteMany({
      where: {
        walletAddress: {
          in: [testWallet.toLowerCase(), testWallet2.toLowerCase()],
        },
      },
    }).catch(() => {});

    delete process.env.ADMIN_SECRET;
  });

  describe('Authentication', () => {
    describe('POST /api/admin/retention/set', () => {
      it('returns 500 when ADMIN_SECRET not configured', async () => {
        delete process.env.ADMIN_SECRET;

        const res = await request(app)
          .post('/api/admin/retention/set')
          .set('X-Admin-Secret', adminSecret)
          .send({ walletAddress: testWallet, retentionDays: 30 });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('ADMIN_NOT_CONFIGURED');
      });

      it('returns 500 when ADMIN_SECRET is too short', async () => {
        process.env.ADMIN_SECRET = tooShortSecret;

        const res = await request(app)
          .post('/api/admin/retention/set')
          .set('X-Admin-Secret', adminSecret)
          .send({ walletAddress: testWallet, retentionDays: 30 });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('ADMIN_SECRET_TOO_SHORT');
      });

      it('returns 401 without authentication', async () => {
        const res = await request(app)
          .post('/api/admin/retention/set')
          .send({ walletAddress: testWallet, retentionDays: 30 });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('ADMIN_SECRET_MISSING');
      });

      it('returns 403 with invalid secret', async () => {
        const res = await request(app)
          .post('/api/admin/retention/set')
          .set('X-Admin-Secret', 'wrong-secret-value-here')
          .send({ walletAddress: testWallet, retentionDays: 30 });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('ADMIN_SECRET_INVALID');
      });
    });

    describe('POST /api/admin/retention/cleanup', () => {
      it('returns 401 without authentication', async () => {
        const res = await request(app)
          .post('/api/admin/retention/cleanup')
          .send({ dryRun: true });

        expect(res.status).toBe(401);
      });

      it('returns 403 with invalid secret', async () => {
        const res = await request(app)
          .post('/api/admin/retention/cleanup')
          .set('X-Admin-Secret', 'invalid')
          .send({ dryRun: true });

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/admin/retention/stats', () => {
      it('returns 401 without authentication', async () => {
        const res = await request(app)
          .get('/api/admin/retention/stats');

        expect(res.status).toBe(401);
      });

      it('returns 403 with invalid secret', async () => {
        const res = await request(app)
          .get('/api/admin/retention/stats')
          .set('X-Admin-Secret', 'invalid');

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/admin/retention/expired', () => {
      it('returns 401 without authentication', async () => {
        const res = await request(app)
          .get('/api/admin/retention/expired');

        expect(res.status).toBe(401);
      });

      it('returns 403 with invalid secret', async () => {
        const res = await request(app)
          .get('/api/admin/retention/expired')
          .set('X-Admin-Secret', 'invalid');

        expect(res.status).toBe(403);
      });
    });
  });

  describe('POST /api/admin/retention/set', () => {
    const validHeaders = {
      'Content-Type': 'application/json',
      'X-Admin-Secret': adminSecret,
    };

    it('validates required fields', async () => {
      const res = await request(app)
        .post('/api/admin/retention/set')
        .set(validHeaders)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('validates wallet address format', async () => {
      const res = await request(app)
        .post('/api/admin/retention/set')
        .set(validHeaders)
        .send({ walletAddress: 'invalid-address', retentionDays: 30 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('validates retentionDays range (max 3650)', async () => {
      const res = await request(app)
        .post('/api/admin/retention/set')
        .set(validHeaders)
        .send({ walletAddress: testWallet, retentionDays: 5000 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('validates retentionDays minimum (1)', async () => {
      const res = await request(app)
        .post('/api/admin/retention/set')
        .set(validHeaders)
        .send({ walletAddress: testWallet, retentionDays: 0 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('allows null retentionDays (indefinite)', async () => {
      const res = await request(app)
        .post('/api/admin/retention/set')
        .set(validHeaders)
        .send({ walletAddress: testWallet, retentionDays: null });

      // Should not fail validation (may fail with chat not found)
      expect([200, 400]).toContain(res.status);
    });

    it('returns 400 for non-existent chat', async () => {
      const res = await request(app)
        .post('/api/admin/retention/set')
        .set(validHeaders)
        .send({ walletAddress: testWallet, retentionDays: 30 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('sets retention policy successfully', async () => {
      // Create test chat first
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWallet.toLowerCase(),
          encryptedBlob: '0xtest-encrypted-blob',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
        },
      });

      const res = await request(app)
        .post('/api/admin/retention/set')
        .set(validHeaders)
        .send({ walletAddress: testWallet, retentionDays: 30 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.walletAddress).toBe(testWallet.toLowerCase());
      expect(res.body.data.retentionDays).toBe(30);
      expect(res.body.data.expiresAt).toBeDefined();

      // Verify database was updated
      const chat = await prisma.encryptedChat.findUnique({
        where: { walletAddress: testWallet.toLowerCase() },
      });
      expect(chat?.retentionDays).toBe(30);
      expect(chat?.expiresAt).toBeDefined();
    });

    it('removes retention policy when null', async () => {
      // Create test chat with retention
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWallet.toLowerCase(),
          encryptedBlob: '0xtest',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
          retentionDays: 30,
          expiresAt: new Date('2026-12-31'),
        },
      });

      const res = await request(app)
        .post('/api/admin/retention/set')
        .set(validHeaders)
        .send({ walletAddress: testWallet, retentionDays: null });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.retentionDays).toBeNull();
      expect(res.body.data.expiresAt).toBeNull();

      // Verify database was updated
      const chat = await prisma.encryptedChat.findUnique({
        where: { walletAddress: testWallet.toLowerCase() },
      });
      expect(chat?.retentionDays).toBe(null);
      expect(chat?.expiresAt).toBe(null);
    });
  });

  describe('POST /api/admin/retention/cleanup', () => {
    const validHeaders = {
      'Content-Type': 'application/json',
      'X-Admin-Secret': adminSecret,
    };

    it('validates batchSize range (max 1000)', async () => {
      const res = await request(app)
        .post('/api/admin/retention/cleanup')
        .set(validHeaders)
        .send({ batchSize: 5000, dryRun: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('validates batchSize minimum (1)', async () => {
      const res = await request(app)
        .post('/api/admin/retention/cleanup')
        .set(validHeaders)
        .send({ batchSize: 0, dryRun: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('runs cleanup in dry run mode with no expired chats', async () => {
      const res = await request(app)
        .post('/api/admin/retention/cleanup')
        .set(validHeaders)
        .send({ dryRun: true, batchSize: 100 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dryRun).toBe(true);
      expect(res.body.data.deletedCount).toBe(0);
    });

    it('identifies expired chats in dry run mode', async () => {
      // Create expired test chat
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWallet.toLowerCase(),
          encryptedBlob: '0xtest',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
          retentionDays: 30,
          expiresAt: new Date('2020-01-01'), // Long expired
        },
      });

      const res = await request(app)
        .post('/api/admin/retention/cleanup')
        .set(validHeaders)
        .send({ dryRun: true, batchSize: 100 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dryRun).toBe(true);
      expect(res.body.data.deletedCount).toBe(1);

      // Verify chat still exists (dry run doesn't delete)
      const chat = await prisma.encryptedChat.findUnique({
        where: { walletAddress: testWallet.toLowerCase() },
      });
      expect(chat).toBeDefined();
    });

    it('deletes expired chats in live mode', async () => {
      // Create expired test chat
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWallet.toLowerCase(),
          encryptedBlob: '0xtest',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
          expiresAt: new Date('2020-01-01'),
        },
      });

      const res = await request(app)
        .post('/api/admin/retention/cleanup')
        .set(validHeaders)
        .send({ dryRun: false, batchSize: 100 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedCount).toBe(1);

      // Verify chat was deleted
      const chat = await prisma.encryptedChat.findUnique({
        where: { walletAddress: testWallet.toLowerCase() },
      });
      expect(chat).toBeNull();
    });

    it('does not delete non-expired chats', async () => {
      // Create non-expired chat
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWallet.toLowerCase(),
          encryptedBlob: '0xtest',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
          expiresAt: new Date('2099-12-31'), // Far future
        },
      });

      const res = await request(app)
        .post('/api/admin/retention/cleanup')
        .set(validHeaders)
        .send({ dryRun: false, batchSize: 100 });

      expect(res.status).toBe(200);
      expect(res.body.data.deletedCount).toBe(0);

      // Verify chat still exists
      const chat = await prisma.encryptedChat.findUnique({
        where: { walletAddress: testWallet.toLowerCase() },
      });
      expect(chat).toBeDefined();
    });
  });

  describe('GET /api/admin/retention/stats', () => {
    const validHeaders = {
      'X-Admin-Secret': adminSecret,
    };

    it('returns retention statistics structure', async () => {
      const res = await request(app)
        .get('/api/admin/retention/stats')
        .set(validHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.totalChats).toBeDefined();
      expect(res.body.data.expiredChats).toBeDefined();
      expect(res.body.data.expiringIn24Hours).toBeDefined();
      expect(res.body.data.expiringIn7Days).toBeDefined();
      expect(res.body.data.expiringIn30Days).toBeDefined();
      expect(res.body.data.chatsWithRetention).toBeDefined();
      expect(res.body.data.chatsIndefiniteRetention).toBeDefined();
      expect(res.body.data.timestamp).toBeDefined();
    });

    it('correctly counts expired chats', async () => {
      // Create expired chat
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWallet.toLowerCase(),
          encryptedBlob: '0xtest',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
          expiresAt: new Date('2020-01-01'),
        },
      });

      const res = await request(app)
        .get('/api/admin/retention/stats')
        .set(validHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.expiredChats).toBe(1);
    });

    it('correctly counts chats with retention policy', async () => {
      // Create chat with retention
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWallet.toLowerCase(),
          encryptedBlob: '0xtest',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
          retentionDays: 30,
          expiresAt: new Date('2026-12-31'),
        },
      });

      const res = await request(app)
        .get('/api/admin/retention/stats')
        .set(validHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.chatsWithRetention).toBe(1);
    });
  });

  describe('GET /api/admin/retention/expired', () => {
    const validHeaders = {
      'X-Admin-Secret': adminSecret,
    };

    it('returns list of expired chats', async () => {
      const res = await request(app)
        .get('/api/admin/retention/expired')
        .set(validHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.chats).toBeDefined();
      expect(res.body.data.count).toBeDefined();
      expect(res.body.data.limit).toBeDefined();
    });

    it('respects limit parameter', async () => {
      const res = await request(app)
        .get('/api/admin/retention/expired?limit=10')
        .set(validHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.limit).toBe(10);
    });

    it('caps limit at 200', async () => {
      const res = await request(app)
        .get('/api/admin/retention/expired?limit=500')
        .set(validHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.limit).toBe(200);
    });

    it('hashes wallet addresses for privacy', async () => {
      // Create expired chat
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWallet.toLowerCase(),
          encryptedBlob: '0xtest',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
          expiresAt: new Date('2020-01-01'),
        },
      });

      const res = await request(app)
        .get('/api/admin/retention/expired?limit=10')
        .set(validHeaders);

      expect(res.status).toBe(200);

      if (res.body.data.count > 0) {
        const chat = res.body.data.chats[0];
        // Wallet should be truncated for privacy (first 10 chars + ...)
        expect(chat.walletAddress).toMatch(/^0x[0-9a-f]{8}\.\.\.$/);
        expect(chat.walletAddress.length).toBe(13); // "0x" + 8 chars + "..."
      }
    });

    it('includes expiration metadata', async () => {
      // Create expired chat
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWallet.toLowerCase(),
          encryptedBlob: '0xtest',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
          retentionDays: 30,
          expiresAt: new Date('2020-01-01'),
          createdAt: new Date('2019-01-01'),
        },
      });

      const res = await request(app)
        .get('/api/admin/retention/expired?limit=10')
        .set(validHeaders);

      expect(res.status).toBe(200);

      if (res.body.data.count > 0) {
        const chat = res.body.data.chats[0];
        expect(chat.expiresAt).toBeDefined();
        expect(chat.createdAt).toBeDefined();
        expect(chat.retentionDays).toBeDefined();
      }
    });
  });
});
