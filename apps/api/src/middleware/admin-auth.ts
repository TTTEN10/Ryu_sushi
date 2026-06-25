/**
 * Admin Authentication Middleware
 *
 * Provides access control for admin-only endpoints using:
 * - API key authentication (X-Admin-API-Key header)
 * - Verified JWT whose wallet is in RAG_ADMIN_WALLETS
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';
import { extractTokenFromRequest } from '../lib/session';
import { AuthenticatedRequest } from './auth';

/**
 * Extended request interface with admin authentication
 */
export interface AdminRequest extends AuthenticatedRequest {
  admin?: {
    method: 'api_key' | 'wallet' | 'jwt';
    identifier: string;
  };
}

function getAdminApiKey(req: Request): string | null {
  const headerKey = req.headers['x-admin-api-key'] as string;
  return headerKey || null;
}

function getWalletToken(req: Request): string | undefined {
  return extractTokenFromRequest(req) || (req.headers['x-wallet-token'] as string) || undefined;
}

async function tryAdminWalletAuth(req: AdminRequest): Promise<boolean> {
  const token = getWalletToken(req);
  if (!token) {
    return false;
  }

  try {
    const { verifyWalletToken } = await import('../lib/session');
    const session = verifyWalletToken(token);

    if (session && isAdminWallet(session.walletAddress)) {
      req.wallet = session;
      req.admin = {
        method: 'wallet',
        identifier: session.walletAddress,
      };
      return true;
    }
  } catch {
    // Invalid token; caller decides whether to reject or continue
  }

  return false;
}

/**
 * Check if wallet address is in admin whitelist
 */
function isAdminWallet(walletAddress: string): boolean {
  const adminWallets = process.env.RAG_ADMIN_WALLETS;
  if (!adminWallets) {
    return false;
  }

  const addresses = adminWallets
    .split(',')
    .map((addr) => addr.trim().toLowerCase())
    .filter((addr) => addr.length > 0);

  return addresses.includes(walletAddress.toLowerCase());
}

/**
 * Admin authentication middleware
 * Supports two authentication methods:
 * 1. API key (X-Admin-API-Key header matching RAG_ADMIN_API_KEY)
 * 2. Verified JWT whose wallet is in RAG_ADMIN_WALLETS
 * 
 * Environment variables:
 * - RAG_ADMIN_API_KEY: Admin API key
 * - RAG_ADMIN_WALLETS: Comma-separated list of admin wallet addresses
 */
export const adminAuth = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try API key authentication first
    const apiKey = getAdminApiKey(req);
    const expectedApiKey = process.env.RAG_ADMIN_API_KEY;

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      req.admin = {
        method: 'api_key',
        identifier: 'api_key',
      };
      logger.info('Admin authenticated via API key');
      next();
      return;
    }

    if (await tryAdminWalletAuth(req)) {
      logger.info(`Admin authenticated via wallet: ${req.admin!.identifier}`);
      next();
      return;
    }

    // No valid authentication found
    logger.warn('Admin authentication failed: no valid credentials');
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'ADMIN_ACCESS_REQUIRED',
    });
  } catch (error) {
    logger.error('Admin authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during admin authentication',
      error: 'ADMIN_AUTH_ERROR',
    });
  }
};

/**
 * Optional admin authentication - doesn't fail if not authenticated
 * Useful for endpoints that behave differently for admins
 */
export const optionalAdminAuth = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = getAdminApiKey(req);
    const expectedApiKey = process.env.RAG_ADMIN_API_KEY;

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      req.admin = {
        method: 'api_key',
        identifier: 'api_key',
      };
      next();
      return;
    }

    if (await tryAdminWalletAuth(req)) {
      next();
      return;
    }

    // Continue without admin authentication
    next();
  } catch (error) {
    logger.warn('Optional admin authentication error:', error);
    next(); // Continue even on error
  }
};

