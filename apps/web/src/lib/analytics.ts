/**
 * Privacy-First Analytics SDK for SafePsy
 *
 * Tracks anonymized events without storing sensitive data.
 * Supports both anonymous guests and wallet-authenticated users.
 * Works even if cookies are disabled (fallback to localStorage/memory).
 *
 * NEVER tracks:
 * - Therapy content, prompts, or AI replies
 * - Personal health information
 * - Raw wallet addresses or DID secrets
 * - Raw IP addresses
 *
 * ALWAYS tracks:
 * - Anonymous UUIDs (visitor_id, session_id)
 * - Hashed wallet addresses (wallet_hash)
 * - Timestamps, event names
 * - Coarse device/country info
 */

import { hashWalletAddress } from '../lib/wallet-hash';
import { ga4Track } from './ga4';

// ============================================================================
// Constants
// ============================================================================

const VISITOR_ID_KEY = 'safepsy_vid';
const SESSION_ID_KEY = 'safepsy_sid';
const LAST_VISIT_KEY = 'safepsy_last_visit';
const VISITOR_ID_EXPIRY_MS = 31536000000; // 12 months
const SESSION_INACTIVITY_MS = 1800000; // 30 minutes
const DEDUPE_WINDOW_MS = 300000; // 5 minutes
const MAX_SENT_EVENTS_CACHE = 50;
const API_ENDPOINT = '/api/analytics/event';
const FLUSH_DEBOUNCE_MS = 1000;

// ============================================================================
// Types
// ============================================================================

export type AnalyticsEventName =
  | 'landing_visit'
  | 'wallet_click'
  | 'wallet_success'
  | 'session_success'
  | 'did_success'
  | 'first_message_sent'
  | 'first_reply_received'
  | 'return_24h';

/**
 * Map internal analytics event names to GA4 event names.
 * Events listed here are tracked in both the self-hosted SDK and GA4.
 */
const ANALYTICS_TO_GA4: Record<AnalyticsEventName, string> = {
  landing_visit: 'page_view',
  wallet_click: 'wallet_connect_initiated',
  wallet_success: 'wallet_connected',
  session_success: 'session_started',
  did_success: 'did_minted',
  first_message_sent: 'first_chat_sent',
  first_reply_received: 'first_chat_replied',
  return_24h: 'returning_visit',
};

export interface AnalyticsEvent {
  event_name: AnalyticsEventName;
  visitor_id: string;
  session_id: string;
  wallet_hash?: string | null;
  timestamp: string;
  page_url: string;
  referrer: string;
  user_agent: string;
  device_type: string;
  country: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  autoTrackPageViews: boolean;
}

// ============================================================================
// Storage Utilities
// ============================================================================

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const testKey = '__test_storage__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const testKey = '__test_storage__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return sessionStorage;
  } catch {
    return null;
  }
}

function getFromStorage<T>(storage: Storage | null, key: string): T | null {
  if (!storage) return null;
  try {
    const item = storage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function setToStorage<T>(storage: Storage | null, key: string, value: T): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

function removeFromStorage(storage: Storage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore
  }
}

// ============================================================================
// Identifier Management
// ============================================================================

/**
 * Generates a UUID v4 for anonymous visitor identification.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets or creates a persistent visitor ID.
 * Survives refresh/revisit, expires after 12 months.
 */
function getOrCreateVisitorId(): string {
  const storage = getLocalStorage();
  if (storage) {
    const existing = getFromStorage<{ id: string; createdAt: number }>(storage, VISITOR_ID_KEY);
    if (existing && existing.id) {
      // Check if expired
      const age = Date.now() - existing.createdAt;
      if (age < VISITOR_ID_EXPIRY_MS) {
        return existing.id;
      }
      // Expired, remove and recreate
      removeFromStorage(storage, VISITOR_ID_KEY);
    }
  }

  // Create new visitor ID
  const newVisitor = {
    id: generateUUID(),
    createdAt: Date.now(),
  };

  setToStorage(storage, VISITOR_ID_KEY, newVisitor);
  return newVisitor.id;
}

/**
 * Gets or creates a session ID.
 * Renewed after 30 minutes of inactivity.
 */
function getOrCreateSessionId(): string {
  const storage = getSessionStorage();

  // Check memory first for session continuity
  const memStorage = getInMemoryStorage();
  let existing = getFromStorage<{ id: string; lastActivity: number }>(memStorage, SESSION_ID_KEY);

  if (!existing && storage) {
    existing = getFromStorage(storage, SESSION_ID_KEY);
  }

  if (existing && existing.id) {
    // Check inactivity timeout
    const inactiveTime = Date.now() - existing.lastActivity;
    if (inactiveTime < SESSION_INACTIVITY_MS) {
      // Update activity timestamp
      existing.lastActivity = Date.now();
      setToStorage(memStorage, SESSION_ID_KEY, existing);
      setToStorage(storage, SESSION_ID_KEY, existing);
      return existing.id;
    }
  }

  // Create new session ID
  const newSession = {
    id: generateUUID(),
    lastActivity: Date.now(),
  };

  setToStorage(memStorage, SESSION_ID_KEY, newSession);
  setToStorage(storage, SESSION_ID_KEY, newSession);
  return newSession.id;
}

/**
 * Gets the last visit timestamp for 24h return tracking.
 */
function getLastVisit(): number | null {
  const storage = getLocalStorage();
  const data = getFromStorage<number>(storage, LAST_VISIT_KEY);
  return data ?? null;
}

/**
 * Updates the last visit timestamp.
 */
function setLastVisit(): void {
  const storage = getLocalStorage();
  setToStorage(storage, LAST_VISIT_KEY, Date.now());
}

// ============================================================================
// In-Memory Storage (fallback)
// ============================================================================

const inMemoryStore: Record<string, unknown> = {};

function getInMemoryStorage(): Storage {
  return {
    getItem: (key: string) => {
      const item = inMemoryStore[key];
      return item !== undefined ? JSON.stringify(item) : null;
    },
    setItem: (key: string, value: string) => {
      try {
        inMemoryStore[key] = JSON.parse(value);
      } catch {
        inMemoryStore[key] = value;
      }
    },
    removeItem: (key: string) => {
      delete inMemoryStore[key];
    },
    clear: () => {
      Object.keys(inMemoryStore).forEach(key => delete inMemoryStore[key]);
    },
    get length() {
      return Object.keys(inMemoryStore).length;
    },
    key: (index: number) => Object.keys(inMemoryStore)[index] ?? null,
  };
}

// ============================================================================
// Deduplication
// ============================================================================

const sentEventsCache = new Map<string, number>();

function getDedupeKey(eventName: string, sessionId: string): string {
  return `${eventName}_${sessionId}`;
}

function isDuplicateEvent(eventName: string, sessionId: string): boolean {
  const key = getDedupeKey(eventName, sessionId);
  const timestamp = sentEventsCache.get(key);

  if (timestamp !== undefined) {
    const age = Date.now() - timestamp;
    if (age < DEDUPE_WINDOW_MS) {
      return true;
    }
    // Remove expired entry
    sentEventsCache.delete(key);
  }

  return false;
}

function markEventAsSent(eventName: string, sessionId: string): void {
  const key = getDedupeKey(eventName, sessionId);

  // Clean up old entries if cache is full
  if (sentEventsCache.size >= MAX_SENT_EVENTS_CACHE) {
    const now = Date.now();
    for (const [k, ts] of sentEventsCache.entries()) {
      if (now - ts > DEDUPE_WINDOW_MS) {
        sentEventsCache.delete(k);
      }
    }
  }

  sentEventsCache.set(key, Date.now());
}

// ============================================================================
// Event Queue & Retry Logic
// ============================================================================

interface QueuedEvent {
  event: AnalyticsEvent;
  attempts: number;
  nextRetry: number;
}

const eventQueue: QueuedEvent[] = [];
let flushTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

const MAX_RETRY_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

function calculateBackoff(attempts: number): number {
  const backoff = BASE_BACKOFF_MS * Math.pow(2, attempts);
  return Math.min(backoff, MAX_BACKOFF_MS);
}

function queueEvent(event: AnalyticsEvent): void {
  eventQueue.push({
    event,
    attempts: 0,
    nextRetry: Date.now(),
  });

  scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimeoutId) {
    clearTimeout(flushTimeoutId);
  }

  flushTimeoutId = setTimeout(() => {
    flushTimeoutId = null;
    void flushEvents();
  }, FLUSH_DEBOUNCE_MS);
}

async function flushEvents(): Promise<void> {
  if (isFlushing || eventQueue.length === 0) {
    return;
  }

  isFlushing = true;
  const now = Date.now();

  // Get events ready to send
  const readyEvents = eventQueue.filter(e => e.nextRetry <= now);

  if (readyEvents.length === 0) {
    isFlushing = false;
    scheduleFlush();
    return;
  }

  // Remove ready events from queue
  const remainingEvents = eventQueue.filter(e => e.nextRetry > now);
  eventQueue.length = 0;
  eventQueue.push(...remainingEvents);

  try {
    // Use sendBeacon if available for better delivery
    const payload = JSON.stringify(readyEvents.map(e => e.event));

    if (navigator.sendBeacon && typeof document !== 'undefined') {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon(API_ENDPOINT, blob);

      if (sent) {
        // Success - don't retry
      } else {
        // Failed - requeue with backoff
        requeueEvents(readyEvents);
      }
    } else {
      // Fallback to fetch with keepalive
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });

      if (response.ok || response.status === 204) {
        // Success
      } else if (response.status >= 500) {
        // Server error - retry
        requeueEvents(readyEvents);
      }
      // 4xx errors - don't retry
    }
  } catch (error) {
    // Network error - retry
    requeueEvents(readyEvents);
  }

  isFlushing = false;

  // Schedule next flush if there are still events
  if (eventQueue.length > 0) {
    scheduleFlush();
  }
}

function requeueEvents(events: QueuedEvent[]): void {
  for (const queued of events) {
    queued.attempts++;

    if (queued.attempts >= MAX_RETRY_ATTEMPTS) {
      // Give up after max retries
      continue;
    }

    queued.nextRetry = Date.now() + calculateBackoff(queued.attempts);
    eventQueue.push(queued);
  }
}

// ============================================================================
// Device & Location Detection
// ============================================================================

function getDeviceType(): string {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  const ua = navigator.userAgent;

  // Mobile detection
  if (/Android/i.test(ua) || /iPhone/i.test(ua) || /iPad/i.test(ua) || /iPod/i.test(ua) || /webOS/i.test(ua) || /BlackBerry/i.test(ua) || /Opera Mini/i.test(ua) || /IEMobile/i.test(ua)) {
    return 'mobile';
  }

  // Tablet detection
  if (/iPad/i.test(ua) || /Android(?!.*Mobile)/i.test(ua) || /Tablet/i.test(ua)) {
    return 'tablet';
  }

  // Desktop
  return 'desktop';
}

function getCountryFromTimezone(): string {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat === 'undefined') {
    return 'unknown';
  }

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Extract region from timezone (e.g., "America/New_York" -> "US")
    const parts = timeZone.split('/');
    if (parts.length >= 2) {
      const region = parts[0];

      // Simple mapping for common regions
      const regionToCountry: Record<string, string> = {
        Europe: 'EU',
        America: 'US',
        Asia: 'AS',
        Africa: 'AF',
        Australia: 'AU',
        Pacific: 'OC',
        Atlantic: 'AT',
        Arctic: 'AR',
        Antarctica: 'AN',
      };

      return regionToCountry[region] ?? 'unknown';
    }
  } catch {
    // Ignore
  }

  return 'unknown';
}

// ============================================================================
// Main Analytics Class
// ============================================================================

class AnalyticsSDK {
  private config: AnalyticsConfig = {
    enabled: true,
    debug: false,
    autoTrackPageViews: false,
  };

  private walletHash: string | null = null;
  private initialized = false;

  /**
   * Initialize the analytics SDK.
   */
  initialize(config?: Partial<AnalyticsConfig>): void {
    if (this.initialized) {
      return;
    }

    this.config = {
      ...this.config,
      ...config,
    };

    // Initialize visitor and session IDs
    getOrCreateVisitorId();
    getOrCreateSessionId();

    this.initialized = true;

    if (this.config.debug) {
      console.log('[AnalyticsSDK] Initialized', {
        visitorId: getFromStorage(getLocalStorage(), VISITOR_ID_KEY),
        sessionId: getFromStorage(getSessionStorage(), SESSION_ID_KEY),
      });
    }
  }

  /**
   * Set the wallet hash for authenticated users.
   * Call this after wallet connection.
   */
  async setWalletAddress(walletAddress: string): Promise<void> {
    if (!walletAddress) {
      this.walletHash = null;
      return;
    }

    try {
      this.walletHash = await hashWalletAddress(walletAddress);
      if (this.config.debug) {
        console.log('[AnalyticsSDK] Wallet hash set:', this.walletHash);
      }
    } catch (error) {
      console.error('[AnalyticsSDK] Failed to hash wallet:', error);
      this.walletHash = null;
    }
  }

  /**
   * Clear the wallet hash (on disconnect).
   */
  clearWallet(): void {
    this.walletHash = null;
  }

  /**
   * Check if analytics consent is given.
   */
  private hasConsent(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    try {
      const consent = localStorage.getItem('cookieConsent');
      if (!consent) return false;

      const preferences = JSON.parse(consent) as { analytics?: boolean };
      return preferences.analytics === true;
    } catch {
      return false;
    }
  }

  /**
   * Track an analytics event.
   */
  async trackEvent(
    eventName: AnalyticsEventName,
    metadata?: Record<string, unknown>,
    options?: { force?: boolean }
  ): Promise<void> {
    // Check consent unless forced
    if (!options?.force && !this.hasConsent()) {
      if (this.config.debug) {
        console.log('[AnalyticsSDK] Skipping event (no consent):', eventName);
      }
      return;
    }

    if (!this.config.enabled) {
      return;
    }

    const sessionId = getOrCreateSessionId();

    // Check for duplicates
    if (isDuplicateEvent(eventName, sessionId)) {
      if (this.config.debug) {
        console.log('[AnalyticsSDK] Duplicate event skipped:', eventName);
      }
      return;
    }

    const visitorId = getOrCreateVisitorId();
    const timestamp = new Date().toISOString();

    // Get page info
    const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';
    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

    // Build event
    const event: AnalyticsEvent = {
      event_name: eventName,
      visitor_id: visitorId,
      session_id: sessionId,
      wallet_hash: this.walletHash,
      timestamp,
      page_url: pageUrl,
      referrer,
      user_agent: userAgent,
      device_type: getDeviceType(),
      country: getCountryFromTimezone(),
      metadata: metadata ?? {},
    };

    // Mark as sent for deduplication
    markEventAsSent(eventName, sessionId);

    if (this.config.debug) {
      console.log('[AnalyticsSDK] Tracking event:', event);
    }

    // Queue for sending
    queueEvent(event);

    // Parallel track: fire GA4 event (silently no-ops if not loaded)
    const ga4EventName = ANALYTICS_TO_GA4[eventName];
    if (ga4EventName) {
      ga4Track(ga4EventName, {
        ...metadata,
        event_category: 'engagement',
        event_label: eventName,
      });
    }
  }

  /**
   * Track landing visit (call on app mount).
   * Also fires a GA4 page_view.
   */
  async trackLandingVisit(): Promise<void> {
    // Check for 24h return
    const lastVisit = getLastVisit();
    const now = Date.now();

    if (lastVisit !== null) {
      const deltaMs = now - lastVisit;
      const MIN_GAP_MS = 60000; // 1 minute
      const WINDOW_MS = 86400000; // 24 hours

      if (deltaMs >= MIN_GAP_MS && deltaMs <= WINDOW_MS) {
        await this.trackEvent('return_24h');
      }
    }

    // Update last visit (only with consent — this creates a persistent identifier)
    if (this.hasConsent()) {
      setLastVisit();
    }

    // Track landing
    await this.trackEvent('landing_visit', {
      landing_page: typeof window !== 'undefined' ? window.location.pathname : '/',
      utm_source: this.getUtmParam('utm_source'),
      utm_campaign: this.getUtmParam('utm_campaign'),
      utm_medium: this.getUtmParam('utm_medium'),
    });

    // GA4 page_view fires inside trackEvent via the mapping above
  }

  /**
   * Get UTM parameter from URL.
   */
  private getUtmParam(param: string): string | undefined {
    if (typeof window === 'undefined' || !window.location.search) {
      return undefined;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get(param) ?? undefined;
  }

  /**
   * Enable analytics.
   * Also attempts to initialise GA4 if consent permits.
   */
  async enable(): Promise<void> {
    this.config.enabled = true;
  }

  /**
   * Disable analytics.
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Set debug mode.
   */
  setDebug(debug: boolean): void {
    this.config.debug = debug;
  }

  /**
   * Flush pending events immediately.
   */
  async flush(): Promise<void> {
    await flushEvents();
  }

  /**
   * Get current visitor ID (for debugging).
   */
  getVisitorId(): string {
    return getOrCreateVisitorId();
  }

  /**
   * Get current session ID (for debugging).
   */
  getSessionId(): string {
    return getOrCreateSessionId();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const analytics = new AnalyticsSDK();

// Auto-initialize on import (optional)
if (typeof window !== 'undefined') {
  analytics.initialize();
}

// ============================================================================
// Convenience Functions
// ============================================================================

export const trackEvent = analytics.trackEvent.bind(analytics);
export const trackLandingVisit = analytics.trackLandingVisit.bind(analytics);
export const setWalletAddress = analytics.setWalletAddress.bind(analytics);
export const clearWallet = analytics.clearWallet.bind(analytics);
