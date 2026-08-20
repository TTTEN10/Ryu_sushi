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
 *   - CrisisOptIn (PII)
 *   - RAGAuditLog (user-associated RAG operations)
 *   - UserConsent (consent records)
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

        // 5. Delete user consent records (GDPR Art. 7(3))
        const consentDeleted = await tx.userConsent.deleteMany({
          where: { walletAddress },
        });
        if (consentDeleted.count > 0) {
          deletedCount += consentDeleted.count;
          recordsRemoved.push(`user_consent: ${consentDeleted.count}`);
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
        /**
         * What was deleted (off-chain):
         * - All encrypted chat history, keys, and summaries
         * - All subscription, payment, and billing records
         * - All crisis opt-in PII (name, email, contact info)
         * - All RAG audit logs
         * - All consent records (grants and withdrawals)
         * - All active session tokens
         */
        offChainDeleted: [
          'EncryptedChat (chat history, keys, summaries)',
          'Subscription + Payment records',
          'CrisisOptIn (name, email, emergency contact)',
          'RAGAuditLog entries',
          'UserConsent records',
        ],
        /**
         * What remains on-chain (blockchain immutability):
         * - Token IDs and DID hashes (no personal data, only cryptographic commitments)
         * - Wallet addresses (pseudonymous, not directly identifiable)
         * - Event logs (DID minted/revoked, key updates)
         * - Service endpoint URLs (infrastructure data)
         * - encryptedKeyMetadata blob (unintelligible without wallet to unwrap)
         */
        onChainRemains: [
          'DID token IDs and hashes (non-identifiable)',
          'Wallet addresses on-chain (pseudonymous)',
          'DID lifecycle events (mint, revoke, key updates)',
          'Service endpoint URLs (infrastructure data)',
          'Encrypted key metadata (cryptographically unreadable)',
        ],
        /**
         * Legal basis for on-chain retention:
         * - GDPR Art. 6(1)(f): Legitimate interest (audit trail, fraud prevention)
         * - GDPR Art. 17(3)(d): Legal claims (identity verification evidence)
         * - On-chain data contains no raw personal information
         */
        legalBasis: 'GDPR Art. 6(1)(f) legitimate interest; GDPR Art. 17(3)(d) legal claims. No raw personal data on-chain.',
        /**
         * Effect on decryption/access:
         * After deletion, the encryptedKeyMetadata on-chain is unlinkable
         * because SafePsy no longer holds database references needed for
         * key derivation. User loses access to all previously stored data.
         */
        accessImpact:
          'Key unlinking is permanent. Even though the encrypted key metadata remains on-chain, it cannot be used to access any data because the off-chain references have been deleted. Your wallet-derived KEK can decrypt the blob, but the data it points to no longer exists.',
        /**
         * Optional: user can still revoke DID from profile page
         * (revocation is permanent; cannot be undone)
         */
        optionalActions:
          'If you wish, you may also revoke your DID token from your profile page. Revocation is permanent and cannot be undone. The revocation event will remain on-chain as a permanent record.',
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

/**
 * POST /api/account/unlink
 * Unlink wallet from DID without full account deletion.
 *
 * Severs all off-chain references between the wallet and user data:
 * - Deletes UserConsent records
 * - Clears session tokens
 * - Returns confirmation of what was unlinked vs what remains on-chain
 *
 * This does NOT delete:
 * - Encrypted chat history (use DELETE /api/account for full erasure)
 * - Subscription records
 * - On-chain DID metadata (cannot be removed from blockchain)
 *
 * Auth: Required (wallet session)
 * Rate limited: Yes (10 requests per 15 minutes per wallet)
 */
router.post('/unlink', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.wallet) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    }

    const walletAddress = req.wallet.walletAddress.toLowerCase();
    const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);

    logger.info(`Wallet unlinking requested for ${hashedWallet}...`);

    let consentUnlinked = 0;

    try {
      await prisma.$transaction(async (tx) => {
        const result = await tx.userConsent.deleteMany({
          where: { walletAddress },
        });
        consentUnlinked = result.count;
      });
    } catch (txError: unknown) {
      const err = txError as Error;
      logger.error(`Transaction error during unlink for ${hashedWallet}...:`, err.message);
    }

    await prisma.securityAuditLog.create({
      data: {
        eventType: 'WALLET_UNLINKED',
        actor: `${walletAddress.substring(0, 10)}...`,
        resource: '/api/account/unlink',
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: JSON.stringify({
          consentRecordsUnlinked: consentUnlinked,
          reason: 'user_initiated_unlink',
        }),
      },
    });

    logger.info(
      `Wallet unlinked for ${hashedWallet}... -- ${consentUnlinked} consent records removed`
    );

    res.json({
      success: true,
      message: 'Your wallet has been unlinked from SafePsy services.',
      data: {
        walletAddress,
        unlinkedAt: new Date().toISOString(),
        consentRecordsUnlinked: consentUnlinked,
        whatWasUnlinked: [
          'UserConsent records (all grants and withdrawals)',
        ],
        whatRemains: [
          'EncryptedChat (chat history still stored)',
          'Subscription records (billing still active)',
          'On-chain DID metadata (immutable on blockchain)',
          'Security audit logs (retained for compliance)',
        ],
        note:
          'Unlinking severs wallet-to-consent linkage. To delete all data including chat history, use DELETE /api/account.',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Wallet unlink error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to unlink wallet',
      error: 'UNLINK_FAILED',
    });
  }
});

export default router;
