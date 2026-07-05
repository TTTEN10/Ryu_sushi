import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { append, existsWhere } from "./store.js";
import { sendContactEmail, sendNewsletterWelcome } from "./mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Security: Parse body before helmet to ensure CSP nonces work
app.use(express.json({ limit: "16kb" })); // Reduced from 32kb for security

// Security: Apply helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false }, // Disable DNS prefetch for privacy
  frameguard: { action: "deny" }, // Prevent clickjacking
  hidePoweredBy: true, // Remove X-Powered-By header
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true, // X-Download-Options for IE
  noSniff: true, // X-Content-Type-Options
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true, // XSS protection
}));

// Security: CORS with restricted origins in production
if (process.env.NODE_ENV === "production") {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? [process.env.CORS_ORIGIN]
    : ["https://tenenbaum.example.com"];

  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: false,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    maxAge: 86400, // 24 hours
  }));
} else {
  // Development: allow all
  app.use(cors());
}

/* --- Enhanced rate limiter with IP trust proxy support ----------------- */
const hits = new Map();
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000; // 15 min default
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 20; // 20 requests per window

function rateLimit({ windowMs = WINDOW_MS, max = MAX_REQUESTS } = {}) {
  return (req, res, next) => {
    // Use X-Forwarded-For IP if behind proxy, otherwise use direct IP
    const forwardedFor = req.headers['x-forwarded-for'];
    const key = forwardedFor
      ? String(forwardedFor).split(',')[0].trim()
      : String(req.ip || 'unknown');

    const now = Date.now();
    const rec = hits.get(key) || { count: 0, reset: now + windowMs };

    if (now > rec.reset) {
      rec.count = 0;
      rec.reset = now + windowMs;
    }

    rec.count += 1;
    hits.set(key, rec);

    // Add rate limit headers to all responses
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - rec.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil(rec.reset / 1000)));

    if (rec.count > max) {
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((rec.reset - now) / 1000)
      });
    }
    next();
  };
}

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of hits.entries()) {
    if (now > rec.reset + 60000) { // Remove entries 1 minute after reset
      hits.delete(key);
    }
  }
}, 300000); // Run every 5 minutes

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (v) => EMAIL_RE.test(String(v || "").trim());

// Enhanced sanitization with XSS and injection protection
const clean = (v, max = 2000) => {
  if (v === null || v === undefined) return "";
  let cleaned = String(v).trim();
  // Remove potential XSS patterns
  cleaned = cleaned.replace(/[<>]/g, "");
  // Remove javascript: URLs
  cleaned = cleaned.replace(/javascript:/gi, "");
  // Remove data: URLs that could execute scripts
  cleaned = cleaned.replace(/data:text\/html/gi, "");
  // Limit length
  return cleaned.slice(0, max);
};

// Additional sanitization for email fields (stricter)
const cleanEmail = (v) => {
  if (v === null || v === undefined) return "";
  return String(v).trim().toLowerCase().slice(0, 254);
};

app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* --- Contact form ------------------------------------------------------ */
app.post("/api/contact", rateLimit(), async (req, res) => {
  try {
    const body = req.body || {};

    // Honeypot: bots fill hidden fields; humans don't.
    if (body.website) return res.status(200).json({ ok: true });

    const data = {
      name: clean(body.name, 120),
      company: clean(body.company, 160),
      email: cleanEmail(body.email),
      subject: clean(body.subject, 120),
      message: clean(body.message, 5000),
      consent: Boolean(body.consent),
    };

    const errors = {};
    if (!data.name || data.name.length < 2) errors.name = "Please enter your full name.";
    if (!isEmail(data.email)) errors.email = "A valid email is required.";
    if (!data.subject || data.subject.length < 3) errors.subject = "Please select a subject.";
    if (data.message.length < 10) errors.message = "Message is too short (minimum 10 characters).";
    if (!data.consent) errors.consent = "You must accept the privacy policy.";

    // Additional validation: check for suspicious patterns
    const suspiciousPatterns = [
      /http:\/\/|https:\/\//i, // URLs in messages (potential spam)
      /<script|<\/script>/i, // Script tags
      /eval\(|alert\(|confirm\(/i, // JS functions
      /\b(casino|lottery|winner|prize)\b/i, // Common spam keywords
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(data.message)) {
        // Silently accept to avoid tipping off spammers
        return res.status(200).json({ ok: true, flagged: true });
      }
    }

    if (Object.keys(errors).length) {
      return res.status(422).json({ message: "Please check the form.", errors });
    }

    const record = await append("submissions", { ...data, ip: req.ip });
    const mail = await sendContactEmail(data);

    return res.status(201).json({ ok: true, id: record.id, delivered: mail.delivered });
  } catch (err) {
    console.error("contact error", err);
    return res.status(500).json({ message: "Unable to send your message right now." });
  }
});

/* --- Newsletter -------------------------------------------------------- */
app.post("/api/newsletter", rateLimit(), async (req, res) => {
  try {
    const email = cleanEmail(req.body?.email);
    if (!isEmail(email)) {
      return res.status(422).json({ message: "Please enter a valid email address." });
    }

    // Check for disposable email domains (common temporary email services)
    const disposableDomains = [
      'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
      '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com'
    ];
    const emailDomain = email.split('@')[1];
    if (disposableDomains.includes(emailDomain)) {
      // Still return success to avoid revealing the check
      return res.status(201).json({ ok: true, flagged: true });
    }

    const already = await existsWhere("subscribers", (s) => s.email === email);
    if (!already) {
      await append("subscribers", { email, ip: req.ip, subscribedAt: new Date().toISOString() });
      await sendNewsletterWelcome(email);
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("newsletter error", err);
    return res.status(500).json({ message: "Unable to subscribe right now." });
  }
});

/* --- Serve the built SPA in production --------------------------------- */
if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "..", "dist");

  // Security: Cache control for static assets
  app.use(express.static(dist, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // Set security headers for static assets
      res.set('X-Content-Type-Options', 'nosniff');

      // Cache HTML files briefly, assets for longer
      if (path.endsWith('.html')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (path.endsWith('.js') || path.endsWith('.css')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // SPA fallback with security checks
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();

    // Prevent directory traversal attacks
    if (req.path.includes('..') || req.path.includes('\\')) {
      return res.status(400).json({ message: "Invalid request path." });
    }

    res.sendFile(path.join(dist, "index.html"));
  });

  // Security: 404 handler for unknown routes
  app.use((req, res) => {
    res.status(404).sendFile(path.join(dist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`✅ API listening on http://localhost:${PORT}`);
});
