/**
 * Privacy-First Analytics Ingestion API
 *
 * Accepts anonymized analytics events for funnel tracking.
 * Validates, sanitizes, and stores events without sensitive data.
 *
 * Security:
 * - Rate limited per IP
 * - Strict schema validation
 * - Metadata sanitization
 * - No PII storage
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import logger from '../lib/logger';
import { prisma } from '../lib/prisma';
import { analyticsEventRateLimit } from '../lib/ratelimit';
import { hashWalletAddress } from '../lib/wallet-hash';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const ALLOWED_EVENT_NAMES = [
  'landing_visit',
  'wallet_click',
  'wallet_success',
  'session_success',
  'did_success',
  'first_message_sent',
  'first_reply_received',
  'return_24h',
] as const;

type AllowedEventName = (typeof ALLOWED_EVENT_NAMES)[number];

const ALLOWED_METADATA_KEYS = new Set([
  // landing_visit
  'landing_page',
  'utm_source',
  'utm_campaign',
  'utm_medium',
  'referrer',
  // wallet_click / wallet_success
  'wallet_provider',
  'chain_id',
  'attempt_count',
  // session_success
  'auth_method',
  // did_success
  'did_method',
  'wallet_linked',
  // first_message_sent
  'conversation_mode',
  // first_reply_received
  'model',
  'response_time_ms',
  // generic
  'error_code',
  'duration_ms',
]);

const AnalyticsEventSchema = z.object({
  event_name: z.enum(ALLOWED_EVENT_NAMES as unknown as [AllowedEventName, ...AllowedEventName[]]),
  visitor_id: z.string().uuid().optional().nullable(),
  session_id: z.string().uuid().optional().nullable(),
  wallet_hash: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'wallet_hash must be 64 hex characters')
    .optional()
    .nullable(),
  timestamp: z.string().datetime().optional(),
  page_url: z.string().max(2048).optional().nullable(),
  referrer: z.string().max(2048).optional().nullable(),
  user_agent: z.string().max(1024).optional().nullable(),
  device_type: z.enum(['mobile', 'tablet', 'desktop', 'unknown']).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

type AnalyticsEventInput = z.infer<typeof AnalyticsEventSchema>;

// ============================================================================
// Metadata Sanitization
// ============================================================================

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Skip disallowed keys
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      continue;
    }

    // Sanitize value based on type
    if (typeof value === 'string') {
      // Truncate long strings
      sanitized[key] = value.slice(0, 500);
    } else if (typeof value === 'number' && isFinite(value)) {
      // Allow finite numbers
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      // Allow booleans
      sanitized[key] = value;
    }
    // Skip objects, arrays, functions, etc.
  }

  return sanitized;
}

// ============================================================================
// Device Type Detection (server-side fallback)
// ============================================================================

function detectDeviceType(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return 'unknown';
  }

  const ua = userAgent.toLowerCase();

  // Mobile detection
  if (/android/i.test(ua) || /iphone/i.test(ua) || /ipad/i.test(ua) || /ipod/i.test(ua) || /webos/i.test(ua) || /blackberry/i.test(ua) || /opera mini/i.test(ua) || /iemobile/i.test(ua)) {
    return 'mobile';
  }

  // Tablet detection
  if (/ipad/i.test(ua) || /android(?!.*mobile)/i.test(ua) || /tablet/i.test(ua)) {
    return 'tablet';
  }

  // Desktop
  return 'desktop';
}

// ============================================================================
// Event Validation
// ============================================================================

function validateEvent(event: unknown): { ok: true; data: AnalyticsEventInput } | { ok: false; message: string } {
  const parsed = AnalyticsEventSchema.safeParse(event);

  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => e.message).join(', ');
    return { ok: false, message: `Validation error: ${errors}` };
  }

  // Additional validation
  const data = parsed.data;

  // Must have at least visitor_id or session_id
  if (!data.visitor_id && !data.session_id) {
    return { ok: false, message: 'Must have visitor_id or session_id' };
  }

  // Validate wallet_hash format if present
  if (data.wallet_hash && !/^[a-f0-9]{64}$/i.test(data.wallet_hash)) {
    return { ok: false, message: 'Invalid wallet_hash format' };
  }

  // Validate timestamp is not in the future
  if (data.timestamp) {
    const eventTime = new Date(data.timestamp).getTime();
    const now = Date.now();
    const fiveMinutesFromNow = now + 5 * 60 * 1000;

    if (eventTime > fiveMinutesFromNow) {
      return { ok: false, message: 'Timestamp cannot be in the future' };
    }

    // Don't accept events older than 30 days
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    if (eventTime < thirtyDaysAgo) {
      return { ok: false, message: 'Timestamp too old (max 30 days)' };
    }
  }

  return { ok: true, data };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/analytics/event
 *
 * Accept single or batch analytics events.
 * Rate limited per IP address.
 */
router.post('/event', analyticsEventRateLimit, async (req: Request, res: Response) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '';

  const events = Array.isArray(req.body) ? req.body : [req.body];

  if (events.length === 0) {
    return res.status(400).json({ success: false, message: 'No events provided' });
  }

  if (events.length > 50) {
    return res.status(400).json({ success: false, message: 'Maximum 50 events per batch' });
  }

  const acceptedEvents: Array<{
    id: string;
    eventName: string;
    visitorId: string | null;
    sessionId: string | null;
    walletHash: string | null;
    timestamp: Date;
    pageUrl: string | null;
    referrer: string | null;
    userAgent: string | null;
    deviceType: string;
    country: string | null;
    metadata: Record<string, unknown> | null;
  }> = [];

  const validationErrors: string[] = [];

  // Validate and sanitize all events
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const validated = validateEvent(event);

    if (!validated.ok) {
      validationErrors.push(`Event ${i}: ${validated.message}`);
      continue;
    }

    const data = validated.data;

    // Sanitize metadata
    const sanitizedMetadata = sanitizeMetadata(data.metadata);

    // Detect device type if not provided
    const deviceType = data.device_type ?? detectDeviceType(data.user_agent);

    // Use server timestamp if not provided
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    acceptedEvents.push({
      id: crypto.randomUUID(),
      eventName: data.event_name,
      visitorId: data.visitor_id ?? null,
      sessionId: data.session_id ?? null,
      walletHash: data.wallet_hash ?? null,
      timestamp,
      pageUrl: data.page_url ?? null,
      referrer: data.referrer ?? null,
      userAgent: data.user_agent ?? null,
      deviceType,
      country: data.country ?? null,
      metadata: sanitizedMetadata,
    });
  }

  if (acceptedEvents.length === 0) {
    logger.warn({
      event: 'analytics_batch_rejected',
      reason: 'all_events_invalid',
      errors: validationErrors,
      ip,
    });

    return res.status(400).json({
      success: false,
      message: 'No valid events',
      errors: validationErrors,
    });
  }

  // Store events in database
  try {
    await prisma.analyticsEvent.createMany({
      data: acceptedEvents.map(event => ({
        eventName: event.eventName,
        visitorId: event.visitorId,
        sessionId: event.sessionId,
        walletHash: event.walletHash,
        timestamp: event.timestamp,
        pageUrl: event.pageUrl,
        referrer: event.referrer,
        userAgent: event.userAgent,
        deviceType: event.deviceType,
        country: event.country,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      })),
    });

    logger.info({
      event: 'analytics_batch_accepted',
      count: acceptedEvents.length,
      events: acceptedEvents.map(e => e.eventName),
      ip,
    });

    // Return success with count
    return res.status(204).send();
  } catch (error) {
    logger.error({
      event: 'analytics_storage_error',
      error: error instanceof Error ? error.message : String(error),
      count: acceptedEvents.length,
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to store events',
    });
  }
});

/**
 * GET /api/analytics/health
 *
 * Health check endpoint for analytics service.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
