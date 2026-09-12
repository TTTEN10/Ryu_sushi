import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Rate limiting (simple in-memory implementation)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const userRequests = rateLimitStore.get(ip) || [];
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);
  next();
});

// Cleanup rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitStore.entries()) {
    const recent = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    if (recent.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, recent);
    }
  }
}, 5 * 60 * 1000);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const db = new Database(path.join(__dirname, 'ryu-sushi.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    guests TEXT NOT NULL,
    date TEXT NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS newsletter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

// Input validation helpers
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 1000); // Limit length
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendEmail(subject, html) {
  if (!process.env.SMTP_USER) {
    console.log(`[Email skipped] ${subject}`);
    return Promise.resolve();
  }
  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'hello@ryusushi.com',
    to: process.env.ADMIN_EMAIL || 'hello@ryusushi.com',
    subject,
    html,
  });
}

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Nom valide requis' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Email valide requis' });
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    return res.status(400).json({ error: 'Message requis (10 caractères minimum)' });
  }

  const sanitizedName = sanitizeInput(name);
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedMessage = sanitizeInput(message);

  try {
    db.prepare('INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)').run(
      sanitizedName,
      sanitizedEmail,
      sanitizedMessage
    );
    sendEmail(
      `Contact from ${sanitizedName}`,
      `<p><strong>${sanitizedName}</strong> (${sanitizedEmail})</p><p>${sanitizedMessage}</p>`
    );
    res.json({ success: true, message: 'Message envoyé avec succès' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

app.post('/reservation', (req, res) => {
  const { name, phone, email, guests, date, message } = req.body;

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Nom valide requis' });
  }
  if (!phone || typeof phone !== 'string' || phone.replace(/[\s-]/g, '').length < 10) {
    return res.status(400).json({ error: 'Numéro de téléphone valide requis' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Email valide requis' });
  }
  if (!guests || typeof guests !== 'string' || guests.trim().length === 0) {
    return res.status(400).json({ error: 'Nombre de personnes requis' });
  }
  if (!date || typeof date !== 'string' || date.trim().length === 0) {
    return res.status(400).json({ error: 'Date requise' });
  }

  const sanitizedName = sanitizeInput(name);
  const sanitizedPhone = sanitizeInput(phone);
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedGuests = sanitizeInput(guests);
  const sanitizedDate = sanitizeInput(date);
  const sanitizedMessage = message ? sanitizeInput(message) : '';

  try {
    db.prepare(
      'INSERT INTO reservations (name, phone, email, guests, date, message) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(sanitizedName, sanitizedPhone, sanitizedEmail, sanitizedGuests, sanitizedDate, sanitizedMessage);
    sendEmail(
      `Reservation from ${sanitizedName}`,
      `<p><strong>${sanitizedName}</strong> — ${sanitizedGuests} personnes le ${sanitizedDate}</p><p>Téléphone: ${sanitizedPhone}, Email: ${sanitizedEmail}</p><p>${sanitizedMessage || ''}</p>`
    );
    res.json({ success: true, message: 'Réservation envoyée avec succès' });
  } catch (err) {
    console.error('Reservation error:', err);
    res.status(500).json({ error: 'Erreur lors de la réservation' });
  }
});

app.post('/newsletter', (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Email valide requis' });
  }

  const sanitizedEmail = sanitizeInput(email);

  try {
    db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(sanitizedEmail);
    res.json({ success: true, message: 'Inscription réussie à la newsletter' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email déjà inscrit' });
    }
    console.error('Newsletter error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

app.post('/email/send', (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !isValidEmail(to)) {
    return res.status(400).json({ error: 'Email valide requis' });
  }
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return res.status(400).json({ error: 'Sujet requis' });
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'Contenu requis' });
  }

  const sanitizedTo = sanitizeInput(to);
  const sanitizedSubject = sanitizeInput(subject);
  const sanitizedBody = sanitizeInput(body);

  sendEmail(sanitizedSubject, sanitizedBody)
    .then(() => res.json({ success: true }))
    .catch((err) => {
      console.error('Send email error:', err);
      res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Ryu Sushi API running on http://localhost:${PORT}`);
});
