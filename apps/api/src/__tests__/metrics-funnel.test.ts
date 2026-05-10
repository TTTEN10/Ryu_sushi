import { describe, it, expect, vi } from "vitest";
import request from "supertest";

import { createApp } from "../app";

vi.mock("../lib/ratelimit", async () => {
  const actual: any = await vi.importActual("../lib/ratelimit");
  return {
    ...actual,
    funnelRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

describe("POST /api/metrics/funnel", () => {
  const app = createApp();

  it("returns 400 when v is not 1", async () => {
    const res = await request(app)
      .post("/api/metrics/funnel")
      .send({ v: 2, firstLandingAt: "2026-05-10T12:00:00.000Z" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when no timestamp fields are present", async () => {
    const res = await request(app).post("/api/metrics/funnel").send({ v: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/timestamp/i);
  });

  it("returns 400 on unknown field", async () => {
    const res = await request(app)
      .post("/api/metrics/funnel")
      .send({
        v: 1,
        firstLandingAt: "2026-05-10T12:00:00.000Z",
        walletAddress: "0xabc",
      });
    expect(res.status).toBe(400);
  });

  it("returns 204 for valid payload", async () => {
    const res = await request(app)
      .post("/api/metrics/funnel")
      .send({
        v: 1,
        firstLandingAt: "2026-05-10T12:00:00.000Z",
        walletClickAt: "2026-05-10T12:01:00.000Z",
      });
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
  });
});
