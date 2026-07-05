# Tenenbaum Development - Docker Guide

This document explains how to use Docker for local development and production deployment.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Development (Recommended)

```bash
# Start development environment with hot-reload
docker-compose -f docker-compose.dev.yml up

# Access the application
# Frontend: http://localhost:5173
# API:      http://localhost:3001
```

### Production

```bash
# Build and start production containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

---

## Development Setup

### Using Docker Compose (Recommended)

The development environment includes:
- **Hot-reload** for code changes
- **Vite dev server** on port 5173
- **Express API** on port 3001
- **MailHog** (optional) for email testing

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Start with MailHog for email testing
docker-compose -f docker-compose.dev.yml --profile mail up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# Rebuild and restart
docker-compose -f docker-compose.dev.yml up --build
```

### Using the Deploy Script

```bash
# Development deployment
./deploy.sh --dev

# Force rebuild
./deploy.sh --dev --build

# View logs
./deploy.sh --dev --logs
```

### VS Code Integration

For debugging with VS Code:

1. Install the "Docker" extension
2. The Node.js debugger is exposed on port 9229
3. Add this to your `.vscode/launch.json`:

```json
{
  "name": "Docker: Attach to Node",
  "type": "node",
  "request": "attach",
  "address": "localhost",
  "port": 9229,
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app"
}
```

---

## Production Deployment

### Using Docker Compose

```bash
# Build production image
docker-compose build

# Start production services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### Using the Deploy Script

```bash
# Standard production deployment
./deploy.sh

# Force rebuild
./deploy.sh --build

# Stop all containers
./deploy.sh --stop
```

### Health Check

```bash
# Check if the service is healthy
curl http://localhost:3001/api/health

# Or use docker exec
docker exec tenenbaum-app node -e "require('http').get('http://localhost:3001/api/health', (r) => console.log('Status:', r.statusCode))"
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required for email functionality
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password

# Email addresses
MAIL_FROM="Tenenbaum Website <no-reply@tenenbaum.example.com>"
MAIL_TO=hello@tenenbaum.example.com
```

### Development Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3001` | API server port |
| `VITE_HOST` | `0.0.0.0` | Vite dev server host |
| `VITE_PORT` | `5173` | Vite dev server port |
| `CHOKIDAR_USEPOLLING` | `true` | File watching in containers |

### Production Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3001` | API server port |
| `SMTP_HOST` | - | SMTP server host |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASS` | - | SMTP password |
| `MAIL_FROM` | - | Sender email address |
| `MAIL_TO` | - | Recipient email address |

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs

# Remove and recreate
docker-compose down
docker-compose up --build
```

### Port already in use

```bash
# Find what's using the port
lsof -i :5173
lsof -i :3001

# Or use different ports
PORT=3002 VITE_PORT=5174 docker-compose -f docker-compose.dev.yml up
```

### Hot-reload not working

1. Ensure volume is mounted correctly:
   ```bash
   docker-compose -f docker-compose.dev.yml exec dev ls -la /app
   ```

2. Try increasing polling interval:
   ```bash
   POLLING_INTERVAL=500 docker-compose -f docker-compose.dev.yml up
   ```

### Email not sending

1. Check SMTP configuration in `.env`
2. In development, check MailHog at http://localhost:8025
3. View server logs:
   ```bash
   docker-compose -f docker-compose.dev.yml logs dev
   ```

### Build fails

```bash
# Clear Docker cache
docker builder prune

# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache
```

### Permission issues

```bash
# Fix file permissions
sudo chown -R $(whoami):$(whoami) node_modules
sudo chown -R $(whoami):$(whoami) dist
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Container                      │
│                                                          │
│  ┌─────────────────┐         ┌─────────────────────┐   │
│  │   Vite Dev      │         │   Express API       │   │
│  │   Server        │         │   Server            │   │
│  │   (Port 5173)   │  ───►   │   (Port 3001)       │   │
│  │                 │  proxy  │                     │   │
│  └─────────────────┘         └─────────────────────┘   │
│                                                          │
│  ┌─────────────────┐         ┌─────────────────────┐   │
│  │   node_modules  │         │   server/data       │   │
│  │   (volume)      │         │   (volume)          │   │
│  └─────────────────┘         └─────────────────────┘   │
└─────────────────────────────────────────────────────────┘
           │                        │
           ▼                        ▼
    http://localhost:5173    http://localhost:3001
```

---

## Commands Reference

### Docker Compose

| Command | Description |
|---------|-------------|
| `docker-compose -f docker-compose.dev.yml up` | Start dev environment |
| `docker-compose -f docker-compose.dev.yml down` | Stop dev environment |
| `docker-compose -f docker-compose.dev.yml build` | Build dev image |
| `docker-compose -f docker-compose.dev.yml logs -f` | Follow logs |
| `docker-compose -f docker-compose.dev.yml exec dev sh` | Shell in container |
| `docker-compose -f docker-compose.dev.yml ps` | Show container status |

### Deploy Script

| Command | Description |
|---------|-------------|
| `./deploy.sh` | Production deployment |
| `./deploy.sh --dev` | Development deployment |
| `./deploy.sh --build` | Force rebuild |
| `./deploy.sh --stop` | Stop containers |
| `./deploy.sh --logs` | Show logs |
| `./deploy.sh --help` | Show help |

---

## Security Notes

- Never commit `.env` files to version control
- Use strong passwords for SMTP credentials
- In production, the container runs as non-root user
- Health checks are configured for monitoring
- Network policies restrict container communication

---

## Support

For issues or questions:
- Check existing issues in the repository
- Review the logs: `docker-compose logs -f`
- Contact: devops@tenenbaum.com
