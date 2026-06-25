import rateLimit from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express'

// General rate limiting for API endpoints
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for high-frequency polling endpoints
    // These have their own dedicated rate limiters or are authenticated
    if (req.path === '/chat/concurrency') {
      return true;
    }
    return false;
  },
})

// Specific rate limiting for email subscription endpoint
export const subscriptionRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per minute
  message: {
    success: false,
    message: 'Too many subscription attempts. Please wait a minute before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// SIWE challenge issuance (POST /auth/wallet/connect) — allow retries during sign-in UX
export const walletConnectChallengeRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many wallet sign-in attempts. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress ? walletAddress.toLowerCase() : req.ip || 'unknown';
  },
})

// Rate limiting for wallet signature verification (POST /auth/wallet/verify)
export const walletAuthRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many wallet authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use wallet address if available, otherwise fall back to IP
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress || req.ip || 'unknown';
  },
})

// Strict rate limiting for sensitive auth endpoints
export const strictAuthRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress || req.ip || 'unknown';
  },
})

// Strict rate limiting for payment endpoints
export const paymentRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 payment requests per 15 minutes
  message: {
    success: false,
    message: 'Too many payment requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress || req.ip || 'unknown';
  },
})

// Rate limiting for DID verification endpoints
export const didVerifyRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 DID verification requests per 15 minutes
  message: {
    success: false,
    message: 'Too many DID verification requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use wallet address if available, otherwise fall back to IP
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress || req.ip || 'unknown';
  },
})

// Rate limiting for testing endpoints
export const testingRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    success: false,
    message: 'Too many requests to testing endpoint. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiting for chat completion endpoints
export const chatRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 chat requests per minute
  message: {
    success: false,
    message: 'Too many chat requests. Please wait a moment before trying again.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use wallet address if authenticated, otherwise use IP
    const walletAddress = req.headers['x-wallet-address'] as string;
    if (walletAddress) {
      return `wallet:${walletAddress.toLowerCase()}`;
    }
    return req.ip || 'unknown';
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/healthz';
  },
})

/** Guest / anonymous chat: 5 completions per minute per IP (6th → 429) */
const guestChatMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many guest chat requests. Please wait a moment or sign in with your wallet.',
    error: 'GUEST_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
})

export function guestChatMinuteRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body as { mode?: string } | undefined;
  const mode = typeof body?.mode === 'string' ? body.mode.trim().toLowerCase() : undefined;
  const wallet = (req as { wallet?: { walletAddress: string } }).wallet;

  if (wallet && mode !== 'guest') {
    next();
    return;
  }

  guestChatMinuteLimiter(req, res, next);
}

/** Anonymous funnel intake (POST /api/metrics/funnel): bounded bursts per IP */
export const funnelRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Too many funnel submissions. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/** Analytics event ingestion (POST /api/analytics/event): generous limit for batch events */
export const analyticsEventRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 events per minute (supports batch sending)
  message: {
    success: false,
    message: 'Too many analytics events. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Admin endpoint rate limiting
 * Stricter than general API limits to prevent brute force attacks on admin secret
 * Allows 10 failed attempts per 15 minutes before blocking
 */
export const adminRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many admin access attempts. Please try again later.',
    error: 'ADMIN_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
  skip: (req: Request, res: Response) => {
    // Don't rate limit successful authentications (200 OK)
    // This allows legitimate admin use while blocking brute force
    return res.statusCode === 200;
  },
})

/**
 * Chat concurrency endpoint rate limiting
 * More permissive limit for polling endpoint (frontend polls every few seconds)
 * Uses wallet address for authenticated users, IP for others
 */
export const chatConcurrencyRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each wallet/IP to 60 requests per minute (1 per second average)
  message: {
    success: false,
    message: 'Too many concurrency check requests. Please wait a moment.',
    error: 'CONCURRENCY_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use wallet address if authenticated, otherwise use IP
    const walletAddress = req.headers['x-wallet-address'] as string;
    if (walletAddress) {
      return `wallet:${walletAddress.toLowerCase()}`;
    }
    return req.ip || 'unknown';
  },
})
