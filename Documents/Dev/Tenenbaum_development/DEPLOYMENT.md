# Tenenbaum Development - Deployment Guide

## Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev:all

# Frontend: http://localhost:5173
# API: http://localhost:3001
```

### One-Command Deployment

```bash
# Production deployment
./deploy.sh

# Development mode in Docker
./deploy.sh --dev

# Force rebuild
./deploy.sh --build

# Stop containers
./deploy.sh --stop
```

### Verify Production

```bash
# Run health checks
./verify-production.sh

# Verbose output
./verify-production.sh --verbose

# JSON output (for CI/CD)
./verify-production.sh --json
```

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│    Caddy        │────▶│  Express API │────▶│  File Store │
│  (Port 80/443)  │     │  (Port 3001) │     │  (JSON files)│
└─────────────────┘     └──────────────┘     └─────────────┘
       │                       │
       │                       └─────────────▶│  Nodemailer │
       │                                      └─────────────┘
       │
       └───────▶  Vite Dev Server (Port 5173)
                 (development only)
```

## Files Overview

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for production |
| `Dockerfile.dev` | Development build with hot-reload |
| `docker-compose.yml` | Production orchestration |
| `docker-compose.dev.yml` | Development orchestration |
| `deploy.config.yml` | Deployment configuration reference |
| `Caddyfile` | Reverse proxy with automatic HTTPS |
| `deploy.sh` | One-command deployment script |
| `verify-production.sh` | Production health checks |
| `.env` | Environment configuration |
| `DOCKER.md` | Detailed Docker documentation |
| `SECURITY.md` | Security documentation |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required for production
PORT=3001
NODE_ENV=production

# Email (optional - falls back to console logging)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
MAIL_FROM="Tenenbaum <no-reply@example.com>"
MAIL_TO=hello@example.com

# Security (optional)
CORS_ORIGIN=https://tenenbaum.example.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=20
```

## Docker Commands

### Production

```bash
# Build production image
docker-compose build app

# Start all services
docker-compose up -d app caddy

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Check health
curl http://localhost:3001/api/health
```

### Development (Recommended)

```bash
# Start development environment with hot-reload
docker-compose -f docker-compose.dev.yml up

# Start with MailHog for email testing
docker-compose -f docker-compose.dev.yml --profile mail up

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# Rebuild and restart
docker-compose -f docker-compose.dev.yml up --build

# Shell inside container
docker-compose -f docker-compose.dev.yml exec dev sh
```

### Using the Deploy Script

```bash
# Production deployment
./deploy.sh

# Development deployment
./deploy.sh --dev

# Force rebuild
./deploy.sh --build

# Stop containers
./deploy.sh --stop

# View logs
./deploy.sh --logs
```

## Caddy Configuration

Edit `Caddyfile` to configure your domain:

```caddy
# Replace with your actual domain
tenenbaum.example.com {
    reverse_proxy app:3001
    tls {
        email admin@tenenbaum.example.com
    }
}
```

Caddy automatically:
- Obtains SSL certificates from Let's Encrypt
- Renews certificates before expiration
- Redirects HTTP to HTTPS

## Security Features

The application includes:

1. **Helmet Security Headers**
   - Content Security Policy
   - HSTS (2 years with preload)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin

2. **Rate Limiting**
   - 20 requests per 15-minute window (configurable)
   - Per-IP tracking
   - Automatic cleanup

3. **Input Validation**
   - Email validation
   - XSS pattern detection
   - Length limits
   - Honeypot fields

4. **CORS Protection**
   - Restricted origins in production
   - Configurable via environment

## Troubleshooting

### Port already in use
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Docker containers not starting
```bash
# Check Docker daemon
docker info

# Rebuild images
./deploy.sh --build
```

### SSL certificate issues
```bash
# Check Caddy logs
docker-compose logs caddy

# Verify domain DNS points to server
dig tenenbaum.example.com
```

### API not responding
```bash
# Check container health
docker-compose ps

# View API logs
docker-compose logs app
```

## Monitoring

### Health Check Endpoint
```bash
curl http://localhost:3001/api/health
# Response: {"ok":true}
```

### Resource Usage
```bash
docker stats tenenbaum-app tenenbaum-caddy
```

### Log Analysis
```bash
# Recent errors
docker-compose logs --tail=100 app | grep -i error
```

## CI/CD Integration

Example GitHub Actions step:

```yaml
- name: Deploy to Production
  run: |
    ./deploy.sh --build
    ./verify-production.sh --json
```

## Backup Data

Form submissions and newsletter subscribers are stored in `server/data/`:

```bash
# Backup data
docker-compose run --rm app tar -czf /tmp/backup.tar.gz /app/server/data
docker cp tenenbaum-app:/tmp/backup.tar.gz ./backup.tar.gz
```

## Update Deployment

```bash
# Pull latest changes
git pull

# Rebuild and redeploy
./deploy.sh --build

# Verify
./verify-production.sh
```

## Rollback

```bash
# Stop current deployment
./deploy.sh --stop

# Checkout previous version
git checkout <commit-hash>

# Redeploy
./deploy.sh --build
```

## Support

For issues:
1. Check logs: `docker-compose logs app`
2. Run verification: `./verify-production.sh --verbose`
3. Review security: `SECURITY.md`
