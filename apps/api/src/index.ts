import dotenv from "dotenv";
import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import subscribe from "./routes/subscribe";
import contact from "./routes/contact";
import testing from "./routes/testing";
import chat from "./routes/chat";
import did from "./routes/did";
import auth from "./routes/auth";
import payment from "./routes/payment";
import logger from "./lib/logger";
import { errorHandlerMiddleware } from "./middleware/error-handler";
import { sanitizeMiddleware } from "./middleware/sanitize";

// Load environment variables
dotenv.config();

const app = express();

// Request ID tracking (must be before other middleware)
import { requestIdMiddleware } from './middleware/request-id';
app.use(requestIdMiddleware);

// Configure CORS - NEVER default to '*'
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : process.env.NODE_ENV === 'production'
    ? ['https://safepsy.com', 'https://www.safepsy.com']
    : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) in development only
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address', 'x-wallet-signature', 'x-wallet-message', 'x-chain-id', 'x-did-hash'],
  exposedHeaders: ['X-Request-ID'],
}));

// Configure cookie parser
app.use(cookieParser());

// Configure body parser with size limits (must be before sanitization)
// Higher limit for chat endpoints (handled in route)
app.use(express.json({ limit: '10kb' })); // Default limit to 10KB to prevent DoS

// Increase body size limit for chat routes specifically
app.use('/api/chat/completions', express.json({ limit: '100kb' })); // Allow larger chat messages

// Stripe webhook needs raw body for signature verification
app.use('/api/payment/stripe/webhook', express.raw({ type: 'application/json' }));

// Input sanitization middleware (after body parser, before routes)
app.use(sanitizeMiddleware());

// Configure Helmet with enhanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for React development
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true, // Prevent MIME sniffing
  xssFilter: true, // Enable XSS filter
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  crossOriginEmbedderPolicy: false, // Disable for better compatibility
}));

app.get("/healthz", (_req, res) => res.send("ok"));
app.get("/readyz", (_req, res) => res.send("ready"));

app.use("/api/subscribe", subscribe);
app.use("/api/contact", contact);
app.use("/api/testing", testing); // Dev/testing endpoints (keep for backward compatibility)
app.use("/api/auth", auth); // Production auth endpoints
app.use("/api/chat", chat);
app.use("/api/did", did);
app.use("/api/payment", payment);

// serve built web app
const dist = path.join(__dirname, "../../web/dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

// Global error handler (must be last middleware)
app.use(errorHandlerMiddleware);

const PORT = Number(process.env.PORT || 3001);
const server = app.listen(PORT, () => {
  logger.info(`SafePsy API listening on :${PORT}`);
  
  // Validate IP_SALT on startup if hashing is enabled
  if (process.env.IP_HASHING_ENABLED === 'true') {
    const salt = process.env.IP_SALT;
    if (!salt || salt.length < 32) {
      logger.error('ERROR: IP_SALT must be at least 32 characters for security');
      logger.error('Generate a secure salt with: openssl rand -hex 32');
      process.exit(1);
    }
    logger.info('IP hashing enabled with secure salt');
  } else {
    logger.info('IP hashing disabled (privacy by default)');
  }

  // Validate OpenAI API key
  if (process.env.OPENAI_API_KEY) {
    logger.info('OpenAI API key configured');
  } else {
    logger.warn('WARNING: OPENAI_API_KEY not found. Chat functionality will not work.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});