import { Request, Response, NextFunction } from 'express';
import { QuotaService } from '../lib/quota.service';
import { AuthenticatedRequest } from './auth';
import { priceOracleService } from '../lib/price-oracle.service';
import logger from '../lib/logger';

/**
 * Quota middleware
 * Checks if the authenticated DID has remaining chat quota
 * Should be used after wallet authentication middleware
 *
 * Production behavior:
 * - If Redis is configured but not connected, blocks requests (fail closed)
 * - If Redis is not configured, allows requests with warning (development mode)
 */
export const quotaMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const quotaService = QuotaService.getInstance();

    // If no wallet is authenticated, skip quota check (allow anonymous usage)
    // You can modify this behavior if you want to require authentication
    if (!req.wallet) {
      logger.debug('No wallet authenticated, skipping quota check');
      next();
      return;
    }

    const walletAddress = req.wallet.walletAddress.toLowerCase();

    // Get DID from wallet address
    const did = await quotaService.getDIDFromWallet(walletAddress);

    // If no DID, skip quota check (allow usage without DID)
    // You can modify this to require DID if needed
    if (!did) {
      logger.debug(`No DID found for wallet ${walletAddress}, skipping quota check`);
      next();
      return;
    }

    // Check if Redis is configured in production
    const isRedisConfigured = quotaService.isRedisConfigured();
    const redisStatus = quotaService.getRedisStatus();

    // In production, if Redis is configured but not ready, fail closed
    if (isRedisConfigured && redisStatus !== 'ready' && process.env.NODE_ENV === 'production') {
      logger.error(`Redis configured but not ready (status: ${redisStatus}). Blocking request to enforce quotas.`);
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Quota service unavailable. Please try again shortly.',
      });
      return;
    }

    // Check if quota is available (pass wallet address for subscription check)
    const canUse = await quotaService.canUseChat(did, walletAddress);

    if (!canUse) {
      const status = await quotaService.getQuotaStatus(did, walletAddress);
      logger.warn(`Quota exceeded for DID ${did}: daily=${status.dailyUsed}/${status.dailyLimit}, monthly=${status.monthlyUsed}/${status.monthlyLimit}`);

      // Get pricing information for paywall (dynamic ETH price)
      const premiumPricing = await priceOracleService.getPremiumPricing();
      const pricing = {
        PREMIUM: {
          crypto: {
            ETH: premiumPricing.ETH,
            USDT: premiumPricing.USDT,
            USDC: premiumPricing.USDC,
          },
        },
      };

      res.status(429).json({
        success: false,
        error: 'QUOTA_EXCEEDED',
        message: 'Chat quota exceeded. Upgrade to Premium to continue.',
        quota: {
          dailyUsed: status.dailyUsed,
          dailyLimit: status.dailyLimit,
          monthlyUsed: status.monthlyUsed,
          monthlyLimit: status.monthlyLimit,
          resetDailyAt: status.resetDailyAt,
          resetMonthlyAt: status.resetMonthlyAt,
        },
        paywall: {
          showPaywall: true,
          pricing,
          paymentRecipient: process.env.CRYPTO_PAYMENT_CONTRACT_ADDRESS || null,
        },
      });
      return;
    }

    // Attach quota info to request for later use
    req.quota = {
      did,
      service: quotaService,
    };

    next();
  } catch (error) {
    logger.error('Quota middleware error:', error);
    // In production with Redis configured, fail closed on errors
    if (process.env.NODE_ENV === 'production') {
      const quotaService = QuotaService.getInstance();
      if (quotaService.isRedisConfigured()) {
        logger.error('Quota check failed with Redis configured. Blocking request.');
        res.status(503).json({
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message: 'Quota service unavailable. Please try again shortly.',
        });
        return;
      }
    }
    // Fail open in development or when Redis is not configured
    next();
  }
};

/**
 * Optional quota middleware - checks quota but allows request to continue if check fails
 * Note: In production with Redis configured, still enforces quotas strictly
 */
export const optionalQuotaMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const quotaService = QuotaService.getInstance();

    // Guest mode: explicit client flag — do not attach DID quota (no billing linkage).
    const body = req.body as { mode?: string } | undefined;
    if (body?.mode === 'guest') {
      next();
      return;
    }

    if (!req.wallet) {
      next();
      return;
    }

    const walletAddress = req.wallet.walletAddress.toLowerCase();
    const did = await quotaService.getDIDFromWallet(walletAddress);

    if (!did) {
      next();
      return;
    }

    // Check Redis status in production
    const isRedisConfigured = quotaService.isRedisConfigured();
    const redisStatus = quotaService.getRedisStatus();

    // In production, if Redis is configured but not ready, fail closed
    if (isRedisConfigured && redisStatus !== 'ready' && process.env.NODE_ENV === 'production') {
      logger.error(`Redis configured but not ready (status: ${redisStatus}). Blocking request.`);
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Quota service unavailable. Please try again shortly.',
      });
      return;
    }

    const canUse = await quotaService.canUseChat(did);
    if (canUse) {
      req.quota = {
        did,
        service: quotaService,
      };
    } else {
      logger.warn(`Quota exceeded for DID ${did}, but allowing request (optional middleware)`);
    }

    next();
  } catch (error) {
    logger.error('Optional quota middleware error:', error);
    // In production with Redis configured, fail closed on errors
    if (process.env.NODE_ENV === 'production') {
      const quotaService = QuotaService.getInstance();
      if (quotaService.isRedisConfigured()) {
        logger.error('Quota check failed with Redis configured. Blocking request.');
        res.status(503).json({
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message: 'Quota service unavailable. Please try again shortly.',
        });
        return;
      }
    }
    next();
  }
};

// Extend AuthenticatedRequest to include quota info
declare global {
  namespace Express {
    interface Request {
      quota?: {
        did: string;
        service: QuotaService;
      };
    }
  }
}

