/**
 * Data Retention Cleanup Job
 *
 * Purges expired encrypted chat data from the database based on retention policy.
 *
 * Usage:
 *   // Run manually
 *   npx tsx apps/api/src/lib/cleanup-job.ts
 *
 *   // Or schedule with cron (example: every hour)
 *   0 * * * * cd /path/to/repo && npx tsx apps/api/src/lib/cleanup-job.ts
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   CLEANUP_BATCH_SIZE - Number of records to delete per batch (default: 100)
 *   CLEANUP_DRY_RUN - If "1", only log what would be deleted (default: "0")
 */

import { prisma } from './prisma';
import logger from './logger';
import { ethers } from 'ethers';

interface CleanupResult {
  success: boolean;
  deletedCount: number;
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  error?: string;
}

/**
 * Find and optionally delete expired chat records
 */
async function runCleanup(
  options: {
    batchSize?: number;
    dryRun?: boolean;
  } = {}
): Promise<CleanupResult> {
  const { batchSize = 100, dryRun = false } = options;
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  try {
    // Find expired chats (expiresAt is in the past)
    const expiredChats = await prisma.encryptedChat.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
      select: {
        id: true,
        walletAddress: true,
        expiresAt: true,
        createdAt: true,
      },
      take: batchSize,
    });

    if (expiredChats.length === 0) {
      logger.info('Cleanup job: No expired chats found');
      return {
        success: true,
        deletedCount: 0,
        dryRun,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }

    logger.info(`Cleanup job: Found ${expiredChats.length} expired chats`);

    if (dryRun) {
      // Log what would be deleted without actually deleting
      for (const chat of expiredChats) {
        const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(chat.walletAddress)).substring(0, 16);
        logger.info(`Cleanup job (DRY RUN): Would delete chat for wallet ${hashedWallet}..., expired at ${chat.expiresAt.toISOString()}`);
      }

      return {
        success: true,
        deletedCount: expiredChats.length,
        dryRun: true,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }

    // Delete expired chats in batches
    const walletAddresses = expiredChats.map((c) => c.walletAddress);

    // Log audit events before deletion
    const auditLogs = expiredChats.map((chat) => {
      const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(chat.walletAddress)).substring(0, 16);
      logger.info(`Cleanup job: Deleting expired chat for wallet ${hashedWallet}...`);

      return {
        eventType: 'CHAT_EXPIRED_AUTO_DELETED',
        actor: 'system-cleanup-job',
        resource: `/api/chat/${chat.id}`,
        success: true,
        ipAddress: null,
        userAgent: 'cleanup-job',
        details: JSON.stringify({
          walletAddress: chat.walletAddress,
          expiresAt: chat.expiresAt.toISOString(),
          createdAt: chat.createdAt.toISOString(),
          reason: 'retention_policy_expired',
        }),
      };
    });

    // Create audit logs and delete chats in a transaction
    await prisma.$transaction([
      // Create audit logs
      ...auditLogs.map((log) => prisma.securityAuditLog.create({ data: log })),
      // Delete expired chats
      prisma.encryptedChat.deleteMany({
        where: {
          walletAddress: {
            in: walletAddresses,
          },
        },
      }),
    ]);

    logger.info(`Cleanup job: Successfully deleted ${expiredChats.length} expired chats`);

    return {
      success: true,
      deletedCount: expiredChats.length,
      dryRun,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    logger.error('Cleanup job: Error during execution:', error);

    return {
      success: false,
      deletedCount: 0,
      dryRun,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      error: error.message || 'Unknown error',
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Calculate expiration date based on retention days
 */
export function calculateExpirationDate(createdAt: Date, retentionDays: number): Date {
  const expiration = new Date(createdAt);
  expiration.setDate(expiration.getDate() + retentionDays);
  return expiration;
}

/**
 * Set retention policy for a chat
 */
export async function setChatRetentionPolicy(
  walletAddress: string,
  retentionDays: number | null
): Promise<{ success: boolean; expiresAt: Date | null; error?: string }> {
  try {
    const chat = await prisma.encryptedChat.findUnique({
      where: { walletAddress },
    });

    if (!chat) {
      return {
        success: false,
        expiresAt: null,
        error: 'Chat not found',
      };
    }

    const expiresAt = retentionDays !== null
      ? calculateExpirationDate(chat.createdAt, retentionDays)
      : null;

    await prisma.encryptedChat.update({
      where: { walletAddress },
      data: {
        retentionDays,
        expiresAt,
      },
    });

    logger.info(`Retention policy set for wallet ${walletAddress}: ${retentionDays ?? 'indefinite'} days`);

    return {
      success: true,
      expiresAt,
    };
  } catch (error: any) {
    logger.error('Error setting retention policy:', error);
    return {
      success: false,
      expiresAt: null,
      error: error.message,
    };
  }
}

// CLI execution
if (require.main === module) {
  (async () => {
    const dryRun = process.env.CLEANUP_DRY_RUN === '1';
    const batchSize = parseInt(process.env.CLEANUP_BATCH_SIZE || '100', 10);

    logger.info(`Cleanup job starting... (dryRun=${dryRun}, batchSize=${batchSize})`);

    const result = await runCleanup({ batchSize, dryRun });

    logger.info('Cleanup job completed:', JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }
  })();
}

export { runCleanup };
