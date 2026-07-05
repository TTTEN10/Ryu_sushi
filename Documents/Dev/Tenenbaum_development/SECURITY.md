# Security Policy

## Security Features Implemented

This application implements multiple security layers to protect users and data:

### 1. HTTP Security Headers (Helmet)
- **Content Security Policy (CSP)**: Restricts sources of scripts, styles, and other resources
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS connections
- **X-XSS-Protection**: Enables browser XSS filtering
- **Referrer-Policy**: Controls referrer information

### 2. Rate Limiting
- Configurable rate limiting per IP address
- Default: 20 requests per 15-minute window
- Environment variable configuration:
  - `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds
  - `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

### 3. Input Validation & Sanitization
- Email validation with strict regex
- Input length limits to prevent buffer attacks
- XSS pattern detection and filtering
- SQL injection pattern detection
- Honeypot fields to catch bots

### 4. CORS Protection
- Production: Restricted to configured origins only
- Development: Permissive for local development
- Configurable via `CORS_ORIGIN` environment variable

### 5. Data Protection
- Form submissions stored with IP tracking
- Disposable email domain detection
- Suspicious content pattern filtering
- Automatic data sanitization

### 6. Static Asset Security
- Cache control headers
- Content-Type protection
- Directory traversal prevention

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by emailing:
**security@tenenbaum.example.com**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Environment Variables for Security

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (production/development) | `development` |
| `PORT` | Server port | `3001` |
| `CORS_ORIGIN` | Allowed CORS origin | `https://tenenbaum.example.com` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `20` |
| `SMTP_HOST` | SMTP server host | (none) |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | (none) |
| `SMTP_PASS` | SMTP password | (none) |

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` with your domain
- [ ] Set up HTTPS (Caddy provides automatic HTTPS)
- [ ] Configure SMTP credentials for email
- [ ] Update rate limit settings as needed
- [ ] Review and update Content Security Policy
- [ ] Enable HSTS preload (optional)
- [ ] Set up monitoring and alerting
- [ ] Run `npm audit` to check for vulnerabilities
- [ ] Test all security headers with tools like securityheaders.com

## Dependencies Security

We use automated tools to check for vulnerabilities:
- `npm audit` runs on every build
- Dependencies are regularly updated
- Security patches are applied within 48 hours of release

Run `npm run security:check` to verify all dependencies.

## Docker Security

The Docker implementation includes:
- Multi-stage builds for minimal image size
- Non-root user execution
- Dumb-init for proper signal handling
- Health checks for container monitoring
- Volume isolation for data persistence
