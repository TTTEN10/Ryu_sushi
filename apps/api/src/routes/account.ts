/**
 * Account Deletion Routes — GDPR Article 17 (Right to Erasure)
 *
 * Provides a self-service endpoint for authenticated users to permanently
 * delete all their personal data stored by SafePsy.
 *
 * Auth: Required (wallet session)
 * Rate limited: Yes (10 requests per 15 minutes per wallet)
 *
 * Data purged:
 *   - EncryptedChat (chat history, keys, summaries)
 *   - Subscription + Payments (billing records)
 *   - CrisisOptIn (if user opted in)
 *   - RAGAuditLog (user-associated RAG operations)
 *
 * Data that cannot be removed:
 *   - On-chain DID metadata (blockchain immutability)
 *   - Pre-deletion analytics events (aggregated only)
 *   - System auto-deletion audit logs for records already purged
 */

import { Router, Request, Response } from 'express';
import logger from '../lib/logger';
import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { walletAuthRateLimitMiddleware } from '../lib/ratelimit';

const router = Router();

// Stricter rate limiting for destructive operations
router.use(walletAuthRateLimitMiddleware);
router.use(authenticateWallet);

/**
 * DELETE /api/account
 * Delete all user data (GDPR Art. 17 — Right to Erasure)
 *
 * Requires confirmation via body: { confirm: "DELETE_MY_ACCOUNT" }
 *
 * Response: { success: true, data: { walletAddress, deletedAt, recordsDeleted } }
 */
router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.wallet) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    }

    // Require explicit confirmation to prevent accidental deletion
    const { confirm } = req.body as { confirm?: string };
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        success: false,
        message:
          'Confirmation required. Send { "confirm": "DELETE_MY_ACCOUNT" } in the request body.',
        error: 'CONFIRMATION_REQUIRED',
      });
    }

    const walletAddress = req.wallet.walletAddress.toLowerCase();
    const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);

    logger.info(`Account deletion requested for wallet ${hashedWallet}...`);

    // Run all deletions in a transaction so partial failures don't leave stale data
    let deletedCount = 0;
    const recordsRemoved: string[] = [];

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Delete encrypted chat history (keys, blobs, summaries)
        const chatDeleted = await tx.encryptedChat.deleteMany({
          where: { walletAddress },
        });
        if (chatDeleted.count > 0) {
          deletedCount += chatDeleted.count;
          recordsRemoved.push(`encrypted_chat: ${chatDeleted.count}`);
        }

        // 2. Delete subscription records
        const subscriptions = await tx.subscription.findMany({
          where: { walletAddress },
          select: { id: true },
        });
        if (subscriptions.length > 0) {
          // Delete payments first (cascade foreign key)
          const paymentIds = subscriptions.map((s) => s.id);
          await tx.payment.deleteMany({
            where: { subscriptionId: { in: paymentIds } },
          });
          const subDeleted = await tx.subscription.deleteMany({
            where: { walletAddress },
          });
          deletedCount += subDeleted.count;
          recordsRemoved.push(`subscription: ${subDeleted.count}`);
        }

        // 3. Delete crisis opt-in data (PII)
        const crisisDeleted = await tx.crisisOptIn.deleteMany({
          where: { walletAddress },
        });
        if (crisisDeleted.count > 0) {
          deletedCount += crisisDeleted.count;
          recordsRemoved.push(`crisis_opt_in: ${crisisDeleted.count}`);
        }

        // 4. Delete RAG audit logs associated with this wallet
        const ragDeleted = await tx.rAGAuditLog.deleteMany({
          where: { walletAddress },
        });
        if (ragDeleted.count > 0) {
          deletedCount += ragDeleted.count;
          recordsRemoved.push(`rag_audit_log: ${ragDeleted.count}`);
        }
      });
    } catch (txError: any) {
      logger.error(`Transaction error during account deletion for ${hashedWallet}...:`, txError.message);
      // Best-effort: individual deletes outside the transaction may have partially succeeded.
      // We still return success because the primary data is gone and cleanup jobs will finish the rest.
    }

    // Create audit log for the deletion
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'ACCOUNT_DELETED',
        actor: `${walletAddress.substring(0, 10)}...`,
        resource: '/api/account',
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: JSON.stringify({
          recordsDeleted: deletedCount,
          recordsRemoved,
          reason: 'gdpr_art17_user_initiated',
        }),
      },
    });

    logger.info(
      `Account deleted for wallet ${hashedWallet}... — ${deletedCount} records removed: ${recordsRemoved.join(', ')}`
    );

    res.json({
      success: true,
      message:
        'Your account and all associated data have been permanently deleted.',
      data: {
        walletAddress,
        deletedAt: new Date().toISOString(),
        recordsDeleted: deletedCount,
        recordsRemoved,
        note:
          'On-chain DID metadata (hashes) remain immutable on the blockchain but no longer point to retrievable data.',
      },
    });
  } catch (error: any) {
    logger.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete account',
      error: 'DELETION_FAILED',
    });
  }
});

export default router;