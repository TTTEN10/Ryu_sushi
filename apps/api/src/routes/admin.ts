/**
 * Admin Routes for Data Retention Management
 *
 * These routes are for administrative operations related to data retention.
 * Protected by admin authentication middleware and rate limiting.
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import logger from '../lib/logger';
import { validate } from '../middleware/validation';
import { prisma } from '../lib/prisma';
import { setChatRetentionPolicy, runCleanup } from '../lib/cleanup-job';
import { authenticateAdmin } from '../middleware/authenticate-admin';
import { adminRateLimitMiddleware } from '../lib/ratelimit';
import { ethers } from 'ethers';

const router = Router();

// Apply rate limiting and authentication to all admin routes
// Note: adminRateLimitMiddleware skips rate limiting on successful (200) responses
router.use(adminRateLimitMiddleware);
router.use(authenticateAdmin);

/**
 * POST /api/admin/retention/set
 * Set retention policy for a specific chat
 *
 * Auth: Should be protected with admin authentication in production
 */
const setRetentionSchema = Joi.object({
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  retentionDays: Joi.number().integer().min(1).max(3650).allow(null).required(),
});

router.post(
  '/retention/set',
  validate(setRetentionSchema),
  async (req: Request, res: Response) => {
    try {
      const { walletAddress, retentionDays } = req.body;

      const result = await setChatRetentionPolicy(walletAddress.toLowerCase(), retentionDays);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: `Retention policy set to ${retentionDays ?? 'indefinite'} days`,
        data: {
          walletAddress: walletAddress.toLowerCase(),
          retentionDays,
          expiresAt: result.expiresAt?.toISOString() || null,
        },
      });
    } catch (error: any) {
      logger.error('Admin set retention error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to set retention policy',
      });
    }
  }
);

/**
 * POST /api/admin/retention/cleanup
 * Run the cleanup job to delete expired chats
 *
 * Auth: Should be protected with admin authentication in production
 */
const cleanupSchema = Joi.object({
  batchSize: Joi.number().integer().min(1).max(1000).default(100),
  dryRun: Joi.boolean().default(false),
});

router.post(
  '/retention/cleanup',
  validate(cleanupSchema),
  async (req: Request, res: Response) => {
    try {
      const { batchSize, dryRun } = req.body;

      logger.info(`Admin cleanup requested: batchSize=${batchSize}, dryRun=${dryRun}`);

      const result = await runCleanup({ batchSize, dryRun });

      res.json({
        success: result.success,
        message: result.success
          ? `Cleanup completed. ${result.deletedCount} chats ${dryRun ? 'would be' : 'were'} deleted.`
          : `Cleanup failed: ${result.error}`,
        data: result,
      });
    } catch (error: any) {
      logger.error('Admin cleanup error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to run cleanup',
      });
    }
  }
);

/**
 * GET /api/admin/retention/stats
 * Get statistics about expiring chats
 */
router.get('/retention/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, expired, expiring24h, expiring7d, expiring30d, withRetention] = await Promise.all([
      prisma.encryptedChat.count(),
      prisma.encryptedChat.count({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      }),
      prisma.encryptedChat.count({
        where: {
          expiresAt: {
            gte: now,
            lt: in24Hours,
          },
        },
      }),
      prisma.encryptedChat.count({
        where: {
          expiresAt: {
            gte: now,
            lt: in7Days,
          },
        },
      }),
      prisma.encryptedChat.count({
        where: {
          expiresAt: {
            gte: now,
            lt: in30Days,
          },
        },
      }),
      prisma.encryptedChat.count({
        where: {
          retentionDays: {
            not: null,
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalChats: total,
        expiredChats: expired,
        expiringIn24Hours: expiring24h,
        expiringIn7Days: expiring7d,
        expiringIn30Days: expiring30d,
        chatsWithRetention: withRetention,
        chatsIndefiniteRetention: total - withRetention,
        timestamp: now.toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Admin retention stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get retention stats',
    });
  }
});

/**
 * GET /api/admin/retention/expired
 * List expired chats (for monitoring)
 */
router.get('/retention/expired', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

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
        retentionDays: true,
      },
      take: limit,
      orderBy: { expiresAt: 'asc' },
    });

    // Hash wallet addresses for privacy
    const hashedChats = expiredChats.map((chat) => ({
      ...chat,
      walletAddress: `${chat.walletAddress.slice(0, 10)}...`,
    }));

    res.json({
      success: true,
      data: {
        chats: hashedChats,
        count: expiredChats.length,
        limit,
      },
    });
  } catch (error: any) {
    logger.error('Admin expired chats list error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to list expired chats',
    });
  }
});

export default router;
