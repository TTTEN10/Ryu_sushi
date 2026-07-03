/**
 * Signed anonymous device cookie for guest chat quota tracking.
 *
 * Purpose: give unauthenticated users a stable, per-browser id that survives
 * hard refreshes and incognito-adjacent bypass attempts, without any
 * fingerprinting or PII. Paired with the IP-based quota as defense-in-depth
 * against cookie-clearing abuse (see guest-quota.service.ts).
 *
 * Format:  <deviceId>.<hmac>
 *   deviceId : 16 random bytes, base64url-encoded (22 chars, 128 bits entropy)
 *   hmac     : HMAC-SHA256(secret, "gdc.v1|" + deviceId), first 18 base64url chars
 *
 * Signing key: derived from JWT_SECRET with a static domain-separation label
 * so we do not need a new env var. Rotating JWT_SECRET invalidates existing
 * device cookies (fresh cookies are issued on next request); that is the
 * intended behaviour on secret rotation.
 */

import crypto from 'crypto';

const COOKIE_NAME = 'sp_gid';
const DOMAIN_LABEL = 'guest-device-cookie-v1';
const SIGNATURE_PREFIX = 'gdc.v1|';
const DEVICE_ID_BYTES = 16;
const HMAC_TRUNCATE_CHARS = 18; // ~108 bits, plenty against forgery for a low-value counter
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60; // 400 days (browsers cap at ~400)

export const GUEST_DEVICE_COOKIE_NAME = COOKIE_NAME;

function getSigningKey(): Buffer {
  const base =
    process.env.GUEST_DEVICE_COOKIE_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    'guest-device-cookie-dev-fallback-do-not-use-in-prod';
  return crypto.createHmac('sha256', base).update(DOMAIN_LABEL).digest();
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function isValidDeviceId(id: string): boolean {
  return /^[A-Za-z0-9_-]{20,32}$/.test(id);
}

function computeHmac(deviceId: string): string {
  const key = getSigningKey();
  const mac = crypto.createHmac('sha256', key).update(SIGNATURE_PREFIX + deviceId).digest();
  return toBase64Url(mac).slice(0, HMAC_TRUNCATE_CHARS);
}

function timingSafeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Generate a new signed device id token.
 */
export function generateGuestDeviceCookieValue(): { deviceId: string; cookieValue: string } {
  const deviceId = toBase64Url(crypto.randomBytes(DEVICE_ID_BYTES));
  const cookieValue = `${deviceId}.${computeHmac(deviceId)}`;
  return { deviceId, cookieValue };
}

/**
 * Verify a signed cookie value; returns the deviceId when valid, null otherwise.
 */
export function verifyGuestDeviceCookieValue(cookieValue: string | undefined | null): string | null {
  if (!cookieValue || typeof cookieValue !== 'string') return null;
  const dotIndex = cookieValue.indexOf('.');
  if (dotIndex <= 0 || dotIndex === cookieValue.length - 1) return null;
  const deviceId = cookieValue.slice(0, dotIndex);
  const sig = cookieValue.slice(dotIndex + 1);
  if (!isValidDeviceId(deviceId)) return null;
  const expected = computeHmac(deviceId);
  return timingSafeEqualString(sig, expected) ? deviceId : null;
}

export interface GuestDeviceCookieOptions {
  isProduction: boolean;
}

/**
 * Standard cookie attributes for the guest device cookie.
 * HttpOnly so client JS cannot read it, SameSite=Lax so it round-trips on top-level nav
 * and same-site fetches, Secure in production.
 */
export function guestDeviceCookieOptions(
  opts: GuestDeviceCookieOptions,
): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  maxAge: number;
  path: '/';
} {
  return {
    httpOnly: true,
    secure: opts.isProduction,
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS * 1000,
    path: '/',
  };
}
