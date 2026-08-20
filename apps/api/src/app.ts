import express from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import subscribe from "./routes/subscribe";
import contact from "./routes/contact";
import testing from "./routes/testing";
import chat from "./routes/chat";
import betaChat from "./routes/beta-chat";
import did from "./routes/did";
import auth from "./routes/auth";
import payment from "./routes/payment";
import subscription from "./routes/subscription";
import rag from "./routes/rag";
import admin from "./routes/admin";
import crisis from "./routes/crisis";
import metricsRoutes from "./routes/metrics";
import analyticsRoutes from "./routes/analytics";
import analyticsDashboardRoutes from "./routes/analytics-dashboard";
import accountRoutes from "./routes/account";

import logger from "./lib/logger";
import { errorHandlerMiddleware } from "./middleware/error-handler";
import { sanitizeMiddleware } from "./middleware/sanitize";
import { rateLimitMiddleware } from "./lib/ratelimit";
import { metricsMiddleware } from "./middleware/metrics";
import { getMetrics } from "./lib/metrics";
import { requireMetricsAuth } from "./middleware/metrics-auth";

// Request ID tracking (must be before other middleware)
import { requestIdMiddleware } from "./middleware/request-id";

export function createApp() {
  const app = express();

  app.use(requestIdMiddleware);

  // Trust proxy for accurate IP addresses (important for rate limiting)
  app.set("trust proxy", 1);

  // Configure CORS - NEVER default to '*'
  const isProd = process.env.NODE_ENV === "production";
  function parseAllowedOrigins(): string[] {
    const raw = (process.env.FRONTEND_URL || "").trim();
    const defaults = isProd
      ? ["https://polinapsycho.com", "https://www.polinapsycho.com"]
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:5173",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:5173",
        ];

    const origins = raw
      ? raw
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : defaults;

    // Production safety: do not allow wildcards or invalid URL-like origins.
    if (isProd) {
      for (const origin of origins) {
        if (origin === "*" || origin.includes("*")) {
          throw new Error("Invalid FRONTEND_URL: wildcard origins are not allowed in production");
        }
        // Basic URL validation: CORS origins must be absolute URL origins.
        try {
          const u = new URL(origin);
          if (!u.protocol || !u.host) throw new Error("invalid");
        } catch {
          throw new Error(`Invalid FRONTEND_URL origin in production: "${origin}"`);
        }
      }
    }

    return origins;
  }
  const allowedOrigins = parseAllowedOrigins();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no Origin header (server-to-server, health checks, curl, etc.).
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        logger.warn(`CORS blocked origin: ${origin}`);
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-wallet-address",
        "x-wallet-signature",
        "x-wallet-message",
        "x-chain-id",
        "x-did-hash",
      ],
      exposedHeaders: ["X-Request-ID"],
    })
  );

  app.use(cookieParser());

  // Configure body parser with size limits (must be before sanitization)
  app.use(express.json({ limit: "10kb" })); // Default limit to 10KB to prevent DoS
  app.use("/api/chat/completions", express.json({ limit: "100kb" }));
  app.use("/beta/chat", express.json({ limit: "100kb" }));
  app.use("/api/rag/index", express.json({ limit: "500kb" }));

  // Input sanitization middleware (after body parser, before routes)
  app.use(sanitizeMiddleware());

  // Configure Helmet with enhanced security headers (Helmet v8 compatible)
  const helmetConfig: any = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for React development
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    permittedCrossDomainPolicies: false,
    originAgentCluster: true,
  };

  if (isProd) {
    helmetConfig.contentSecurityPolicy.directives.upgradeInsecureRequests = [];
  }

  app.use(helmet(helmetConfig));

  // Apply general rate limiting to all routes (before specific route handlers)
  app.use("/api", rateLimitMiddleware);

  // Metrics middleware (after rate limiting, before routes)
  app.use(metricsMiddleware);

  app.get("/healthz", (_req, res) => res.send("ok"));
  app.get("/readyz", (_req, res) => res.send("ready"));

  app.get("/metrics", requireMetricsAuth, async (_req, res) => {
    try {
      const metrics = await getMetrics();
      res.set("Content-Type", "text/plain; version=0.0.4");
      res.send(metrics);
    } catch (error) {
      logger.error("Error generating metrics:", error);
      res.status(500).send("Error generating metrics");
    }
  });

  app.use("/api/subscribe", subscribe);
  app.use("/api/contact", contact);
  if (!isProd) {
    app.use("/api/testing", testing);
  } else {
    app.use("/api/testing", (_req, res) => {
      return res.status(404).json({ error: "Not found" });
    });
  }
  app.use("/api/auth", auth);
  app.use("/api/account", accountRoutes);
  app.use("/beta", betaChat);
  app.use("/api/chat", chat);
  app.use("/api/did", did);
  app.use("/api/payment", payment);
  app.use("/api/subscription", subscription);
  app.use("/api/rag", rag);
  app.use("/api/admin", admin);
  app.use("/api/crisis", crisis);
  app.use("/api/metrics", metricsRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/analytics/dashboard", analyticsDashboardRoutes);

  // serve built web app
  const dist = path.join(__dirname, "../../web/dist");
  const frontendDist = path.join(__dirname, "../../frontend/dist");
  const actualDist = fs.existsSync(dist) ? dist : fs.existsSync(frontendDist) ? frontendDist : dist;
  if (fs.existsSync(actualDist)) {
    app.use(
      express.static(actualDist, {
        setHeaders: (res, filePath) => {
          // Avoid caching the SPA HTML shell; stale HTML can break deploy rollouts.
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-store");
          }
        },
      })
    );
    app.get("*", (_req, res) => {
      const indexPath = path.join(actualDist, "index.html");
      if (fs.existsSync(indexPath)) {
        res.setHeader("Cache-Control", "no-store");
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ error: "Frontend not built. Run 'npm run build:web'" });
      }
    });
  } else {
    app.get("*", (_req, res) => {
      res.status(404).json({ error: "Frontend not built. Run 'npm run build:web'" });
    });
  }

  app.use(errorHandlerMiddleware);

  return app;
}

