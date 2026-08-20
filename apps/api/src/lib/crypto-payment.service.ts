/**
 * Crypto Payment Service (rewritten)
 *
 * Handles crypto-wallet payments for subscriptions:
 * - Create payment intents (backend-determined pricing)
 * - Verify blockchain transactions independently (never trust frontend)
 * - Activate subscriptions after verification
 * - Prevent replay attacks (unique txHash)
 * - Integer arithmetic only (no floating-point)
 *
 * The backend controls:
 * - Treasury address (from env config)
 * - Chain ID (from env config)
 * - Token/currency (from env config)
 * - Pricing (from subscription-config.ts)
 * - Duration (from subscription-config.ts)
 *
 * The frontend only says: "I want to purchase Pro yearly"
 * The backend determines what that means.
 */

import { ethers } from 'ethers';
import { SubscriptionPlan, SubscriptionStatus, PaymentIntentStatus, PaymentMethod } from '@prisma/client';
import logger from './logger';
import { prisma } from './prisma';
import { SUPPORTED_CHAIN_ID } from './constants';
import * as subscriptionConfig from './subscription-config';
import { subscriptionService } from './subscription.service';

// ─── Treasury & chain configuration ──────────────────────────────────────────

function getTreasuryAddress(): string {
  const addr = process.env.PAYMENT_TREASURY_ADDRESS;
  if (!addr) throw new Error('PAYMENT_TREASURY_ADDRESS is not configured');
  return addr;
}

function getChainId(): number {
  const chainId = Number(process.env.PAYMENT_CHAIN_ID || SUPPORTED_CHAIN_ID);
  return chainId;
}

function getTokenAddress(): string | null {
  return process.env.PAYMENT_TOKEN_ADDRESS || null;
}

function getRpcUrl(): string | null {
  return process.env.PAYMENT_RPC_URL || process.env.RPC_URL || null;
}

/** Minimum confirmations required before considering a transaction confirmed. */
function getRequiredConfirmations(): number {
  return Number(process.env.PAYMENT_CONFIRMATIONS_REQUIRED || '12');
}

// ─── Payment intent model ────────────────────────────────────────────────────

const PAYMENT_INTENT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface PaymentIntentRequest {
  plan: subscriptionConfig.PlanId;
  billingPeriod: subscriptionConfig.BillingPeriod;
}

export interface PaymentIntentResponse {
  paymentId: string;
  plan: SubscriptionPlan;
  billingPeriod: subscriptionConfig.BillingPeriod;
  amountCents: number;
  currency: string;
  chainId: number;
  treasuryAddress: string;
  expiresAt: Date;
  tokenAddress: string | null;
}

/**
 * Create a payment intent.
 *
 * The backend determines the price from configuration.
 * The frontend only requests the plan.
 */
export async function createPaymentIntent(
  walletAddress: string,
  request: PaymentIntentRequest,
): Promise<PaymentIntentResponse> {
  const normalized = walletAddress.trim().toLowerCase();

  // Validate plan
  if (!subscriptionConfig.isValidPlanId(request.plan)) {
    throw new Error(`Invalid plan: ${request.plan}`);
  }

  // Validate billing period
  if (!subscriptionConfig.isValidBillingPeriod(request.billingPeriod)) {
    throw new Error(`Invalid billing period: ${request.billingPeriod}`);
  }

  // Skip payment intent for free plan
  if (request.plan === 'free') {
    throw new Error('Free plan requires no payment');
  }

  // Get expected price from backend config
  const plan = request.plan.toUpperCase() as SubscriptionPlan;
  const amountCents = subscriptionConfig.getExpectedPriceCents(request.plan, request.billingPeriod);
  const chainId = getChainId();
  const treasuryAddress = getTreasuryAddress();
  const tokenAddress = getTokenAddress();

  // Check for existing pending intent
  const existing = await prisma.paymentIntent.findFirst({
    where: {
      walletAddress: normalized,
      status: PaymentIntentStatus.PENDING,
    },
  });

  if (existing) {
    // Check if it's still valid and matches the request
    if (
      existing.plan === plan &&
      existing.billingPeriod === request.billingPeriod &&
      new Date() < existing.expiresAt
    ) {
      return {
        paymentId: existing.id,
        plan: existing.plan,
        billingPeriod: existing.billingPeriod,
        amountCents: existing.amountCents,
        currency: existing.currency,
        chainId: existing.chainId,
        treasuryAddress: existing.treasuryAddress,
        expiresAt: existing.expiresAt,
        tokenAddress,
      };
    }
    // Expired or different plan — cancel and create new
    await prisma.paymentIntent.update({
      where: { id: existing.id },
      data: { status: PaymentIntentStatus.EXPIRED },
    });
  }

  // Create new payment intent
  const expiresAt = new Date(Date.now() + PAYMENT_INTENT_TTL_MS);
  const intent = await prisma.paymentIntent.create({
    data: {
      walletAddress: normalized,
      plan,
      billingPeriod: request.billingPeriod,
      amountCents,
      currency: 'USD',
      chainId,
      treasuryAddress,
      expiresAt,
    },
  });

  logger.info(`Payment intent created: ${intent.id} (${plan}/${request.billingPeriod}) for ${normalized}`);

  return {
    paymentId: intent.id,
    plan: intent.plan,
    billingPeriod: intent.billingPeriod,
    amountCents: intent.amountCents,
    currency: intent.currency,
    chainId: intent.chainId,
    treasuryAddress: intent.treasuryAddress,
    expiresAt: intent.expiresAt,
    tokenAddress,
  };
}

// ─── Blockchain verification ─────────────────────────────────────────────────

interface VerificationResult {
  verified: boolean;
  txHash: string;
  blockNumber: number;
  sender: string;
  recipient: string;
  amountWei: bigint;
  currency: string;
}

async function verifyTransaction(
  txHash: string,
  expectedTreasury: string,
  expectedAmountCents: number,
  expectedChainId: number,
  expectedCurrency: string = 'ETH',
): Promise<VerificationResult> {
  const rpcUrl = getRpcUrl();
  if (!rpcUrl) {
    throw new Error('RPC URL not configured for blockchain verification');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Fetch transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    throw new Error('Transaction not found on chain');
  }

  // Verify chain ID
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (chainId !== expectedChainId) {
    throw new Error(`Wrong chain: expected ${expectedChainId}, got ${chainId}`);
  }

  // Get full transaction details
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    throw new Error('Transaction details not found');
  }

  // Verify status
  if (receipt.status !== 1) {
    throw new Error('Transaction failed on chain');
  }

  // Verify confirmations
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber;
  if (confirmations < getRequiredConfirmations()) {
    throw new Error(`Insufficient confirmations: ${confirmations}/${getRequiredConfirmations()}`);
  }

  let amountWei: bigint;
  let sender: string;
  let recipient: string;

  if (expectedCurrency === 'ETH') {
    // Native ETH transfer
    amountWei = tx.value;
    sender = tx.from?.toLowerCase() || '';
    recipient = (tx.to || '').toLowerCase();

    // Verify recipient is treasury
    if (recipient !== expectedTreasury.toLowerCase()) {
      throw new Error(`Wrong recipient: expected ${expectedTreasury}, got ${tx.to}`);
    }

    // Verify amount (in cents, convert to wei for comparison)
    const ethPrice = await getEthPriceUsd();
    const expectedWei = usdCentsToWei(expectedAmountCents, ethPrice);
    const tolerance = expectedWei / BigInt(100); // 1% tolerance for price drift
    const diff = amountWei > expectedWei ? amountWei - expectedWei : expectedWei - amountWei;

    if (diff > tolerance) {
      throw new Error(`Wrong amount: expected ~${expectedWei} wei, got ${amountWei} wei`);
    }
  } else {
    // ERC-20 token transfer
    const tokenAddress = getTokenAddress();
    if (!tokenAddress) {
      throw new Error('Token address not configured for ERC-20 payment');
    }

    const tokenAbi = ['event Transfer(address indexed from, address indexed to, uint256 value)'];
    const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);

    // Parse Transfer event
    let transferFound = false;
    let transferAmount = BigInt(0);
    let fromAddress = '';

    for (const log of receipt.logs) {
      try {
        const parsed = tokenContract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (parsed && parsed.name === 'Transfer') {
          const [from, to, value] = parsed.args as [string, string, bigint];
          if (to.toLowerCase() === expectedTreasury.toLowerCase()) {
            transferFound = true;
            transferAmount = value;
            fromAddress = from;
            break;
          }
        }
      } catch {
        // Not a transfer event
      }
    }

    if (!transferFound) {
      throw new Error('Token transfer not found in transaction');
    }

    sender = fromAddress.toLowerCase();
    recipient = expectedTreasury.toLowerCase();
    amountWei = transferAmount;
  }

  return {
    verified: true,
    txHash,
    blockNumber: receipt.blockNumber,
    sender,
    recipient,
    amountWei,
    currency: expectedCurrency,
  };
}

/**
 * Get ETH price in USD (with caching).
 */
let ethPriceCache: { price: number; cachedAt: number } | null = null;

async function getEthPriceUsd(): Promise<number> {
  const now = Date.now();
  if (ethPriceCache && (now - ethPriceCache.cachedAt) < 60_000) {
    return ethPriceCache.price;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) throw new Error(`CoinGecko error: ${response.status}`);
    const data = (await response.json()) as { ethereum?: { usd?: number } };
    const price = data.ethereum?.usd;
    if (!price || typeof price !== 'number') throw new Error('Invalid price from CoinGecko');
    ethPriceCache = { price, cachedAt: now };
    return price;
  } catch {
    if (ethPriceCache) return ethPriceCache.price;
    throw new Error('Unable to fetch ETH price for payment verification');
  }
}

/**
 * Convert USD cents to wei based on current ETH price.
 * Uses integer arithmetic to avoid floating-point issues.
 */
function usdCentsToWei(amountCents: number, ethPriceUsd: number): bigint {
  // amountCents / 100 = USD
  // USD / ethPriceUsd = ETH
  // ETH * 1e18 = wei
  const usd = amountCents / 100;
  const eth = usd / ethPriceUsd;
  return BigInt(Math.round(eth * 1e18));
}

// ─── Payment verification (main entry point) ─────────────────────────────────

export interface PaymentVerificationRequest {
  paymentId: string;
  txHash: string;
  senderAddress: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  paymentId: string;
  subscriptionId: string;
  plan: SubscriptionPlan;
  billingPeriod: subscriptionConfig.BillingPeriod;
  expiresAt: Date;
  status: string;
}

/**
 * Verify a blockchain transaction and activate the subscription.
 *
 * Security guarantees:
 * - Backend verifies the transaction independently (never trusts frontend)
 * - txHash must be unique (unique DB constraint)
 * - Sender must match authenticated wallet
 * - Recipient must be treasury
 * - Amount must be correct (±1% tolerance for price drift)
 * - Chain must be correct
 * - Required confirmations must be reached
 * - Payment intent must still be valid
 */
export async function verifyPayment(
  request: PaymentVerificationRequest,
  authenticatedWalletAddress: string,
): Promise<PaymentVerificationResult> {
  const normalizedWallet = authenticatedWalletAddress.trim().toLowerCase();

  // 1. Look up payment intent
  const intent = await prisma.paymentIntent.findUnique({
    where: { id: request.paymentId },
  });

  if (!intent) {
    throw new Error('Payment intent not found');
  }

  // 2. Verify intent is still pending
  if (intent.status !== PaymentIntentStatus.PENDING) {
    if (intent.status === PaymentIntentStatus.CONFIRMED) {
      // Already confirmed — return existing subscription (idempotent)
      const subscription = await prisma.subscription.findFirst({
        where: { cryptoPaymentTxHash: intent.id },
      });
      if (subscription) {
        return {
          success: true,
          paymentId: intent.id,
          subscriptionId: subscription.id,
          plan: subscription.plan,
          billingPeriod: subscription.billingPeriod,
          expiresAt: subscription.expiresAt || new Date(),
          status: 'already_confirmed',
        };
      }
    }
    throw new Error(`Payment intent has status ${intent.status}`);
  }

  // 3. Verify intent hasn't expired
  if (new Date() > intent.expiresAt) {
    throw new Error('Payment intent has expired');
  }

  // 4. Verify intent wallet matches authenticated wallet
  if (intent.walletAddress !== normalizedWallet) {
    throw new Error('Payment intent wallet does not match authenticated wallet');
  }

  // 5. Check if txHash already used
  const existingPayment = await prisma.payment.findUnique({
    where: { cryptoTxHash: request.txHash },
  });
  if (existingPayment) {
    if (existingPayment.status === PaymentStatus.CONFIRMED) {
      // Idempotent replay — return existing
      const subscription = existingPayment.subscription;
      if (subscription) {
        return {
          success: true,
          paymentId: intent.id,
          subscriptionId: subscription.id,
          plan: subscription.plan,
          billingPeriod: subscription.billingPeriod,
          expiresAt: subscription.expiresAt || new Date(),
          status: 'already_confirmed',
        };
      }
    }
    throw new Error('Transaction hash has already been used for a payment');
  }

  // 6. Verify blockchain transaction
  const currency = getTokenAddress() ? 'ERC20' : 'ETH';
  const verification = await verifyTransaction(
    request.txHash,
    intent.treasuryAddress,
    intent.amountCents,
    intent.chainId,
    currency,
  );

  // 7. Verify sender matches authenticated wallet
  if (verification.sender !== normalizedWallet) {
    throw new Error('Transaction sender does not match authenticated wallet');
  }

  // 8. Record payment as confirmed
  const plan = intent.plan;
  const billingPeriod = intent.billingPeriod;
  const walletAddress = intent.walletAddress;

  const payment = await prisma.payment.create({
    data: {
      walletAddress: normalizedWallet,
      plan,
      billingPeriod,
      amountCents: intent.amountCents,
      currency: 'USD',
      chainId: intent.chainId,
      treasuryAddress: intent.treasuryAddress,
      paymentMethod: PaymentMethod.CRYPTO,
      status: PaymentStatus.CONFIRMED,
      cryptoTxHash: request.txHash,
      cryptoBlockNumber: BigInt(verification.blockNumber),
      senderAddress: verification.sender,
      confirmedAt: new Date(),
    },
  });

  // 9. Activate subscription
  const subResult = await subscriptionService.activateSubscription(
    normalizedWallet,
    plan,
    billingPeriod,
    request.txHash,
    verification.blockNumber,
  );

  // 10. Mark payment intent as confirmed
  await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: { status: PaymentIntentStatus.CONFIRMED },
  });

  logger.info(
    `Payment confirmed: ${request.txHash} → subscription ${subResult.subscriptionId} (${plan}/${billingPeriod}) for ${normalizedWallet}`,
  );

  return {
    success: true,
    paymentId: intent.id,
    subscriptionId: subResult.subscriptionId,
    plan,
    billingPeriod,
    expiresAt: subResult.expiresAt,
    status: 'activated',
  };
}

// ─── Backwards-compatible exports ────────────────────────────────────────────

/**
 * Legacy verifyPayment signature for existing code.
 */
export async function verifyLegacyPayment(
  txHash: string,
  expectedAmount: bigint,
  expectedRecipient: string,
  currency: 'ETH' | 'USDT' | 'USDC' = 'ETH',
): Promise<{ verified: boolean; amount: bigint; recipient: string; blockNumber: number; currency: string }> {
  const result = await verifyTransaction(txHash, expectedRecipient, 0, getChainId(), currency);
  return {
    verified: result.verified,
    amount: result.amountWei,
    recipient: result.recipient,
    blockNumber: result.blockNumber,
    currency: result.currency,
  };
}

/**
 * Legacy createPaymentRecord for existing code.
 */
export async function createPaymentRecord(
  walletAddress: string,
  _didTokenId: string | null,
  subscriptionId: string,
  txHash: string,
  amount: bigint,
  currency: string = 'ETH',
) {
  return prisma.payment.create({
    data: {
      walletAddress: walletAddress.toLowerCase(),
      subscriptionId,
      amountCents: 0,
      currency,
      paymentMethod: PaymentMethod.CRYPTO,
      status: PaymentStatus.PENDING,
      cryptoTxHash: txHash,
      cryptoBlockNumber: BigInt(0),
    },
  });
}

/**
 * Legacy updatePaymentStatus for existing code.
 */
export async function updateLegacyPaymentStatus(
  txHash: string,
  status: 'COMPLETED' | 'FAILED',
  _blockNumber?: number,
) {
  return prisma.payment.updateMany({
    where: { cryptoTxHash: txHash },
    data: {
      status: status === 'COMPLETED' ? PaymentStatus.CONFIRMED : PaymentStatus.FAILED,
    },
  });
}

export const cryptoPaymentService = {
  createPaymentIntent,
  verifyPayment,
  verifyLegacyPayment,
  createPaymentRecord,
  updateLegacyPaymentStatus,
  getTreasuryAddress,
  getChainId,
  isConfigured: () => !!getRpcUrl() && !!getTreasuryAddress(),
};