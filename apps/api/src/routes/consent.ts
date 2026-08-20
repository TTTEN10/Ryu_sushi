/**
 * Consent Routes — GDPR Art. 7 compliance
 *
 * Endpoints for recording, querying, and withdrawing user consent.
 * Auth: Required (wallet session)
 * Rate limited: Yes (stricter limits on write operations)
 *
 * Consent types:
 *   - HEALTH_DATA_PROCESSING (GDPR Art. 9(2)(a))
 *   - ANALYTICS
 *   - MARKETING
 *
 * Consent versions are tied to legal document versions at consent time.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { walletAuthRateLimitMiddleware } from '../lib/ratelimit';
import logger from '../lib/logger';
import { ethers } from 'ethers';
import Joi from 'joi';

const router = Router();

// Rate limit all consent routes (destructive operations)
router.use(walletAuthRateLimitMiddleware);
router.use(authenticateWallet);

/** Consent version currently in effect */
const CURRENT_CONSENT_VERSION = '1.0';

/** Hash of the canonical consent text for audit verification */
function consentTextHash(): string {
  const text = `SafePsy Privacy Policy v${CURRENT_CONSENT_VERSION} — Consent text hash`;
  return ethers.keccak256(ethers.toUtf8Bytes(text));
}

// ─── Validation schemas ───────────────────────────────────────────────

const recordConsentSchema = Joi.object({
  consentType: Joi.string()
    .valid('HEALTH_DATA_PROCESSING', 'ANALYTICS', 'MARKETING')
    .required(),
  consentVersion: Joi.string().max(20).optional().default(CURRENT_CONSENT_VERSION),
  source: Joi.string()
    .valid('WEB_COOKIE_BANNER', 'MOBILE', 'EMAIL_SUBSCRIPTION')
    .optional()
    .default('WEB_COOKIE_BANNER'),
});

const withdrawConsentSchema = Joi.object({
  consentType: Joi.string()
    .valid('HEALTH_DATA_PROCESSING', 'ANALYTICS', 'MARKETING')
    .required(),
});

// ─── GET /api/consent/status ──────────────────────────────────────────

/**
 * Returns all consent records and current consent status for the authenticated wallet.
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.wallet) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    }

    const walletAddress = req.wallet.walletAddress.toLowerCase();

    // Fetch all consent records for this wallet, ordered newest first
    const records = await prisma.userConsent.findMany({
      where: { walletAddress },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        consentType: true,
        consentVersion: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        withdrawnAt: true,
      },
    });

    // Build a status map: latest record per consent type
    const statusMap: Record<string, { status: string; version: string; updatedAt: string }> = {};
    for (const record of records) {
      if (!statusMap[record.consentType]) {
        statusMap[record.consentType] = {
          status: record.status,
          version: record.consentVersion,
          updatedAt: record.updatedAt.toISOString(),
        };
      }
    }

    // Check if any consent has expired (older than 1 year, need re-consent)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    res.json({
      success: true,
      data: {
        currentVersion: CURRENT_CONSENT_VERSION,
        consentStatus: {
          healthDataProcessing: statusMap.HEALTH_DATA_PROCESSING || {
            status: 'PENDING',
            version: CURRENT_CONSENT_VERSION,
            updatedAt: null,
          },
          analytics: statusMap.ANALYTICS || {
            status: 'PENDING',
            version: CURRENT_CONSENT_VERSION,
            updatedAt: null,
          },
          marketing: statusMap.MARKETING || {
            status: 'PENDING',
            version: CURRENT_CONSENT_VERSION,
            updatedAt: null,
          },
        },
        records,
        reConsentNeeded: records.some(
          (r) =>
            r.status === 'GRANTED' && r.createdAt < oneYearAgo
        ),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Consent status error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve consent status',
      error: 'STATUS_ERROR',
    });
  }
});

// ─── POST /api/consent/record ─────────────────────────────────────────

/**
 * Records a new consent grant. Idempotent — if a record already exists
 * for the same wallet + type + version, it returns the existing record.
 */
router.post('/record', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.wallet) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    }

    const { value: parsed, error } = recordConsentSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consent data',
        error: 'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }
    const walletAddress = req.wallet.walletAddress.toLowerCase();
    const { consentType, consentVersion, source } = parsed;

    // Hash the consent text for audit trail
    const ctHash = consentTextHash();

    try {
      await prisma.userConsent.create({
        data: {
          walletAddress,
          consentType,
          consentVersion,
          consentTextHash: ctHash,
          status: 'GRANTED',
          source,
          ipAddressHash: req.ip ? ethers.keccak256(ethers.toUtf8Bytes(req.ip)).substring(0, 16) : null,
          userAgent: req.headers['user-agent'] || null,
        },
      });
    } catch (prismaError: unknown) {
      // Unique constraint violation means consent already recorded for this type+version
      const code = (prismaError as { code?: string }).code;
      if (code === 'P2002') {
        // Already granted — update status in case it was withdrawn before
        await prisma.userConsent.updateMany({
          where: {
            walletAddress,
            consentType,
            consentVersion,
          },
          data: { status: 'GRANTED' },
        });
      } else {
        throw prismaError;
      }
    }

    const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);
    logger.info(`Consent recorded: ${consentType} for wallet ${hashedWallet}... (version ${consentVersion})`);

    // Log to security audit log
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'CONSENT_GRANTED',
        actor: walletAddress.substring(0, 10) + '...',
        resource: `/api/consent/record/${consentType}`,
        success: true,
        ipAddress: null,
        userAgent: req.headers['user-agent'] || null,
        details: JSON.stringify({
          consentType,
          consentVersion,
          source,
          walletHash: hashedWallet,
        }),
      },
    });

    res.json({
      success: true,
      data: {
        consentType,
        consentVersion,
        status: 'GRANTED',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Consent record error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to record consent',
      error: 'RECORD_ERROR',
    });
  }
});

// ─── POST /api/consent/withdraw ───────────────────────────────────────

/**
 * Withdraws consent for a specific type. Creates a new record with
 * WITHDRAWN status and sets withdrawnAt timestamp.
 */
router.post('/withdraw', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.wallet) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    }

    const { value: parsed, error } = withdrawConsentSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal request',
        error: 'VALIDATION_ERROR',
        details: error.details.map((d) => d.message),
      });
    }
    const walletAddress = req.wallet.walletAddress.toLowerCase();
    const { consentType } = parsed;

    // Create new withdrawn record (maintains full history)
    await prisma.userConsent.create({
      data: {
        walletAddress,
        consentType,
        consentVersion: CURRENT_CONSENT_VERSION,
        consentTextHash: consentTextHash(),
        status: 'WITHDRAWN',
        source: 'WEB_COOKIE_BANNER',
        ipAddressHash: req.ip ? ethers.keccak256(ethers.toUtf8Bytes(req.ip)).substring(0, 16) : null,
        userAgent: req.headers['user-agent'] || null,
        withdrawnAt: new Date(),
      },
    });

    const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);
    logger.info(`Consent withdrawn: ${consentType} for wallet ${hashedWallet}...`);

    // Log to security audit log
    await prisma.securityAuditLog.create({
      data: {
        eventType: 'CONSENT_WITHDRAWN',
        actor: walletAddress.substring(0, 10) + '...',
        resource: `/api/consent/withdraw/${consentType}`,
        success: true,
        ipAddress: null,
        userAgent: req.headers['user-agent'] || null,
        details: JSON.stringify({
          consentType,
          walletHash: hashedWallet,
          withdrawnAt: new Date().toISOString(),
        }),
      },
    });

    res.json({
      success: true,
      data: {
        consentType,
        status: 'WITHDRAWN',
        withdrawnAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Consent withdrawal error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw consent',
      error: 'WITHDRAW_ERROR',
    });
  }
});

export default router;