import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  GUEST_DEVICE_COOKIE_NAME,
  generateGuestDeviceCookieValue,
  guestDeviceCookieOptions,
  verifyGuestDeviceCookieValue,
} from '../lib/guest-device-cookie';

describe('guest-device-cookie', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-guest-device-cookie-testing-1234567890';
    delete process.env.GUEST_DEVICE_COOKIE_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.GUEST_DEVICE_COOKIE_SECRET;
  });

  it('has a stable cookie name', () => {
    expect(GUEST_DEVICE_COOKIE_NAME).toBe('sp_gid');
  });

  it('round-trips a signed device cookie', () => {
    const { deviceId, cookieValue } = generateGuestDeviceCookieValue();
    expect(deviceId).toMatch(/^[A-Za-z0-9_-]{20,32}$/);
    expect(cookieValue.split('.').length).toBe(2);
    expect(verifyGuestDeviceCookieValue(cookieValue)).toBe(deviceId);
  });

  it('rejects a cookie signed with a different secret', () => {
    const { cookieValue } = generateGuestDeviceCookieValue();
    process.env.JWT_SECRET = 'a-completely-different-secret-that-should-invalidate-it';
    expect(verifyGuestDeviceCookieValue(cookieValue)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const { deviceId, cookieValue } = generateGuestDeviceCookieValue();
    const [id, sig] = cookieValue.split('.');
    expect(id).toBe(deviceId);
    const tampered = `${id}.${sig.slice(0, -1)}A`;
    expect(verifyGuestDeviceCookieValue(tampered)).toBeNull();
  });

  it('rejects a forged device id with a valid-looking signature', () => {
    const forged = 'aaaaaaaaaaaaaaaaaaaaaa.forgedforgedforge';
    expect(verifyGuestDeviceCookieValue(forged)).toBeNull();
  });

  it('rejects malformed cookies', () => {
    expect(verifyGuestDeviceCookieValue(undefined)).toBeNull();
    expect(verifyGuestDeviceCookieValue(null)).toBeNull();
    expect(verifyGuestDeviceCookieValue('')).toBeNull();
    expect(verifyGuestDeviceCookieValue('nodot')).toBeNull();
    expect(verifyGuestDeviceCookieValue('.startsWithDot')).toBeNull();
    expect(verifyGuestDeviceCookieValue('endsWithDot.')).toBeNull();
    expect(verifyGuestDeviceCookieValue('badid!.somesig')).toBeNull();
  });

  it('prefers GUEST_DEVICE_COOKIE_SECRET over JWT_SECRET when set', () => {
    process.env.GUEST_DEVICE_COOKIE_SECRET = 'dedicated-secret-for-guest-device-cookies-abcdefgh';
    const { cookieValue } = generateGuestDeviceCookieValue();
    expect(verifyGuestDeviceCookieValue(cookieValue)).not.toBeNull();

    delete process.env.GUEST_DEVICE_COOKIE_SECRET;
    expect(verifyGuestDeviceCookieValue(cookieValue)).toBeNull();
  });

  it('uses HttpOnly / SameSite=Lax / Secure-in-prod cookie options', () => {
    const dev = guestDeviceCookieOptions({ isProduction: false });
    expect(dev.httpOnly).toBe(true);
    expect(dev.sameSite).toBe('lax');
    expect(dev.secure).toBe(false);
    expect(dev.path).toBe('/');
    expect(dev.maxAge).toBeGreaterThan(0);

    const prod = guestDeviceCookieOptions({ isProduction: true });
    expect(prod.secure).toBe(true);
  });
});
