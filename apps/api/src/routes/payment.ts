import { Router, Request, Response } from 'express';
import logger from '../lib/logger';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { getAllPlans } from '../lib/subscription-config';
import { subscriptionService } from '../lib/subscription.service';
import { cryptoPaymentService } from '../lib/crypto-payment.service';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';
import { paymentRateLimitMiddleware } from '../lib/ratelimit';

const router = Router();
router.use(paymentRateLimitMiddleware);

/**
 * GET /api/payment/subscription
 * Get subscription status (legacy endpoint — delegates to subscription service).
 * Kept for backwards compatibility. New code should use /api/subscription/me.
 */
router.get(
  '/subscription',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();
      const subscription = await subscriptionService.getOrCreateSubscription(walletAddress);

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error: any) {
      logger.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription',
      });
    }
  }
);

/**
 * GET /api/payment/pricing
 * Get pricing information (legacy endpoint — returns all plans from config).
 * Kept for backwards compatibility. New code should use /api/subscription/plans.
 */
router.get('/pricing', async (_req: Request, res: Response) => {
  try {
    const plansResponse = getAllPlans();

    // Legacy format: tiers object with FREE and Premium keys (for backwards compat)
    // New clients should use the top-level plans/prices fields.
    res.json({
      success: true,
      data: {
        tiers: {
          FREE: {
            name: 'Free',
            dailyLimit: plansResponse.plans.find((p) => p.id === 'free')?.quotas.daily ?? 10,
            weeklyLimit: plansResponse.plans.find((p) => p.id === 'free')?.quotas.weekly ?? 50,
            monthlyLimit: plansResponse.plans.find((p) => p.id === 'free')?.quotas.monthly ?? 100,
            price: {
              crypto: null,
            },
          },
          PRO: {
            name: 'Pro',
            dailyLimit: plansResponse.plans.find((p) => p.id === 'pro')?.quotas.daily ?? 50,
            weeklyLimit: plansResponse.plans.find((p) => p.id === 'pro')?.quotas.weekly ?? 250,
            monthlyLimit: plansResponse.plans.find((p) => p.id === 'pro')?.quotas.monthly ?? 800,
            price: {
              amount: 19,
              currency: 'USD',
              period: 'month',
              crypto: {
                ETH: 'dynamic',
                USDT: 'dynamic',
                USDC: 'dynamic',
              },
            },
          },
          UNLIMITED: {
            name: 'Unlimited',
            dailyLimit: plansResponse.plans.find((p) => p.id === 'unlimited')?.quotas.daily ?? 350,
            weeklyLimit: plansResponse.plans.find((p) => p.id === 'unlimited')?.quotas.weekly ?? 2000,
            monthlyLimit: plansResponse.plans.find((p) => p.id === 'unlimited')?.quotas.monthly ?? 8000,
            price: {
              amount: 79,
              currency: 'USD',
              period: 'month',
              crypto: {
                ETH: 'dynamic',
                USDT: 'dynamic',
                USDC: 'dynamic',
              },
            },
          },
        },
        plans: plansResponse.plans,
        prices: plansResponse.prices,
        paywallPromptThreshold: plansResponse.paywallPromptThreshold,
      },
    });
  } catch (error: any) {
    logger.error('Error getting pricing:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pricing',
    });
  }
});

/**
 * POST /api/payment/crypto
 * Legacy crypto payment endpoint — forwards to new payment intent flow.
 * DEPRECATED: Use /api/subscription/payment/create + /verify instead.
 */
router.post(
  '/crypto',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      if (!cryptoPaymentService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Crypto payment not configured',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      // This endpoint is deprecated. Return error directing to new flow.
      res.status(410).json({
        success: false,
        error: 'DEPRECATED',
        message: 'Use POST /api/subscription/payment/create then POST /api/subscription/payment/verify',
      });
    } catch (error: any) {
      logger.error('Crypto payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process payment',
      });
    }
  }
);

export default router;