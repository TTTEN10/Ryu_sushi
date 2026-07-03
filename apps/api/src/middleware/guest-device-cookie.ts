import { Response, NextFunction } from 'express';
import {
  GUEST_DEVICE_COOKIE_NAME,
  generateGuestDeviceCookieValue,
  guestDeviceCookieOptions,
  verifyGuestDeviceCookieValue,
} from '../lib/guest-device-cookie';
import { AuthenticatedRequest } from './auth';

/**
 * Ensures every guest-facing chat request carries an anonymous, HMAC-signed
 * device cookie. When the cookie is missing or invalid, issues a fresh one on
 * the response and attaches the new deviceId to `req.guestDeviceId` so
 * downstream middleware (guest quota) can key on it in the same request.
 *
 * Idempotent: never overwrites a valid cookie.
 */
export function guestDeviceCookieMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  try {
    const existing = req.cookies?.[GUEST_DEVICE_COOKIE_NAME];
    const verified = verifyGuestDeviceCookieValue(existing);

    if (verified) {
      req.guestDeviceId = verified;
      next();
      return;
    }

    const { deviceId, cookieValue } = generateGuestDeviceCookieValue();
    res.cookie(
      GUEST_DEVICE_COOKIE_NAME,
      cookieValue,
      guestDeviceCookieOptions({ isProduction: process.env.NODE_ENV === 'production' }),
    );
    req.guestDeviceId = deviceId;
    next();
  } catch {
    // Never block the request path on cookie plumbing; quota falls back to IP.
    next();
  }
}
