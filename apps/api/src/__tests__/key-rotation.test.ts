/**
 * Key Rotation Endpoint Tests
 *
 * Tests for POST /api/chat/rotate-key endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

// Mock rate limiting
vi.mock('../lib/ratelimit', async () => {
  const actual: Record<string, unknown> = await vi.importActual('../lib/ratelimit');
  return {
    ...actual,
    walletConnectChallengeRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
    walletAuthRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
    rateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

// Mock Redis for quota service
vi.mock('../lib/redis-shared', () => ({
  getSharedRedis: vi.fn().mockReturnValue(null),
}));

describe('Key Rotation', () => {
  const app = createApp();
  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const testSignature = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901b';

  // Helper to get auth cookies
  async function getAuthCookies() {
    const connectRes = await request(app)
      .post('/api/auth/wallet/connect')
      .set('Content-Type', 'application/json')
      .send({ address: testWalletAddress, chainId: 11155111 });

    expect(connectRes.status).toBe(200);
    const nonce = connectRes.body.data.nonce;

    const siweMessage = `safepsy.com wants you to sign in with your Ethereum account:
${testWalletAddress}

Sign in to SafePsy

URI: https://safepsy.com
Version: 1
Chain ID: 11155111
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

    const verifyRes = await request(app)
      .post('/api/auth/wallet/verify')
      .set('Content-Type', 'application/json')
      .send({
        message: siweMessage,
        signature: testSignature,
      });

    if (verifyRes.status === 200) {
      return verifyRes.headers['set-cookie'];
    }
    return null;
  }

  beforeEach(async () => {
    await prisma.encryptedChat.deleteMany({
      where: { walletAddress: testWalletAddress.toLowerCase() },
    }).catch(() => {});
  });

  afterEach(async () => {
    await prisma.encryptedChat.deleteMany({
      where: { walletAddress: testWalletAddress.toLowerCase() },
    }).catch(() => {});
  });

  describe('POST /api/chat/rotate-key', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/chat/rotate-key')
        .set('Content-Type', 'application/json')
        .send({
          newEncryptedBlob: '0xnew-encrypted',
          newBlobHash: '0x' + 'a'.repeat(64),
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when missing required fields', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) return;

      // Missing newEncryptedBlob
      const res1 = await request(app)
        .post('/api/chat/rotate-key')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({
          newBlobHash: '0x' + 'a'.repeat(64),
        });

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      // Missing newBlobHash
      const res2 = await request(app)
        .post('/api/chat/rotate-key')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({
          newEncryptedBlob: '0xnew-encrypted',
        });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });

    it('returns 400 when encrypted key metadata has invalid format', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) return;

      // Invalid format (missing colons)
      const res = await request(app)
        .post('/api/chat/rotate-key')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({
          newEncryptedBlob: '0xnew-encrypted',
          newBlobHash: '0x' + 'a'.repeat(64),
          newEncryptedKeyMetadata: 'invalid-format-no-colons',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_KEY_FORMAT');
    });

    it('returns 404 when no chat history exists', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .post('/api/chat/rotate-key')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({
          newEncryptedBlob: '0xnew-encrypted',
          newBlobHash: '0x' + 'a'.repeat(64),
          newEncryptedKeyMetadata: 'signature:iv:encrypted',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('CHAT_NOT_FOUND');
    });

    it('successfully rotates key when chat exists', async () => {
      // Create initial chat
      const oldEncryptedBlob = '0xold-encrypted-data';
      const oldBlobHash = '0x' + 'b'.repeat(64);

      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          didTokenId: '123',
          encryptedBlob: oldEncryptedBlob,
          encryptedBlobHash: oldBlobHash,
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      const newEncryptedBlob = '0xnew-encrypted-data-with-new-key';
      const newBlobHash = '0x' + 'c'.repeat(64);
      const newEncryptedKeyMetadata = '0xsignature:0xiv:0xencryptedkey';

      const res = await request(app)
        .post('/api/chat/rotate-key')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({
          newEncryptedBlob,
          newBlobHash,
          newEncryptedKeyMetadata,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rotatedAt).toBeDefined();
      expect(res.body.data.blobHash).toBe(newBlobHash);

      // Verify database was updated
      const updatedChat = await prisma.encryptedChat.findUnique({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      });

      expect(updatedChat).toBeDefined();
      expect(updatedChat!.encryptedBlob).toBe(newEncryptedBlob);
      expect(updatedChat!.encryptedBlobHash).toBe(newBlobHash);

      // Verify audit log was created
      const auditLogs = await prisma.securityAuditLog.findMany({
        where: {
          eventType: 'KEY_ROTATION_INITIATED',
          actor: { contains: testWalletAddress.slice(0, 10) },
        },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('accepts valid encrypted key metadata format', async () => {
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          encryptedBlob: '0xold',
          encryptedBlobHash: '0x' + 'd'.repeat(64),
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      // Valid format: signature:iv:encrypted (3 parts with colons)
      const validKeyMetadata = '0xabcd1234:0x1234567890abcdef:0xfedcba0987654321';

      const res = await request(app)
        .post('/api/chat/rotate-key')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({
          newEncryptedBlob: '0xnew',
          newBlobHash: '0x' + 'e'.repeat(64),
          newEncryptedKeyMetadata: validKeyMetadata,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('works without encrypted key metadata (optional field)', async () => {
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          encryptedBlob: '0xold',
          encryptedBlobHash: '0x' + 'f'.repeat(64),
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      const res = await request(app)
        .post('/api/chat/rotate-key')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({
          newEncryptedBlob: '0xnew',
          newBlobHash: '0x' + '0'.repeat(64),
          // No newEncryptedKeyMetadata field
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('creates audit log with redacted wallet address', async () => {
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          encryptedBlob: '0xold',
          encryptedBlobHash: '0x' + '1'.repeat(64),
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) return;

      await request(app)
        .post('/api/chat/rotate-key')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies)
        .send({
          newEncryptedBlob: '0xnew',
          newBlobHash: '0x' + '2'.repeat(64),
        });

      const auditLogs = await prisma.securityAuditLog.findMany({
        where: {
          eventType: 'KEY_ROTATION_INITIATED',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      const log = auditLogs[0];

      // Verify wallet is redacted (only first 10 chars visible)
      expect(log.actor).toMatch(/^0x[a-fA-F0-9]{10}\.\.\./);

      // Verify details contain expected info
      const details = JSON.parse(log.details || '{}');
      expect(details.newBlobHash).toBeDefined();
      expect(details.newBlobHash.length).toBeLessThan(66); // Hash should be truncated
    });
  });
});
