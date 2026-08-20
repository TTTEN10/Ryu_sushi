/**
 * Crisis Opt-In Auto-Purge Job
 *
 * Runs daily to delete expired crisis opt-in records.
 * Records expire 30 days after creation (set at registration time).
 *
 * Usage:
 *   npx tsx src/jobs/crisis-purge.ts
 *
 * Cron schedule (recommended):
 *   0 3 * * *  # Daily at 3:00 AM local time
 */

import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { ethers } from 'ethers';

interface PurgeResult {
  success: boolean;
  deletedCount: number;
  error?: string;
  timestamp: string;
}

/**
 * Purge expired crisis opt-in records
 */
async function purgeExpiredCrisisOptIns(): Promise<PurgeResult> {
  const now = new Date();

  try {
    const result = await prisma.crisisOptIn.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    const hashedActor = ethers.keccak256(ethers.toUtf8Bytes('system-cron')).substring(0, 16);

    logger.info(`Purged ${result.count} expired crisis opt-in records`, {
      deletedCount: result.count,
      timestamp: now.toISOString(),
    });

    // Log audit event
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'CRISIS_OPT_IN_PURGE',
        actor: `system-cron (${hashedActor})`,
        resource: `/api/crisis/purge`,
        success: true,
        details: JSON.stringify({
          deletedCount: result.count,
          timestamp: now.toISOString(),
        }),
      },
    });

    return {
      success: true,
      deletedCount: result.count,
      timestamp: now.toISOString(),
    };
  } catch (error: any) {
    logger.error('Failed to purge expired crisis opt-in records:', error);

    // Log failure audit event
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'CRISIS_OPT_IN_PURGE',
        actor: 'system-cron',
        resource: `/api/crisis/purge`,
        success: false,
        details: JSON.stringify({
          error: error.message || String(error),
          timestamp: now.toISOString(),
        }),
      },
    });

    return {
      success: false,
      deletedCount: 0,
      error: error.message || String(error),
      timestamp: now.toISOString(),
    };
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info('Starting crisis opt-in auto-purge job...');

  const result = await purgeExpiredCrisisOptIns();

  if (result.success) {
    logger.info('Crisis opt-in purge completed', { deletedCount: result.deletedCount });
  } else {
    logger.error('Crisis opt-in purge failed', { error: result.error });
    logger.error('Purge error details', { result });
    process.exit(1);
  }

  await prisma.$disconnect();
  process.exit(0);
}

// Run if executed directly
main().catch((error) => {
  logger.error('Fatal error in crisis purge job', { error: error.message || String(error) });
  process.exit(1);
});

export { purgeExpiredCrisisOptIns };
