# 🚀 Deploy Tenenbaum Development

Complete deployment guide for tenenbaum.eu

---

## 🌐 Production Server

- **Server IP:** 163.172.144.14
- **Domain:** tenenbaum.eu
- **Application Directory:** /opt/tenenbaum
- **Ports:** 80 (HTTP), 443 (HTTPS), 3001 (internal API)

---

## ⚡ Quick Start

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

---

## 🚀 Remote Deploy (from local machine)

### Option A: Remote Deploy Script

```bash
./deploy-prod.sh
```

This will:
1. SSH into the production server (163.172.144.14)
2. Install Docker and Node.js if needed
3. Clone the repository from GitHub
4. Build and deploy with Docker Compose
5. Configure Caddy for automatic HTTPS

**Options:**
```bash
./deploy-prod.sh --build      # Force rebuild
./deploy-prod.sh --verify     # Run health checks after deploy
./deploy-prod.sh --status     # Check current deployment status
./deploy-prod.sh --rollback   # Rollback to previous version
./deploy-prod.sh --logs       # Show live logs after deploy
```

### Option B: Server-Side Install (directly on server)

SSH into the server and run:

```bash
curl -sSL https://raw.githubusercontent.com/TTTEN10/Ten-dev/main/install-server.sh | sudo bash
```

Or download and execute:

```bash
wget -qO- https://raw.githubusercontent.com/TTTEN10/Ten-dev/main/install-server.sh | sudo bash
```

---

## 📋 Prerequisites

### For Remote Deploy (`deploy-prod.sh`):
- SSH access to server (163.172.144.14)
- SSH key authentication configured

```bash
# Test SSH connection
ssh root@163.172.144.14

# If needed, set up SSH key
ssh-copy-id root@163.172.144.14
```

### For Server-Side Install:
- Root/sudo access to the server
- Ubuntu/Debian-based system

---

## 🏗️ Architecture

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

---

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for production |
| `Dockerfile.dev` | Development build with hot-reload |
| `docker-compose.yml` | Production orchestration |
| `docker-compose.dev.yml` | Development orchestration |
| `docker-compose.prod.yml` | Production deployment |
| `deploy.config.yml` | Deployment configuration reference |
| `Caddyfile` | Reverse proxy with automatic HTTPS |
| `deploy.sh` | One-command deployment script |
| `deploy-prod.sh` | Remote deployment script |
| `install-server.sh` | Server-side installation script |
| `verify-production.sh` | Production health checks |
| `.env` | Environment configuration |

---

## 🔧 Environment Variables

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

---

## 🐳 Docker Commands

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

---

## 🌐 DNS Configuration

Point your domain to the server:

```
tenenbaum.eu.    IN    A    163.172.144.14
www.tenenbaum.eu IN    A    163.172.144.14
```

SSL certificates are automatically provisioned by Caddy (Let's Encrypt).

---

## 🔒 Caddy Configuration

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

---

## 🔒 Security Features

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

---

## 📦 Post-Deployment

### 1. Configure SMTP (for emails)

Edit `/opt/tenenbaum/.env` on the server:

```bash
ssh root@163.172.144.14
nano /opt/tenenbaum/.env
```

Add your SMTP credentials:
```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
MAIL_FROM="Tenenbaum <no-reply@tenenbaum.eu>"
MAIL_TO=contact@tenenbaum.eu
```

Then restart:
```bash
docker compose -f /opt/tenenbaum/docker-compose.prod.yml restart
```

### 2. Verify Deployment

```bash
# Health check
curl https://tenenbaum.eu/api/health

# View logs
docker compose -f /opt/tenenbaum/docker-compose.prod.yml logs -f

# Check container status
docker compose -f /opt/tenenbaum/docker-compose.prod.yml ps
```

---

## 📊 Monitoring

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

---

## 💾 Backup Data

Form submissions and newsletter subscribers are stored in `server/data/`:

```bash
# Backup data
docker-compose run --rm app tar -czf /tmp/backup.tar.gz /app/server/data
docker cp tenenbaum-app:/tmp/backup.tar.gz ./backup.tar.gz
```

---

## 🔄 Update Deployment

```bash
# Pull latest changes
git pull

# Rebuild and redeploy
./deploy.sh --build

# Verify
./verify-production.sh
```

---

## ↩️ Rollback

```bash
# Stop current deployment
./deploy.sh --stop

# Checkout previous version
git checkout <commit-hash>

# Redeploy
./deploy.sh --build
```

---

## 🐛 Troubleshooting

### SSH Connection Failed
```bash
# Test connection
ssh -v root@163.172.144.14

# Copy SSH key if needed
ssh-copy-id root@163.172.144.14
```

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

### Docker Not Found (on server)
```bash
# Install Docker manually
curl -fsSL https://get.docker.com | sh
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

### Application Not Responding
```bash
# Check container health
docker compose -f /opt/tenenbaum/docker-compose.prod.yml ps

# View application logs
docker compose -f /opt/tenenbaum/docker-compose.prod.yml logs app

# Restart services
docker compose -f /opt/tenenbaum/docker-compose.prod.yml restart
```

---

## 🔗 Useful Commands

```bash
# View all containers
docker ps -a

# View disk usage
df -h

# View memory usage
free -h

# Restart application
docker compose -f /opt/tenenbaum/docker-compose.prod.yml restart

# Stop application
docker compose -f /opt/tenenbaum/docker-compose.prod.yml down

# Rebuild and restart
docker compose -f /opt/tenenbaum/docker-compose.prod.yml up -d --build

# View real-time logs
docker compose -f /opt/tenenbaum/docker-compose.prod.yml logs -f
```

---

## 📋 CI/CD Integration

Example GitHub Actions step:

```yaml
- name: Deploy to Production
  run: |
    ./deploy.sh --build
    ./verify-production.sh --json
```

---

## 📚 Additional Documentation

- `DOCKER.md` - Detailed Docker documentation
- `SECURITY.md` - Security documentation

---

**Repository:** https://github.com/TTTEN10/Ten-dev  
**Last Updated:** 2026-07-06
