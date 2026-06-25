import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import logger from '../lib/logger';
import { walletAuthMiddleware, walletConnectionMiddleware, WalletAuthRequest } from '../middleware/wallet-auth';
import { validateWalletConnect, validateWalletSignature } from '../middleware/validation';
import { generateWalletToken, extractTokenFromRequest, verifyWalletToken } from '../lib/session';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import {
  walletAuthRateLimitMiddleware,
  walletConnectChallengeRateLimitMiddleware,
} from '../lib/ratelimit';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';
import { generateSIWEMessage, isSIWEMessage } from '../middleware/wallet-auth';
import {
  registerWalletNonce,
  extractNonceFromSiweMessage,
  consumeWalletNonce,
} from '../lib/wallet-nonce.service';
import { isAllowedOrigin } from '../lib/allowed-origins';

const router = Router();

/**
 * POST /api/auth/wallet/connect
 * Connect wallet and generate verification message
 * 
 * Input: wallet address (via header or body)
 * Auth: Public (no auth required)
 * 
 * Output: { success: true, data: { address, chainId, nonce, message } }
 */
router.post(
  '/wallet/connect',
  walletConnectChallengeRateLimitMiddleware,
  validateWalletConnect,
  walletConnectionMiddleware,
  async (req: WalletAuthRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Wallet connection failed',
        });
      }

      // Validate chain ID - Sepolia Testnet
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const nonce = ethers.hexlify(ethers.randomBytes(32));
      await registerWalletNonce(nonce, req.wallet.address, req.wallet.chainId);

      const originHeader = req.headers.origin;
      const isProd = process.env.NODE_ENV === 'production';

      if (originHeader) {
        if (!isAllowedOrigin(originHeader)) {
          logger.warn(`SIWE connect rejected: disallowed Origin ${originHeader}`);
          return res.status(400).json({
            success: false,
            message: 'Origin not allowed for wallet sign-in',
            error: 'ORIGIN_NOT_ALLOWED',
          });
        }
      } else if (isProd) {
        return res.status(400).json({
          success: false,
          message: 'Origin header required for wallet sign-in',
          error: 'ORIGIN_REQUIRED',
        });
      }

      // Extract domain from Origin header for SIWE message (EIP-4361 requires domain to match requesting origin)
      let domain: string | undefined;
      let uri: string | undefined;
      if (originHeader) {
        try {
          const url = new URL(originHeader);
          domain = url.host;
          uri = originHeader;
        } catch {
          return res.status(400).json({
            success: false,
            message: 'Invalid Origin header',
            error: 'ORIGIN_INVALID',
          });
        }
      }

      const message = generateSIWEMessage(req.wallet.address, nonce, {
        domain,
        uri,
        expirationTime: new Date(Date.now() + 5 * 60 * 1000),
      });

      logger.info(`Wallet SIWE challenge issued for ${req.wallet.address}`);

      res.json({
        success: true,
        message: 'Wallet connected successfully',
        data: {
          address: req.wallet.address,
          chainId: req.wallet.chainId,
          nonce,
          message,
        },
      });
    } catch (error) {
      logger.error('Wallet connect error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/wallet/verify
 * Verify wallet signature and create session
 * 
 * Input: { address, signature, message, chainId }
 * Auth: Public (no auth required, but creates session)
 * 
 * Output: { success: true, data: { address, chainId, verified: true, token } }
 */
router.post(
  '/wallet/verify',
  validateWalletSignature,
  walletAuthRateLimitMiddleware,
  walletAuthMiddleware,
  async (req: WalletAuthRequest, res: Response) => {
    try {
      if (!req.wallet || !req.wallet.signature || !req.wallet.message) {
        return res.status(401).json({
          success: false,
          message: 'Wallet signature verification failed',
        });
      }

      if (!isSIWEMessage(req.wallet.message)) {
        return res.status(400).json({
          success: false,
          message: 'EIP-4361 (SIWE) message required',
          error: 'SIWE_REQUIRED',
        });
      }

      const nonce = extractNonceFromSiweMessage(req.wallet.message);
      if (!nonce || !(await consumeWalletNonce(nonce, req.wallet.address))) {
        logger.warn(`Wallet verify nonce replay or invalid for ${req.wallet.address}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid, expired, or reused nonce — request a new login message',
          error: 'NONCE_INVALID',
        });
      }

      logger.info(`Wallet verified (SIWE): ${req.wallet.address}`);

      // Generate JWT session token
      const sessionToken = generateWalletToken({
        walletAddress: req.wallet.address,
        chainId: req.wallet.chainId,
        isVerified: true,
      });

      // Set HTTP-only cookie
      res.cookie('walletSession', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: 'Wallet signature verified successfully',
        data: {
          address: req.wallet.address,
          chainId: req.wallet.chainId,
          verified: true,
          /** Prefer httpOnly `walletSession` cookie; token duplicated here only for non-browser clients. */
          token: sessionToken,
        },
      });
    } catch (error) {
      logger.error('Wallet verify error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Same contract as GET /api/auth/session (mobile-friendly alias).
 */
router.get(
  '/me',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      res.json({
        success: true,
        data: {
          walletAddress: req.wallet.walletAddress,
          chainId: req.wallet.chainId,
          isVerified: req.wallet.isVerified,
        },
      });
    } catch (error) {
      logger.error('Session (/me) error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/auth/session
 * Get current session information (canonical name; /me is an alias).
 */
router.get(
  '/session',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      res.json({
        success: true,
        data: {
          walletAddress: req.wallet.walletAddress,
          chainId: req.wallet.chainId,
          isVerified: req.wallet.isVerified,
        },
      });
    } catch (error) {
      logger.error('Session info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout and clear session
 *
 * Note: Does NOT require authentication - allows logout even with expired/invalid tokens
 */
router.post(
  '/logout',
  async (_req: Request, res: Response) => {
    try {
      // Clear the cookie with exact same settings as when it was set (see verify route)
      res.clearCookie('walletSession', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      logger.info('User logged out successfully');
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;

