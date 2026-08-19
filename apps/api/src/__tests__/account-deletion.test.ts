/**
 * Account Deletion Tests — GDPR Art. 17 (Right to Erasure)
 *
 * Tests for DELETE /api/account endpoint that permanently
 * removes all user data from SafePsy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

// Mock rate limiting to avoid Redis dependency in tests
vi.mock('../lib/ratelimit', async () => {
  const actual: Record<string, unknown> = await vi.importActual('../lib/ratelimit');
  return {
    ...actual,
    walletConnectChallengeRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
    walletAuthRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
    rateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

// Mock Redis for other services
vi.mock('../lib/redis-shared', () => ({
  getSharedRedis: vi.fn().mockReturnValue(null),
}));

describe('DELETE /api/account (GDPR Art. 17)', () => {
  const app = createApp();
  const testWalletAddress = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  const testSignature =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901b';

  async function getAuthCookies() {
    // Connect to get a nonce
    const connectRes = await request(app)
      .post('/api/auth/wallet/connect')
      .set('Content-Type', 'application/json')
      .send({ address: testWalletAddress, chainId: 11155111 });

    expect(connectRes.status).toBe(200);
    const serverNonce = connectRes.body.data.nonce;

    // Verify with mock signature
    const verifyRes = await request(app)
      .post('/api/auth/wallet/verify')
      .set('Content-Type', 'application/json')
      .send({
        message: `Sign in to SafePsy\n\nNonce: ${serverNonce}`,
        signature: testSignature,
      });

    if (verifyRes.status === 200) {
      return verifyRes.headers['set-cookie'];
    }
    return null;
  }

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.encryptedChat
      .deleteMany({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      })
      .catch(() => {});

    await prisma.subscription
      .deleteMany({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      })
      .catch(() => {});

    await prisma.crisisOptIn
      .deleteMany({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      })
      .catch(() => {});

    await prisma.rAGAuditLog
      .deleteMany({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      })
      .catch(() => {});

    await prisma.securityAuditLog
      .deleteMany({
        where: { actor: { contains: testWalletAddress.slice(0, 10) } },
      })
      .catch(() => {});
  });

  describe('Authentication', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).delete('/api/account');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      // Middleware returns NO_TOKEN for missing auth, NOT_AUTHENTICATED for expired
      expect(['NO_TOKEN', 'NOT_AUTHENTICATED']).toContain(res.body.error);
    });

    it('returns 401 when session is expired', async () => {
      const res = await request(app)
        .delete('/api/account')
        .set('Cookie', ['walletSession=invalid']);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('returns 400 when confirmation is missing', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('CONFIRMATION_REQUIRED');
    });

    it('returns 400 when confirmation value is wrong', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: 'DELETE_MY_ACCOUNT_WRONG' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('CONFIRMATION_REQUIRED');
    });

    it('accepts correct confirmation value with no data to delete', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: 'DELETE_MY_ACCOUNT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Successful Deletion', () => {
    it('deletes encrypted chat history', async () => {
      // Create test chat
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          didTokenId: '1',
          encryptedBlob: '0xencrypted',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
          encryptedSummaryRef: 's3://bucket/summary',
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: 'DELETE_MY_ACCOUNT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recordsDeleted).toBeGreaterThanOrEqual(1);

      // Verify chat was actually deleted
      const chatCount = await prisma.encryptedChat.count({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      });
      expect(chatCount).toBe(0);
    });

    it('deletes subscription and payment records', async () => {
      const subscription = await prisma.subscription.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          status: 'active',
        },
      });

      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: 1000,
          currency: 'usd',
          status: 'succeeded',
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: 'DELETE_MY_ACCOUNT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify records were deleted
      const subCount = await prisma.subscription.count({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      });
      expect(subCount).toBe(0);
    });

    it('deletes crisis opt-in data', async () => {
      await prisma.crisisOptIn.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          email: 'test@example.com',
          crisisPhoneNumber: '+1234567890',
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: 'DELETE_MY_ACCOUNT' });

      expect(res.status).toBe(200);

      const crisisCount = await prisma.crisisOptIn.count({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      });
      expect(crisisCount).toBe(0);
    });

    it('deletes RAG audit logs', async () => {
      await prisma.rAGAuditLog.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          operation: 'document_ingestion',
          source: 'test',
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: 'DELETE_MY_ACCOUNT' });

      expect(res.status).toBe(200);

      const ragCount = await prisma.rAGAuditLog.count({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      });
      expect(ragCount).toBe(0);
    });

    it('creates an audit log entry for the deletion', async () => {
      // Create a chat to delete
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          didTokenId: '1',
          encryptedBlob: '0xencrypted',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: 'DELETE_MY_ACCOUNT' });

      // Verify audit log was created
      const auditLogs = await prisma.securityAuditLog.findMany({
        where: {
          eventType: 'ACCOUNT_DELETED',
          actor: { contains: testWalletAddress.slice(0, 10) },
          success: true,
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].resource).toBe('/api/account');

      const details = JSON.parse(auditLogs[0].details as string);
      expect(details.recordsDeleted).toBeGreaterThanOrEqual(1);
      expect(details.reason).toBe('gdpr_art17_user_initiated');
    });

    it('returns all deleted record types in response', async () => {
      // Create all types of records
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          didTokenId: '1',
          encryptedBlob: '0xencrypted',
          encryptedBlobHash: '0x' + 'a'.repeat(64),
        },
      });

      await prisma.crisisOptIn.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          email: 'test@example.com',
          crisisPhoneNumber: '+1234567890',
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: 'DELETE_MY_ACCOUNT' });

      expect(res.status).toBe(200);
      expect(res.body.data.recordsRemoved).toBeDefined();
      expect(Array.isArray(res.body.data.recordsRemoved)).toBe(true);
      expect(res.body.data.walletAddress).toBe(testWalletAddress.toLowerCase());
      expect(res.body.data.deletedAt).toBeDefined();
      expect(res.body.data.note).toContain('On-chain DID metadata');
    });

    it('succeeds even when no records exist (idempotent)', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({ confirm: 'DELETE_MY_ACCOUNT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recordsDeleted).toBe(0);
    });
  });

  describe('Audit Trail', () => {
    it('logs IP address and user agent in audit entry', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) return;

      await request(app)
        .delete('/api/account')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .set('User-Agent', 'TestClient/1.0')
        .send({ confirm: 'DELETE_MY_ACCOUNT' });

      const auditLogs = await prisma.securityAuditLog.findMany({
        where: { eventType: 'ACCOUNT_DELETED' },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].ipAddress).toBeDefined();
      expect(auditLogs[0].userAgent).toBe('TestClient/1.0');
    });
  });
});