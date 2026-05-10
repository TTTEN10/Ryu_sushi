/**
 * Product funnel timestamps stored in a first-party cookie when the user opts into analytics.
 * Each field is set once (first occurrence) unless noted. No wallet addresses or message content.
 *
 * When analytics consent is on, the same JSON is POSTed to `/api/metrics/funnel` (debounced + on tab hide).
 */

import { apiUrl } from '../config/api';

export const PRODUCT_METRICS_COOKIE_NAME = 'sp_product_metrics';

const FLUSH_DEBOUNCE_MS = 1200;
const SESSION_SENT_KEY = 'sp_pm_sent_payload';

let flushTimeoutId: ReturnType<typeof setTimeout> | null = null;

function getBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }
  return null;
}

function setBrowserCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  } = {}
): void {
  let cookieString = `${name}=${value}`;
  if (options.maxAge !== undefined) cookieString += `; max-age=${options.maxAge}`;
  if (options.path) cookieString += `; path=${options.path}`;
  if (options.secure) cookieString += '; secure';
  if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
  document.cookie = cookieString;
}

function deleteBrowserCookie(name: string, path = '/'): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
}

/** Browser session guard so “landing” and 24h return are counted once per tab session, not per in-app navigation */
const SESSION_INIT_KEY = 'sp_pm_session_recorded';

const COOKIE_MAX_AGE_SEC = 63072000; // 24 months — aligned with analytics consent cookie max-age

export type ProductConversionMetricsV1 = {
  v: 1;
  /** First consent-backed browser-session start (ISO 8601) */
  firstLandingAt?: string;
  /** Start time of the current browser session’s first tracked load */
  lastSessionStartAt?: string;
  /** First time the user initiated wallet connect */
  walletClickAt?: string;
  /** First time a wallet address was available in the app */
  walletSuccessAt?: string;
  /** First time wallet signature verification succeeded (authenticated session) */
  sessionSuccessAt?: string;
  /** First time DID check returned an on-chain identity */
  didSuccessAt?: string;
  /** First user chat message sent */
  firstMessageSentAt?: string;
  /** First non-empty assistant reply completed */
  firstReplyReceivedAt?: string;
  /** First detected return within 24h of a previous session start */
  returnWithin24hAt?: string;
};

/** Mirrors `hasConsentForCookieType('analytics')` without importing `cookieUtils` (avoids circular deps via `useCookieConsent`). */
function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  const consent = localStorage.getItem('cookieConsent');
  if (!consent) return false;
  try {
    const preferences = JSON.parse(consent) as { analytics?: boolean };
    return preferences.analytics === true;
  } catch {
    return false;
  }
}

function canTrack(): boolean {
  if (typeof window === 'undefined') return false;
  return hasAnalyticsConsent();
}

function readState(): ProductConversionMetricsV1 {
  const raw = getBrowserCookie(PRODUCT_METRICS_COOKIE_NAME);
  if (!raw) return { v: 1 };
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as ProductConversionMetricsV1;
    if (parsed && parsed.v === 1) return parsed;
  } catch {
    /* ignore */
  }
  return { v: 1 };
}

function writeState(next: ProductConversionMetricsV1): void {
  if (!canTrack()) return;
  const payload = encodeURIComponent(JSON.stringify(next));
  setBrowserCookie(PRODUCT_METRICS_COOKIE_NAME, payload, {
    path: '/',
    maxAge: COOKIE_MAX_AGE_SEC,
    sameSite: 'Strict',
    secure: typeof window !== 'undefined' && window.location?.protocol === 'https:',
  });
  scheduleProductMetricsFlush();
}

function scheduleProductMetricsFlush(): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  if (flushTimeoutId) clearTimeout(flushTimeoutId);
  flushTimeoutId = setTimeout(() => {
    flushTimeoutId = null;
    void flushProductMetricsToServer();
  }, FLUSH_DEBOUNCE_MS);
}

function metricsPayloadHasTimestamps(state: ProductConversionMetricsV1): boolean {
  return !!(
    state.firstLandingAt ||
    state.lastSessionStartAt ||
    state.walletClickAt ||
    state.walletSuccessAt ||
    state.sessionSuccessAt ||
    state.didSuccessAt ||
    state.firstMessageSentAt ||
    state.firstReplyReceivedAt ||
    state.returnWithin24hAt
  );
}

/**
 * POST current cookie metrics to the API (same shape as `sp_product_metrics`).
 * No-op without analytics consent or without any timestamps. Uses `credentials: 'include'`.
 */
export async function flushProductMetricsToServer(): Promise<boolean> {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return false;

  const payload = readState();
  if (!metricsPayloadHasTimestamps(payload)) return false;

  const body = JSON.stringify(payload);
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_SENT_KEY) === body) {
    return true;
  }

  try {
    const res = await fetch(apiUrl('/metrics/funnel'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body,
    });
    if (res.status === 204) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SESSION_SENT_KEY, body);
      }
      return true;
    }
  } catch {
    /* ignore network errors */
  }
  return false;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId);
      flushTimeoutId = null;
    }
    void flushProductMetricsToServer();
  });
}

function setOnce<K extends keyof ProductConversionMetricsV1>(
  key: K,
  value: NonNullable<ProductConversionMetricsV1[K]>
): void {
  if (!canTrack()) return;
  const state = readState();
  if (state[key] != null && state[key] !== '') return;
  (state as Record<string, unknown>)[key as string] = value;
  writeState(state);
}

/**
 * Landing visit + return-within-24h (compares this session’s start to previous session’s `lastSessionStartAt`).
 * Call once on app mount and when the user newly accepts analytics.
 */
export function recordLandingSession(): void {
  if (!canTrack()) return;
  if (typeof sessionStorage === 'undefined') return;

  if (sessionStorage.getItem(SESSION_INIT_KEY)) return;
  sessionStorage.setItem(SESSION_INIT_KEY, '1');

  const now = new Date().toISOString();
  const prev = readState();

  const lastStart = prev.lastSessionStartAt;
  if (lastStart && !prev.returnWithin24hAt) {
    const deltaMs = Date.now() - new Date(lastStart).getTime();
    const MIN_GAP_MS = 60_000;
    const WINDOW_MS = 86_400_000;
    if (deltaMs >= MIN_GAP_MS && deltaMs <= WINDOW_MS) {
      prev.returnWithin24hAt = now;
    }
  }

  if (!prev.firstLandingAt) prev.firstLandingAt = now;
  prev.lastSessionStartAt = now;

  writeState(prev);
}

export function recordWalletClick(): void {
  setOnce('walletClickAt', new Date().toISOString());
}

export function recordWalletSuccess(): void {
  setOnce('walletSuccessAt', new Date().toISOString());
}

export function recordSessionSuccess(): void {
  setOnce('sessionSuccessAt', new Date().toISOString());
}

export function recordDidSuccess(): void {
  setOnce('didSuccessAt', new Date().toISOString());
}

export function recordFirstMessageSent(): void {
  setOnce('firstMessageSentAt', new Date().toISOString());
}

export function recordFirstReplyReceived(): void {
  setOnce('firstReplyReceivedAt', new Date().toISOString());
}

/** Snapshot for operators (browser console, ETL). Returns null if missing or invalid. */
export function getProductConversionMetricsSnapshot(): ProductConversionMetricsV1 | null {
  if (typeof window === 'undefined') return null;
  const s = readState();
  if (!s.firstLandingAt && !s.walletClickAt) return null;
  return s;
}

export function clearProductMetricsCookie(): void {
  if (typeof document === 'undefined') return;
  deleteBrowserCookie(PRODUCT_METRICS_COOKIE_NAME, '/');
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(SESSION_SENT_KEY);
  }
}
