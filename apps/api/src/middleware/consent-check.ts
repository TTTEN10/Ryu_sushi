/**
 * Consent Check Middleware — GDPR Art. 7(1) enforcement
 *
 * Verifies that an authenticated user has granted HEALTH_DATA_PROCESSING
 * consent before allowing access to AI chat endpoints.
 *
 * When consent is revoked or missing, returns 403 with error code
 * CONSENT_REQUIRED. The frontend should show the consent banner.
 *
 * Auth: Placed after optionalAuthenticateWallet; blocks authenticated users
 * without consent but allows guest mode through.
 */

import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

export interface ConsentCheckRequest extends Request {
  wallet?: { walletAddress: string };
  consentedToHealthData: boolean;
}

export async function consentCheckMiddleware(
  req: ConsentCheckRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Allow unauthenticated (guest) requests through — consent gate only
    // applies to logged-in users who have an on-chain wallet identity.
    if (!req.wallet) {
      req.consentedToHealthData = false;
      return next();
    }

    const walletAddress = req.wallet.walletAddress.toLowerCase();

    // Query the latest consent record for health data processing
    const latestConsent = await prisma.userConsent.findFirst({
      where: {
        walletAddress,
        consentType: 'HEALTH_DATA_PROCESSING',
      },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });

    // Allow if consent is granted
    if (latestConsent?.status === 'GRANTED') {
      req.consentedToHealthData = true;
      return next();
    }

    // Withheld or withdrawn — block access
    const hashedWallet = ethers.keccak256(
      ethers.toUtf8Bytes(walletAddress)
    ).substring(0, 16);

    logger.info(
      `Health data consent missing/withdrawn for wallet ${hashedWallet}... — blocking AI access`
    );

    req.consentedToHealthData = false;

    res.status(403).json({
      success: false,
      message:
        'Health data consent is required to use the AI assistant. Please provide consent in your privacy settings.',
      error: 'CONSENT_REQUIRED',
      requiresConsent: true,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Consent check middleware error:', err);
    // On error, fail open (don't block legitimate requests due to DB issues)
    // but log the incident
    req.consentedToHealthData = false;
    next();
  }
}