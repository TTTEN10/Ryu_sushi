import { Router, Request, Response } from "express";
import logger from "../lib/logger";
import { ipHash } from "../lib/crypto";
import { funnelRateLimitMiddleware } from "../lib/ratelimit";
import { funnelIntakeTotal } from "../lib/metrics";

const router = Router();

/** Mirrors `ProductConversionMetricsV1` in apps/web (no wallet or message content). */
const ALLOWED_KEYS = new Set([
  "v",
  "firstLandingAt",
  "lastSessionStartAt",
  "walletClickAt",
  "walletSuccessAt",
  "sessionSuccessAt",
  "didSuccessAt",
  "firstMessageSentAt",
  "firstReplyReceivedAt",
  "returnWithin24hAt",
]);

const TIMESTAMP_KEYS = [
  "firstLandingAt",
  "lastSessionStartAt",
  "walletClickAt",
  "walletSuccessAt",
  "sessionSuccessAt",
  "didSuccessAt",
  "firstMessageSentAt",
  "firstReplyReceivedAt",
  "returnWithin24hAt",
] as const;

type ValidatedFunnel = { v: 1 } & Partial<Record<(typeof TIMESTAMP_KEYS)[number], string>>;

function validateFunnelPayload(body: unknown): { ok: true; data: ValidatedFunnel } | { ok: false; message: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Invalid JSON body" };
  }

  const raw = body as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) {
      return { ok: false, message: `Unknown field: ${key}` };
    }
  }

  if (raw.v !== 1) {
    return { ok: false, message: "v must be 1" };
  }

  const out: ValidatedFunnel = { v: 1 };

  for (const key of TIMESTAMP_KEYS) {
    const val = raw[key];
    if (val === undefined || val === null || val === "") continue;
    if (typeof val !== "string") {
      return { ok: false, message: `Invalid type for ${key}` };
    }
    if (val.length > 40) {
      return { ok: false, message: `Value too long for ${key}` };
    }
    const ms = Date.parse(val);
    if (Number.isNaN(ms)) {
      return { ok: false, message: `Invalid ISO 8601 timestamp for ${key}` };
    }
    const y = new Date(ms).getUTCFullYear();
    if (y < 2020 || y > 2040) {
      return { ok: false, message: `Timestamp out of range for ${key}` };
    }
    out[key] = val;
  }

  const hasTimestamp = TIMESTAMP_KEYS.some((k) => out[k] !== undefined);
  if (!hasTimestamp) {
    return { ok: false, message: "At least one funnel timestamp field is required" };
  }

  return { ok: true, data: out };
}

router.post("/funnel", funnelRateLimitMiddleware, (req: Request, res: Response) => {
  const parsed = validateFunnelPayload(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.message });
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
  const hashed = ipHash(ip);

  logger.info({
    event: "funnel_intake",
    payload: parsed.data,
    ipHash: hashed ?? null,
  });

  funnelIntakeTotal.inc();
  return res.status(204).send();
});

export default router;
