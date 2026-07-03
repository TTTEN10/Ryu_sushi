import { Response, NextFunction } from 'express';
import logger from '../lib/logger';
import { consumeGuestChatQuota } from '../lib/guest-quota.service';
import { AuthenticatedRequest } from './auth';

/**
 * Enforces per-IP daily limits for guest and unauthenticated chat completions.
 * Runs after optionalAuthenticateWallet so wallet sessions can skip this path.
 */
export async function guestChatQuotaMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as { mode?: string } | undefined;
    const mode = typeof body?.mode === 'string' ? body.mode.trim().toLowerCase() : undefined;

    // Authenticated users on the normal path use DID quota middleware instead.
    if (req.wallet && mode !== 'guest') {
      next();
      return;
    }

    const clientIp = req.ip || 'unknown';
    const result = await consumeGuestChatQuota({
      clientIp,
      deviceId: req.guestDeviceId ?? null,
      walletAddress: req.wallet?.walletAddress ?? null,
    });

    if (result.unavailable) {
      logger.error('Guest chat quota unavailable (Redis required in production)');
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Guest chat quota service unavailable. Please try again shortly.',
      });
      return;
    }

    if (!result.allowed) {
      logger.warn(
        `Guest chat quota exceeded (reason=${result.reason ?? 'unknown'}) for IP ${clientIp}${
          req.guestDeviceId ? ` device=${req.guestDeviceId.slice(0, 6)}…` : ''
        }: ${result.used}/${result.limit}`,
      );
      res.status(429).json({
        success: false,
        error: 'GUEST_QUOTA_EXCEEDED',
        message:
          result.reason === 'ip'
            ? 'Too many guest chats from this network today. Connect a wallet to continue.'
            : 'Guest chat daily limit reached. Connect a wallet to continue.',
        quota: {
          dailyUsed: result.used,
          dailyLimit: result.limit,
          reason: result.reason ?? 'device',
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Guest quota middleware error:', error);
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Guest chat quota check failed.',
      });
      return;
    }
    next();
  }
}
