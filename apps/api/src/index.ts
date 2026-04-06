import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
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
import logger from "./lib/logger";
import { errorHandlerMiddleware } from "./middleware/error-handler";
import { initializeConfig } from "./lib/config";
import { cryptoPaymentService } from "./lib/crypto-payment.service";

// Conditionally import RAG routes (only if @qdrant/js-client-rest is installed)
// This allows the app to start even if RAG dependencies are missing
import rag from "./routes/rag";
import { sanitizeMiddleware } from "./middleware/sanitize";
import { rateLimitMiddleware } from "./lib/ratelimit";
import { metricsMiddleware } from "./middleware/metrics";
import { getMetrics } from "./lib/metrics";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize secret manager configuration (async, but don't block startup)
initializeConfig().catch((error) => {
  logger.error('Failed to initialize secret manager configuration:', error);
  // Continue startup - will fall back to environment variables
});

// Register error handlers IMMEDIATELY to catch any errors during initialization
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error) {
    console.error('Error stack:', reason.stack);
    console.error('Error message:', reason.message);
  }
  // Don't exit in development - let the server continue for debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  console.error('Error stack:', error.stack);
  console.error('Error message:', error.message);
  // Always exit on uncaught exceptions
  process.exit(1);
});

const app = express();

// Request ID tracking (must be before other middleware)
import { requestIdMiddleware } from './middleware/request-id';
app.use(requestIdMiddleware);

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

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
app.use('/beta/chat', express.json({ limit: '100kb' }));
// Increase body size limit for RAG indexing (documents can be larger)
app.use('/api/rag/index', express.json({ limit: '500kb' })); // Allow larger documents for indexing


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
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  permittedCrossDomainPolicies: false,
  originAgentCluster: true,
};

// Only add upgradeInsecureRequests in production
if (process.env.NODE_ENV === 'production') {
  helmetConfig.contentSecurityPolicy.directives.upgradeInsecureRequests = [];
}

app.use(helmet(helmetConfig));

// Apply general rate limiting to all routes (before specific route handlers)
app.use('/api', rateLimitMiddleware);

// Metrics middleware (after rate limiting, before routes)
app.use(metricsMiddleware);

app.get("/healthz", (_req, res) => res.send("ok"));
app.get("/readyz", (_req, res) => res.send("ready"));

// Prometheus metrics endpoint
app.get("/metrics", async (_req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

app.use("/api/subscribe", subscribe);
app.use("/api/contact", contact);
app.use("/api/testing", testing); // Dev/testing endpoints (keep for backward compatibility)
app.use("/api/auth", auth); // Production auth endpoints
app.use("/beta", betaChat);
app.use("/api/chat", chat);
app.use("/api/did", did);
app.use("/api/payment", payment);
app.use("/api/rag", rag);

// serve built web app
const dist = path.join(__dirname, "../../web/dist");
// Fallback to frontend/dist if web/dist doesn't exist (for Docker deployments)
const frontendDist = path.join(__dirname, "../../frontend/dist");
const actualDist = fs.existsSync(dist) ? dist : (fs.existsSync(frontendDist) ? frontendDist : dist);
if (fs.existsSync(actualDist)) {
  app.use(express.static(actualDist));
  app.get("*", (_req, res) => {
    const indexPath = path.join(actualDist, "index.html");
    if (fs.existsSync(indexPath)) {
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

// Global error handler (must be last middleware)
app.use(errorHandlerMiddleware);

const PORT = Number(process.env.PORT || 3001);

// Wrap server startup in try-catch to catch any synchronous errors
logger.info('About to start server...');
let server: any;
try {
  logger.info(`Attempting to start server on port ${PORT}...`);
  server = app.listen(PORT, () => {
    try {
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

      // Validate Scaleway API key (check environment variables)
      const scalewayApiKey = process.env.SCALEWAY_API_KEY;
      if (scalewayApiKey) {
        logger.info('Scaleway API key configured');
      } else {
        logger.warn('WARNING: SCALEWAY_API_KEY not found. Chat functionality will not work.');
        logger.info('Set SCALEWAY_API_KEY in your .env file to enable chat functionality.');
      }

      // Validate Crypto Payment Service configuration
      const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;
      const paymentAddress = process.env.CRYPTO_PAYMENT_CONTRACT_ADDRESS;
      
      if (cryptoPaymentService.isConfigured()) {
        logger.info('✅ Crypto payment service fully configured');
        logger.info(`   Payment recipient: ${paymentAddress}`);
        logger.info(`   RPC endpoint: ${rpcUrl ? 'configured' : 'not set'}`);
      } else {
        logger.warn('⚠️  WARNING: Crypto payment service not fully configured');
        if (!rpcUrl) {
          logger.warn('   Missing: RPC_URL or ETH_RPC_URL (required for blockchain interactions)');
          logger.info('   Set RPC_URL in your .env file (e.g., RPC_URL=https://eth.llamarpc.com)');
        }
        if (!paymentAddress) {
          logger.warn('   Missing: CRYPTO_PAYMENT_CONTRACT_ADDRESS (required for receiving payments)');
          logger.info('   Set CRYPTO_PAYMENT_CONTRACT_ADDRESS in your .env file');
        }
        logger.warn('   Crypto payments will not work until both are configured.');
      }
    } catch (callbackError) {
      logger.error('Error in server callback:', callbackError);
      if (callbackError instanceof Error) {
        logger.error('Callback error stack:', callbackError.stack);
      }
    }
  });

  // Handle server errors
  server.on('error', (error: Error) => {
    logger.error('Server error:', error);
    if (error.message.includes('EADDRINUSE')) {
      logger.error(`Port ${PORT} is already in use. Please stop the other process or use a different port.`);
    }
    process.exit(1);
  });
  
  // Keep process alive
  server.on('listening', () => {
    logger.info(`Server successfully started on port ${PORT}`);
  });
} catch (error: any) {
  logger.error('Failed to start server:', error);
  if (error.stack) {
    logger.error('Stack trace:', error.stack);
  }
  if (error.message) {
    logger.error('Error message:', error.message);
  }
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    logger.warn('Server not initialized, exiting directly.');
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    logger.warn('Server not initialized, exiting directly.');
    process.exit(0);
  }
});