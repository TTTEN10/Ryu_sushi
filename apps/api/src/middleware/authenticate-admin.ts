/**
 * Admin Authentication Middleware
 *
 * Validates X-Admin-Secret header against ADMIN_SECRET environment variable.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * Security properties:
 * - Secret must be 32+ characters (128 bits of entropy)
 * - Constant-time comparison prevents timing oracle attacks
 * - All access attempts are audit logged
 * - Rate limiting applied separately from general API limits
 *
 * @example
 * // Request with valid secret
 * curl -X GET /api/admin/retention/stats \
 *   -H "X-Admin-Secret: <secret>"
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

export interface AuthenticatedAdminRequest extends Request {
  admin?: {
    authenticated: boolean;
    authenticatedAt: Date | null;
  };
}

/**
 * Admin Authentication Middleware
 *
 * Validates X-Admin-Secret header against ADMIN_SECRET environment variable.
 */
export function authenticateAdmin(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): void {
  const adminSecret = process.env.ADMIN_SECRET;

  // Check if admin secret is configured
  if (!adminSecret) {
    logger.error('Admin endpoint accessed but ADMIN_SECRET not configured');
    res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: 'ADMIN_NOT_CONFIGURED',
    });
    return;
  }

  // Validate secret length (minimum 32 chars = ~128 bits entropy)
  if (adminSecret.length < 32) {
    logger.error('ADMIN_SECRET too short (must be 32+ characters)');
    res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: 'ADMIN_SECRET_TOO_SHORT',
    });
    return;
  }

  // Extract secret from header
  const providedSecret = req.headers['x-admin-secret'] as string | undefined;

  if (!providedSecret) {
    logger.warn('Admin access attempt without secret', {
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'ADMIN_SECRET_MISSING',
    });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const secretBytes = Buffer.from(adminSecret, 'utf8');
  const providedBytes = Buffer.from(providedSecret, 'utf8');

  // Check length first (timing-safe length check is acceptable here)
  if (secretBytes.length !== providedBytes.length) {
    logger.warn('Admin access attempt with invalid secret length', {
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      providedLength: providedBytes.length,
      expectedLength: secretBytes.length,
    });

    // Audit log failed attempt
    logAdminAccessAttempt(req, false, 'INVALID_LENGTH');

    res.status(403).json({
      success: false,
      message: 'Invalid credentials',
      error: 'ADMIN_SECRET_INVALID',
    });
    return;
  }

  // Constant-time byte-by-byte comparison
  let isValid = true;
  for (let i = 0; i < secretBytes.length; i++) {
    if (secretBytes[i] !== providedBytes[i]) {
      isValid = false;
    }
  }

  if (!isValid) {
    logger.warn('Admin access attempt with invalid secret', {
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Audit log failed attempt
    logAdminAccessAttempt(req, false, 'INVALID_SECRET');

    res.status(403).json({
      success: false,
      message: 'Invalid credentials',
      error: 'ADMIN_SECRET_INVALID',
    });
    return;
  }

  // Authentication successful
  req.admin = {
    authenticated: true,
    authenticatedAt: new Date(),
  };

  logger.info('Admin access granted', {
    path: req.path,
    ip: req.ip,
  });

  // Audit log successful access
  logAdminAccessAttempt(req, true, 'SUCCESS');

  next();
}

/**
 * Log admin access attempt for audit trail
 */
function logAdminAccessAttempt(
  req: Request,
  success: boolean,
  reason: string
): void {
  // Use warn level for failed attempts, info for successful
  const logLevel = success ? 'info' : 'warn';
  logger[logLevel as keyof typeof logger]('ADMIN_ACCESS_ATTEMPT', {
    success,
    reason,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
}

/**
 * Optional admin authentication - allows unauthenticated requests
 * but marks them for downstream handlers to check
 */
export function optionalAuthenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers['x-admin-secret'] as string | undefined;

  if (
    adminSecret &&
    providedSecret &&
    adminSecret.length >= 32 &&
    providedSecret.length === adminSecret.length
  ) {
    // Constant-time comparison
    let isValid = true;
    for (let i = 0; i < adminSecret.length; i++) {
      if (adminSecret.charCodeAt(i) !== providedSecret.charCodeAt(i)) {
        isValid = false;
      }
    }

    if (isValid) {
      req.admin = {
        authenticated: true,
        authenticatedAt: new Date(),
      };
    } else {
      req.admin = {
        authenticated: false,
        authenticatedAt: null,
      };
    }
  } else {
    req.admin = {
      authenticated: false,
      authenticatedAt: null,
    };
  }

  next();
}
