import { describe, it, expect, vi } from "vitest";
import request from "supertest";

import { createApp } from "../app";
import { SUPPORTED_CHAIN_ID } from "../lib/constants";

/**
 * Contract: POST /api/auth/wallet/connect
 * - Joi validates JSON body (`address` required; `chainId` optional in schema but route enforces Sepolia).
 * - Missing or empty body fails validation before wallet middleware (400, not 401).
 */
vi.mock("../lib/ratelimit", async () => {
  const actual: Record<string, unknown> = await vi.importActual("../lib/ratelimit");
  return {
    ...actual,
    strictAuthRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
    walletAuthRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

describe("POST /api/auth/wallet/connect", () => {
  const app = createApp();
  const validAddress = "0x1234567890123456789012345678901234567890";

  it("returns 400 without a valid JSON body (empty object or no POST body)", async () => {
    const emptyObject = await request(app)
      .post("/api/auth/wallet/connect")
      .set("Content-Type", "application/json")
      .send({});

    expect(emptyObject.status).toBe(400);
    expect(emptyObject.body).toMatchObject({
      success: false,
      message: "Validation error",
    });
    expect(Array.isArray(emptyObject.body.errors)).toBe(true);
    expect(emptyObject.body.errors.length).toBeGreaterThan(0);

    const noPayload = await request(app).post("/api/auth/wallet/connect");
    expect(noPayload.status).toBe(400);
    expect(noPayload.body.success).toBe(false);
  });

  it("returns 200 with SIWE challenge when body includes address and supported chainId", async () => {
    const res = await request(app)
      .post("/api/auth/wallet/connect")
      .set("Content-Type", "application/json")
      .send({ address: validAddress, chainId: SUPPORTED_CHAIN_ID });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      address: validAddress.toLowerCase(),
      chainId: SUPPORTED_CHAIN_ID,
    });
    expect(typeof res.body.data.nonce).toBe("string");
    expect(res.body.data.nonce).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(typeof res.body.data.message).toBe("string");
    expect(res.body.data.message.length).toBeGreaterThan(0);
  });
});
