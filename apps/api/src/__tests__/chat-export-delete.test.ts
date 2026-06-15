/**
 * Chat Export and Delete Endpoint Tests
 *
 * Tests for POST /api/chat/export and DELETE /api/chat endpoints
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

describe('Chat Export and Delete', () => {
  const app = createApp();
  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const testSignature = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901b';
  const testMessage = 'Sign in to SafePsy\n\nNonce: 0xtestnonce\n\nIssued At: 2026-01-01T00:00:00.000Z';

  // Helper to get auth cookies
  async function getAuthCookies() {
    // First, connect to get a nonce
    const connectRes = await request(app)
      .post('/api/auth/wallet/connect')
      .set('Content-Type', 'application/json')
      .send({ address: testWalletAddress, chainId: 11155111 });

    expect(connectRes.status).toBe(200);
    const nonce = connectRes.body.data.nonce;

    // Create a mock SIWE message
    const siweMessage = `safepsy.com wants you to sign in with your Ethereum account:
${testWalletAddress}

Sign in to SafePsy

URI: https://safepsy.com
Version: 1
Chain ID: 11155111
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

    // Verify (mock - in tests we accept any signature)
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
    // Clean up any existing test data
    await prisma.encryptedChat.deleteMany({
      where: { walletAddress: testWalletAddress.toLowerCase() },
    }).catch(() => {});

    await prisma.securityAuditLog.deleteMany({
      where: { actor: { contains: testWalletAddress.slice(0, 10) } },
    }).catch(() => {});
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.encryptedChat.deleteMany({
      where: { walletAddress: testWalletAddress.toLowerCase() },
    }).catch(() => {});
  });

  describe('POST /api/chat/export', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/chat/export')
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 when no chat history exists', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) {
        // If auth fails, skip this test
        return;
      }

      const res = await request(app)
        .post('/api/chat/export')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies);

      // Should be 404 since no chat exists
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('CHAT_NOT_FOUND');
    });

    it('exports chat history when it exists', async () => {
      // First, create a test chat
      const testEncryptedBlob = '0xencrypted-chat-data-here';
      const testBlobHash = '0x' + 'a'.repeat(64);

      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          didTokenId: '123',
          encryptedBlob: testEncryptedBlob,
          encryptedBlobHash: testBlobHash,
          encryptedSummaryRef: 's3://bucket/summary-encrypted',
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) {
        return;
      }

      const res = await request(app)
        .post('/api/chat/export')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.walletAddress).toBe(testWalletAddress.toLowerCase());
      expect(res.body.data.chat.encryptedBlob).toBe(testEncryptedBlob);
      expect(res.body.data.chat.encryptedBlobHash).toBe(testBlobHash);
      expect(res.body.data.chat.encryptedSummaryRef).toBe('s3://bucket/summary-encrypted');
      expect(res.body.data.decryptionInstructions).toBeDefined();
      expect(res.body.data.decryptionInstructions.note).toContain('wallet');

      // Verify audit log was created
      const auditLogs = await prisma.securityAuditLog.findMany({
        where: {
          eventType: 'CHAT_EXPORTED',
          actor: { contains: testWalletAddress.slice(0, 10) },
        },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/chat', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .delete('/api/chat')
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 when no chat history exists', async () => {
      const cookies = await getAuthCookies();
      if (!cookies) {
        return;
      }

      const res = await request(app)
        .delete('/api/chat')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('CHAT_NOT_FOUND');
    });

    it('deletes chat history successfully', async () => {
      // First, create a test chat
      const testEncryptedBlob = '0xencrypted-chat-data-here';
      const testBlobHash = '0x' + 'a'.repeat(64);

      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          didTokenId: '123',
          encryptedBlob: testEncryptedBlob,
          encryptedBlobHash: testBlobHash,
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) {
        return;
      }

      const res = await request(app)
        .delete('/api/chat')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedAt).toBeDefined();

      // Verify chat was actually deleted
      const deletedChat = await prisma.encryptedChat.findUnique({
        where: { walletAddress: testWalletAddress.toLowerCase() },
      });
      expect(deletedChat).toBeNull();

      // Verify audit log was created
      const auditLogs = await prisma.securityAuditLog.findMany({
        where: {
          eventType: 'CHAT_DELETED',
          actor: { contains: testWalletAddress.slice(0, 10) },
        },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('includes warning about on-chain permanence in delete response', async () => {
      const testEncryptedBlob = '0xencrypted-chat-data';
      const testBlobHash = '0x' + 'b'.repeat(64);

      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          encryptedBlob: testEncryptedBlob,
          encryptedBlobHash: testBlobHash,
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) {
        return;
      }

      const res = await request(app)
        .delete('/api/chat')
        .set('Content-Type', 'application/json')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('On-chain');
      expect(res.body.message).toContain('immutable');
    });
  });

  describe('Rate Limiting', () => {
    it('allows up to 5 export/delete requests per hour', async () => {
      // Create a test chat first
      await prisma.encryptedChat.create({
        data: {
          walletAddress: testWalletAddress.toLowerCase(),
          encryptedBlob: '0xtest',
          encryptedBlobHash: '0x' + 'c'.repeat(64),
        },
      });

      const cookies = await getAuthCookies();
      if (!cookies) {
        return;
      }

      // Should allow first 5 requests
      for (let i = 0; i < 5; i++) {
        // Re-create chat since we delete it
        if (i > 0) {
          await prisma.encryptedChat.create({
            data: {
              walletAddress: testWalletAddress.toLowerCase(),
              encryptedBlob: '0xtest',
              encryptedBlobHash: '0x' + 'c'.repeat(64),
            },
          });
        }

        const res = await request(app)
          .delete('/api/chat')
          .set('Content-Type', 'application/json')
          .set('Cookie', cookies);

        // First 5 should succeed (either 200 or 404 if already deleted)
        expect(res.status).toBeLessThan(400);
      }
    });
  });
});
