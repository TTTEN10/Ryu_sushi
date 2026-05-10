import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

import { createApp } from "../app";

const upsertWaitlistSignup = vi.fn();
const sheetsMockState = { enabled: true };
const dbState = new Set<string>();

vi.mock("../lib/prisma", () => ({
  prisma: {
    emailSubscription: {
      findUnique: vi.fn(async ({ where }: any) => {
        const email = String(where?.email || "").toLowerCase();
        return dbState.has(email) ? { email } : null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const email = String(data?.email || "").toLowerCase();
        if (dbState.has(email)) {
          const err: any = new Error("Unique constraint failed");
          err.code = "P2002";
          throw err;
        }
        dbState.add(email);
        return { email };
      }),
    },
  },
}));

vi.mock("../lib/googleSheets", async () => {
  const actual: any = await vi.importActual("../lib/googleSheets");
  return {
    ...actual,
    createGoogleSheetsService: () => ({
      isEnabled: () => sheetsMockState.enabled,
      upsertWaitlistSignup,
    }),
  };
});

vi.mock("../lib/emailService", () => ({
  createEmailService: () => ({
    sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendAdminNotificationEmail: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../lib/ratelimit", async () => {
  const actual: any = await vi.importActual("../lib/ratelimit");
  return {
    ...actual,
    subscriptionRateLimitMiddleware: (_req: any, _res: any, next: any) => next(),
  };
});

describe("POST /api/subscribe", () => {
  const app = createApp();

  beforeEach(() => {
    sheetsMockState.enabled = true;
    upsertWaitlistSignup.mockReset();
    dbState.clear();
  });

  it("rejects invalid emails", async () => {
    const res = await request(app).post("/api/subscribe").send({ email: "invalid", consentGiven: true });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(upsertWaitlistSignup).not.toHaveBeenCalled();
  });

  it("requires consent", async () => {
    const res = await request(app).post("/api/subscribe").send({ email: "test@example.com" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: "Consent is required" });
    expect(upsertWaitlistSignup).not.toHaveBeenCalled();
  });

  it("creates a new subscription when email not present", async () => {
    upsertWaitlistSignup.mockResolvedValueOnce("created");

    const res = await request(app).post("/api/subscribe").send({ email: "test@example.com", consentGiven: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "Thanks! We'll email you product updates." });
  });

  it("is idempotent: returns success with a different message on duplicates", async () => {
    const res1 = await request(app).post("/api/subscribe").send({ email: "dup@example.com", consentGiven: true });
    expect(res1.status).toBe(200);

    const res2 = await request(app).post("/api/subscribe").send({ email: "dup@example.com", consentGiven: true });
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.message).toMatch(/already on the waitlist/i);
  });

  it("does not attempt Google Sheets when disabled", async () => {
    sheetsMockState.enabled = false;
    const res = await request(app).post("/api/subscribe").send({ email: "new@example.com", consentGiven: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(upsertWaitlistSignup).not.toHaveBeenCalled();
  });
});

