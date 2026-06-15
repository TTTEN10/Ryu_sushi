/**
 * Data Retention Cleanup Job Tests
 *
 * Tests for the cleanup job that purges expired chats
 *
 * Note: These are unit tests with mocked Prisma.
 * For integration tests, run with a real test database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma to avoid database dependency in unit tests
// Must use vi.mock with factory function, not external variable
vi.mock('../lib/prisma', () => ({
  prisma: {
    encryptedChat: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
    securityAuditLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn().mockImplementation((ops) => Promise.all(ops)),
    $disconnect: vi.fn().mockResolvedValue(),
  },
}));

import { calculateExpirationDate } from '../lib/cleanup-job';
import { prisma } from '../lib/prisma';

describe('Data Retention Cleanup Job - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper to get mocked prisma functions
  const mockPrisma = prisma;

  describe('calculateExpirationDate', () => {
    it('calculates correct expiration date for 30 days retention', () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const retentionDays = 30;

      const expiresAt = calculateExpirationDate(createdAt, retentionDays);

      expect(expiresAt.toISOString()).toBe('2026-01-31T00:00:00.000Z');
    });

    it('calculates correct expiration date for 7 days retention', () => {
      const createdAt = new Date('2026-06-01T12:00:00Z');
      const retentionDays = 7;

      const expiresAt = calculateExpirationDate(createdAt, retentionDays);

      expect(expiresAt.toISOString()).toBe('2026-06-08T12:00:00.000Z');
    });

    it('handles year boundary correctly', () => {
      const createdAt = new Date('2025-12-15T00:00:00Z');
      const retentionDays = 30;

      const expiresAt = calculateExpirationDate(createdAt, retentionDays);

      expect(expiresAt.getFullYear()).toBe(2026);
      expect(expiresAt.getMonth()).toBe(0); // January
      expect(expiresAt.getDate()).toBe(14);
    });

    it('handles leap year correctly', () => {
      const createdAt = new Date('2024-02-01T00:00:00Z');
      const retentionDays = 28;

      const expiresAt = calculateExpirationDate(createdAt, retentionDays);

      expect(expiresAt.getFullYear()).toBe(2024);
      expect(expiresAt.getMonth()).toBe(1); // February
      expect(expiresAt.getDate()).toBe(29); // 2024 is a leap year
    });
  });

  describe('runCleanup (mocked)', () => {
    it('finds no expired chats when none exist', async () => {
      const { runCleanup } = await import('../lib/cleanup-job');

      const result = await runCleanup({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
      expect(mockPrisma.encryptedChat.findMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        select: expect.any(Object),
        take: 100,
      });
    });

    it('processes expired chats in dry run mode', async () => {
      const { runCleanup } = await import('../lib/cleanup-job');

      // Mock expired chats
      mockPrisma.encryptedChat.findMany.mockResolvedValueOnce([
        {
          id: 'chat1',
          walletAddress: '0x1234567890123456789012345678901234567890',
          expiresAt: new Date('2020-01-01'),
          createdAt: new Date('2019-01-01'),
        },
      ]);

      const result = await runCleanup({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.dryRun).toBe(true);
      // Dry run should not call deleteMany
      expect(mockPrisma.encryptedChat.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes expired chats in live mode', async () => {
      const { runCleanup } = await import('../lib/cleanup-job');

      // Mock expired chats
      mockPrisma.encryptedChat.findMany.mockResolvedValueOnce([
        {
          id: 'chat1',
          walletAddress: '0x1234567890123456789012345678901234567890',
          expiresAt: new Date('2020-01-01'),
          createdAt: new Date('2019-01-01'),
        },
      ]);
      mockPrisma.encryptedChat.deleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await runCleanup({ dryRun: false, batchSize: 100 });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.dryRun).toBe(false);
      // Live mode should call deleteMany
      expect(mockPrisma.encryptedChat.deleteMany).toHaveBeenCalled();
    });

    it('respects batch size limit', async () => {
      const { runCleanup } = await import('../lib/cleanup-job');

      // Mock 5 expired chats
      mockPrisma.encryptedChat.findMany.mockResolvedValueOnce(
        Array.from({ length: 5 }, (_, i) => ({
          id: `chat${i}`,
          walletAddress: `0x${i}234567890123456789012345678901234567890`,
          expiresAt: new Date('2020-01-01'),
          createdAt: new Date('2019-01-01'),
        }))
      );

      const result = await runCleanup({ dryRun: false, batchSize: 2 });

      expect(result.success).toBe(true);
      // Should only process up to batch size
      expect(mockPrisma.encryptedChat.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 2,
        })
      );
    });

    it('handles errors gracefully', async () => {
      const { runCleanup } = await import('../lib/cleanup-job');

      // Mock database error
      mockPrisma.encryptedChat.findMany.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await runCleanup({ dryRun: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('setChatRetentionPolicy (mocked)', () => {
    it('sets retention policy for existing chat', async () => {
      const { setChatRetentionPolicy } = await import('../lib/cleanup-job');

      // Mock existing chat
      mockPrisma.encryptedChat.findUnique.mockResolvedValueOnce({
        walletAddress: '0x1234567890123456789012345678901234567890',
        createdAt: new Date('2026-01-01'),
      });
      mockPrisma.encryptedChat.update.mockResolvedValueOnce({});

      const result = await setChatRetentionPolicy('0x1234567890123456789012345678901234567890', 30);

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();
      expect(mockPrisma.encryptedChat.update).toHaveBeenCalledWith({
        where: { walletAddress: '0x1234567890123456789012345678901234567890' },
        data: expect.objectContaining({
          retentionDays: 30,
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('removes retention policy when null is passed', async () => {
      const { setChatRetentionPolicy } = await import('../lib/cleanup-job');

      mockPrisma.encryptedChat.findUnique.mockResolvedValueOnce({
        walletAddress: '0x1234567890123456789012345678901234567890',
        retentionDays: 30,
        expiresAt: new Date('2026-12-31'),
      });
      mockPrisma.encryptedChat.update.mockResolvedValueOnce({});

      const result = await setChatRetentionPolicy('0x1234567890123456789012345678901234567890', null);

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBe(null);
    });

    it('returns error when chat not found', async () => {
      const { setChatRetentionPolicy } = await import('../lib/cleanup-job');

      mockPrisma.encryptedChat.findUnique.mockResolvedValueOnce(null);

      const result = await setChatRetentionPolicy('0xnonexistent123456789012345678901234', 30);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat not found');
    });
  });
});
