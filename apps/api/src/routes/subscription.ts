import { Router, Request, Response } from 'express';
import Joi from 'joi';
import logger from '../lib/logger';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  getPlanDefinitions,
  getAllPlans,
  getExpectedPriceCents,
  isValidPlanPlanId,
  isValidBillingPeriod,
} from '../lib/subscription-config';
import { subscriptionService } from '../lib/subscription.service';
import { cryptoPaymentService } from '../lib/crypto-payment.service';
import { QuotaService } from '../lib/quota.service';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';
import { paymentRateLimitMiddleware } from '../lib/ratelimit';
import { prisma } from '../lib/prisma';
import { PaymentStatus } from '@prisma/client';

const router = Router();

router.use(paymentRateLimitMiddleware);

// ─── Validation schemas ──────────────────────────────────────────────────────

const paymentIntentSchema = Joi.object({
  plan: Joi.string().valid('pro', 'unlimited').required(),
  billingPeriod: Joi.string().valid('monthly', 'yearly').required(),
});

const paymentVerifySchema = Joi.object({
  paymentId: Joi.string().required(),
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  senderAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
});

// ─── GET /api/subscription/plans ─────────────────────────────────────────────

router.get('/plans', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: getAllPlans(),
    });
  } catch (error: any) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch plans',
    });
  }
});

// ─── GET /api/subscription/me ────────────────────────────────────────────────

router.get(
  '/me',
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
      const prismaPlan = await subscriptionService.resolvePlan(walletAddress);
      const plan = prismaPlan.toLowerCase() as import('../lib/subscription-config').PlanId;
      const usageCounts = await subscriptionService.getUsageCounts(walletAddress);
      const quotas = (await import('../lib/subscription-config')).getQuotas(plan);
      const quotaService = QuotaService.getInstance();
      const quotaStatus = await quotaService.getQuotaStatus(walletAddress);

      res.json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            startedAt: subscription.startedAt?.toISOString() ?? null,
            expiresAt: subscription.expiresAt?.toISOString() ?? null,
            cryptoPaymentTxHash: subscription.cryptoPaymentTxHash,
          },
          effectivePlan: plan,
          usage: {
            daily: { used: usageCounts.daily, limit: quotas.daily, remaining: Math.max(0, quotas.daily - usageCounts.daily) },
            weekly: { used: usageCounts.weekly, limit: quotas.weekly, remaining: Math.max(0, quotas.weekly - usageCounts.weekly) },
            monthly: { used: usageCounts.monthly, limit: quotas.monthly, remaining: Math.max(0, quotas.monthly - usageCounts.monthly) },
          },
          quotaStatus: {
            canUse: quotaStatus.canUse,
            plan: quotaStatus.plan,
            dailyUsed: quotaStatus.dailyUsed,
            dailyLimit: quotaStatus.dailyLimit,
            weeklyUsed: quotaStatus.weeklyUsed,
            weeklyLimit: quotaStatus.weeklyLimit,
            monthlyUsed: quotaStatus.monthlyUsed,
            monthlyLimit: quotaStatus.monthlyLimit,
          },
        },
      });
    } catch (error: any) {
      logger.error('Get subscription me error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch subscription',
      });
    }
  }
);

// ─── GET /api/subscription/usage ─────────────────────────────────────────────

router.get(
  '/usage',
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
      const prismaPlan = await subscriptionService.resolvePlan(walletAddress);
      const plan = prismaPlan.toLowerCase() as import('../lib/subscription-config').PlanId;
      const usageCounts = await subscriptionService.getUsageCounts(walletAddress);
      const quotas = (await import('../lib/subscription-config')).getQuotas(plan);

      res.json({
        success: true,
        data: {
          plan,
          usage: {
            daily: { used: usageCounts.daily, limit: quotas.daily, remaining: Math.max(0, quotas.daily - usageCounts.daily) },
            weekly: { used: usageCounts.weekly, limit: quotas.weekly, remaining: Math.max(0, quotas.weekly - usageCounts.weekly) },
            monthly: { used: usageCounts.monthly, limit: quotas.monthly, remaining: Math.max(0, quotas.monthly - usageCounts.monthly) },
          },
        },
      });
    } catch (error: any) {
      logger.error('Get subscription usage error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch usage',
      });
    }
  }
);

// ─── POST /api/subscription/payment/create ───────────────────────────────────

router.post(
  '/payment/create',
  authenticateWallet,
  validate(paymentIntentSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
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

      const { plan, billingPeriod } = req.body;
      const walletAddress = req.wallet.walletAddress.toLowerCase();

      // Verify plan + billing period are valid
      if (!isValidPlanPlanId(plan)) {
        return res.status(400).json({
          success: false,
          message: `Invalid plan: ${plan}`,
          error: 'INVALID_PLAN',
        });
      }
      if (!isValidBillingPeriod(billingPeriod)) {
        return res.status(400).json({
          success: false,
          message: `Invalid billing period: ${billingPeriod}`,
          error: 'INVALID_BILLING_PERIOD',
        });
      }

      // Create payment intent with backend-determined price
      const intent = await cryptoPaymentService.createPaymentIntent(walletAddress, {
        plan,
        billingPeriod,
      });

      res.json({
        success: true,
        data: {
          paymentId: intent.paymentId,
          plan: intent.plan,
          billingPeriod: intent.billingPeriod,
          amountCents: intent.amountCents,
          currency: intent.currency,
          chainId: intent.chainId,
          treasuryAddress: intent.treasuryAddress,
          expiresAt: intent.expiresAt.toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Create payment intent error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create payment intent',
      });
    }
  }
);

// ─── POST /api/subscription/payment/verify ───────────────────────────────────

router.post(
  '/payment/verify',
  authenticateWallet,
  validate(paymentVerifySchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
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

      const { paymentId, txHash, senderAddress } = req.body;
      const authenticatedWalletAddress = req.wallet.walletAddress.toLowerCase();

      const result = await cryptoPaymentService.verifyPayment(
        { paymentId, txHash, senderAddress },
        authenticatedWalletAddress
      );

      res.json({
        success: true,
        data: {
          paymentId: result.paymentId,
          subscriptionId: result.subscriptionId,
          plan: result.plan,
          billingPeriod: result.billingPeriod,
          status: result.status,
          expiresAt: result.expiresAt.toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Verify payment error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Payment verification failed',
        error: error.code || 'PAYMENT_VERIFICATION_FAILED',
      });
    }
  }
);

// ─── GET /api/subscription/payments ──────────────────────────────────────────
// Returns the authenticated user's payment history (last 20, newest first).

router.get(
  '/payments',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const payments = await prisma.payment.findMany({
        where: {
          walletAddress: req.wallet!.walletAddress,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          plan: true,
          billingPeriod: true,
          amountCents: true,
          currency: true,
          chainId: true,
          status: true,
          cryptoTxHash: true,
          createdAt: true,
          confirmedAt: true,
          paymentIntentId: true,
        },
      });

      res.json({
        success: true,
        data: payments.map((p: { id: string; plan: string; billingPeriod: string; amountCents: number; currency: string; chainId: number; status: PaymentStatus; cryptoTxHash: string | null; createdAt: Date; confirmedAt: Date | null; paymentIntentId: string | null }) => ({
          id: p.id,
          plan: p.plan,
          billingPeriod: p.billingPeriod,
          amountCents: p.amountCents,
          currency: p.currency,
          chainId: p.chainId,
          status: p.status,
          txHash: p.cryptoTxHash,
          createdAt: p.createdAt.toISOString(),
          confirmedAt: p.confirmedAt?.toISOString() ?? null,
          paymentIntentId: p.paymentIntentId,
        })),
      });
    } catch (error: any) {
      logger.error('Fetch payment history error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch payment history',
      });
    }
  }
);

export default router;