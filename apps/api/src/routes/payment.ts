import { Router, Request, Response } from 'express';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import logger from '../lib/logger';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { ETHEREUM_MAINNET_CHAIN_ID } from '../lib/constants';
import { stripeService } from '../lib/stripe.service';
import { cryptoPaymentService } from '../lib/crypto-payment.service';
import { subscriptionService } from '../lib/subscription.service';
import { DIDService } from '../lib/did.service';
import { priceOracleService } from '../lib/price-oracle.service';
import { paymentRateLimitMiddleware } from '../lib/ratelimit';
import Stripe from 'stripe';

const router = Router();
const prisma = new PrismaClient();

// Apply strict rate limiting to all payment routes
router.use(paymentRateLimitMiddleware);

/**
 * Validation schema for Stripe checkout
 */
const stripeCheckoutSchema = Joi.object({
  tier: Joi.string().valid('PREMIUM').required(),
  successUrl: Joi.string().uri().optional(),
  cancelUrl: Joi.string().uri().optional(),
});

/**
 * Validation schema for crypto payment
 */
const cryptoPaymentSchema = Joi.object({
  tier: Joi.string().valid('PREMIUM').required(),
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  currency: Joi.string().valid('ETH', 'USDT', 'USDC').default('ETH'),
});

/**
 * POST /api/payment/stripe/checkout
 * Create Stripe checkout session
 */
router.post(
  '/stripe/checkout',
  authenticateWallet,
  validate(stripeCheckoutSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      if (!stripeService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Stripe payment not configured',
        });
      }

      const { tier, successUrl, cancelUrl } = req.body;
      const walletAddress = req.wallet.walletAddress.toLowerCase();

      // Get price ID for tier
      const priceId = process.env.STRIPE_PRICE_ID_PREMIUM || '';
      if (!priceId) {
        return res.status(400).json({
          success: false,
          message: `Price ID not configured for tier ${tier}`,
        });
      }

      // Default URLs
      const defaultSuccessUrl = successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`;

      // Create checkout session
      const session = await stripeService.createCheckoutSession(
        walletAddress,
        priceId,
        defaultSuccessUrl,
        defaultCancelUrl
      );

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          url: session.url,
        },
      });
    } catch (error: any) {
      logger.error('Stripe checkout error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create checkout session',
      });
    }
  }
);

/**
 * POST /api/payment/crypto
 * Process crypto payment
 */
router.post(
  '/crypto',
  authenticateWallet,
  validate(cryptoPaymentSchema),
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
      if (req.wallet.chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Ethereum Mainnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const { tier, txHash, currency = 'ETH' } = req.body;
      const walletAddress = req.wallet.walletAddress.toLowerCase();

      // Get DID token ID
      const didService = DIDService.getInstance();
      let didTokenId: string | null = null;
      if (didService) {
        const didInfo = await didService.getDIDInfo(walletAddress);
        if (didInfo.hasDid && didInfo.tokenId) {
          didTokenId = didInfo.tokenId;
        }
      }

      // Process payment
      await cryptoPaymentService.processPayment(walletAddress, didTokenId, tier, txHash, currency);

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          tier,
          txHash,
        },
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

/**
 * GET /api/payment/subscription
 * Get subscription status
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
 * POST /api/payment/stripe/webhook
 * Handle Stripe webhook events
 * Note: Raw body middleware is applied in index.ts
 */
router.post(
  '/stripe/webhook',
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('Stripe webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!stripeService.isConfigured()) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    try {
      // Get Stripe instance (we need to access it)
      const stripe = (stripeService as any).stripe as Stripe;
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      // Verify webhook signature (req.body is Buffer for raw middleware)
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      // Handle event
      await stripeService.handleWebhook(event);

      res.json({ received: true });
    } catch (error: any) {
      logger.error('Stripe webhook error:', error);
      res.status(400).json({ error: `Webhook Error: ${error.message}` });
    }
  }
);

/**
 * GET /api/payment/pricing
 * Get pricing information (with dynamic ETH price)
 */
router.get('/pricing', async (_req: Request, res: Response) => {
  try {
    // Get dynamic premium pricing
    const premiumPricing = await priceOracleService.getPremiumPricing();
    
    res.json({
      success: true,
      data: {
        tiers: {
          FREE: {
            name: 'Free',
            dailyLimit: 10,
            monthlyLimit: 100,
            price: {
              stripe: null,
              crypto: null,
            },
          },
          PREMIUM: {
            name: 'Premium',
            dailyLimit: 125,
            monthlyLimit: 1250,
            price: {
              amount: premiumPricing.USD,
              currency: 'USD',
              period: premiumPricing.period,
              stripe: process.env.STRIPE_PRICE_PREMIUM || null,
              crypto: {
                ETH: premiumPricing.ETH, // Just the number, no "ETH" suffix
                USDT: premiumPricing.USDT, // Just the number, no "USDT" suffix
                USDC: premiumPricing.USDC, // Just the number, no "USDC" suffix
              },
            },
          },
        },
      },
    });
  } catch (error: any) {
    logger.error('Error getting pricing:', error);
    // Fallback to environment variables on error
    res.json({
      success: true,
      data: {
        tiers: {
          FREE: {
            name: 'Free',
            dailyLimit: 10,
            monthlyLimit: 100,
            price: {
              stripe: null,
              crypto: null,
            },
          },
          PREMIUM: {
            name: 'Premium',
            dailyLimit: 125,
            monthlyLimit: 1250,
            price: {
              amount: 20,
              currency: 'USD',
              period: '30 days',
              stripe: process.env.STRIPE_PRICE_PREMIUM || null,
              crypto: {
                ETH: process.env.CRYPTO_PRICE_PREMIUM_ETH || '0.005714 ETH',
                USDT: process.env.CRYPTO_PRICE_PREMIUM_USDT || '20.00 USDT',
                USDC: process.env.CRYPTO_PRICE_PREMIUM_USDC || '20.00 USDC',
              },
            },
          },
        },
      },
    });
  }
});

export default router;

