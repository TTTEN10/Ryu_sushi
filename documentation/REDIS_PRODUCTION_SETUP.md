# Redis Production Setup for Quota Enforcement

## Overview

Redis is **required** for quota enforcement in production. Without Redis, the quota service runs in fallback mode and allows all requests through, effectively disabling quota limits.

## What Changed

### Before (Quotas NOT enforced)
- Redis configuration was commented out in `.env`
- Production docker-compose did not include Redis service
- Quota service fell back to "allow all" mode when Redis unavailable
- Users could exceed daily/monthly chat limits without restriction

### After (Quotas enforced)
- Redis service added to production docker-compose
- Redis connection required for quota middleware to function
- Middleware fails **closed** in production when Redis unavailable (503 error)
- Quotas strictly enforced with proper error responses

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│   Node API   │────▶│    Redis    │
│  Request    │     │  (Quota MW)  │     │ (Quota Data)│
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  (Sessions)  │
                    └──────────────┘
```

## Redis Data Stored

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `quota:chat:{did}:daily:{YYYY-MM-DD}` | 24h | Daily usage counter |
| `quota:chat:{did}:monthly:{YYYY-MM}` | ~30d | Monthly usage counter |
| `quota:chat:{did}:limits` | None | Custom limits per DID |
| `concurrency:chat:{did}:lock` | Request TTL | Prevents concurrent requests |

## Configuration

### Docker Compose (Production)

The production docker-compose now includes:

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  volumes:
    - redis_data:/data
  command: ["redis-server", "--appendonly", "yes"]
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 5s
    retries: 5
```

### Environment Variables

Set in your production `.env`:

```bash
# Required: Redis connection URL
REDIS_URL=redis://redis:6379/0

# Optional: For cloud Redis with authentication
# REDIS_URL=rediss://default:your-password@your-host:6379

# Quota limits
CHAT_QUOTA_DAILY_LIMIT=100
CHAT_QUOTA_MONTHLY_LIMIT=1000
```

## Deployment Steps

### 1. Update Environment

Copy and configure `.env.production.example`:

```bash
cp .env.production.example .env.production
# Edit .env.production and set:
# - REDIS_URL=redis://redis:6379/0
# - Verify CHAT_QUOTA_DAILY_LIMIT and CHAT_QUOTA_MONTHLY_LIMIT
```

### 2. Deploy with Redis

```bash
cd .local-app-stack
docker-compose up -d redis
docker-compose up -d node-api
```

### 3. Verify Redis Connection

```bash
# Check Redis is running
docker-compose ps redis

# Check Redis connectivity
docker-compose exec redis redis-cli ping
# Should return: PONG

# Check API logs for Redis connection
docker-compose logs node-api | grep "Redis connected"
```

### 4. Test Quota Enforcement

```bash
# Get auth token and make chat requests
# After exceeding quota, should receive 429 error:

{
  "success": false,
  "error": "QUOTA_EXCEEDED",
  "message": "Chat quota exceeded. Upgrade to Premium to continue.",
  "quota": {
    "dailyUsed": 100,
    "dailyLimit": 100,
    "monthlyUsed": 500,
    "monthlyLimit": 1000
  },
  "paywall": {
    "showPaywall": true,
    "pricing": { ... }
  }
}
```

## Behavior Matrix

| Scenario | Redis Configured | Redis Connected | Environment | Behavior |
|----------|-----------------|-----------------|-------------|----------|
| Development | ❌ | ❌ | `development` | ✅ Allow all (fallback) |
| Production | ❌ | ❌ | `production` | ⚠️ Allow all + log warning |
| Production | ✅ | ❌ | `production` | ❌ Block (503 error) |
| Production | ✅ | ✅ | `production` | ✅ Enforce quotas |
| Quota exceeded | ✅ | ✅ | Any | ❌ Block (429 error) |

## Monitoring

### Redis Health

```bash
# Check Redis memory usage
docker-compose exec redis redis-cli INFO memory

# Check connected clients
docker-compose exec redis redis-cli CLIENT LIST

# Check quota keys
docker-compose exec redis redis-cli KEYS "quota:chat:*"
```

### API Logs

Watch for these log messages:

```
✅ "Redis connected for quota service"
⚠️ "Redis not configured, returning subscription quota"
❌ "Redis configured but not ready. Blocking request."
❌ "Quota exceeded for DID ..."
```

## Cloud Redis Options

For production deployments requiring high availability:

### Upstash (Serverless Redis)
```bash
REDIS_URL=rediss://default:YOUR_PASSWORD@us1-your-cluster.upstash.io:6379
```

### Redis Cloud
```bash
REDIS_URL=rediss://default:YOUR_PASSWORD@your-instance.rediscloud.com:6379
```

### AWS ElastiCache
```bash
REDIS_URL=rediss://YOUR_PASSWORD@your-cluster.cache.amazonaws.com:6379
```

## Troubleshooting

### "Redis not available" errors

1. Check Redis container is running: `docker-compose ps redis`
2. Check Redis logs: `docker-compose logs redis`
3. Verify network connectivity: `docker-compose exec node-api ping redis`
4. Check Redis URL format in environment

### Quotas not being enforced

1. Verify Redis is connected: check API logs for "Redis connected"
2. Check Redis keys exist: `docker-compose exec redis redis-cli KEYS "quota:*"`
3. Verify `NODE_ENV=production` is set
4. Check middleware is applied to routes

### High Redis memory usage

1. Check key count: `docker-compose exec redis redis-cli DBSIZE`
2. Check memory: `docker-compose exec redis redis-cli INFO memory`
3. Keys auto-expire (TTL set), but can manually flush if needed: `docker-compose exec redis redis-cli FLUSHDB`

## Security Considerations

- **Authentication**: Use `REDIS_PASSWORD` for any externally-accessible Redis
- **Network isolation**: Redis should only be accessible from API container
- **Encryption**: Use `rediss://` (TLS) for cloud Redis connections
- **Persistence**: AOF enabled (`--appendonly yes`) for crash recovery

## Performance Tuning

For high-traffic deployments:

```yaml
redis:
  command: >
    redis-server
    --appendonly yes
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
```

## Related Files

- `apps/api/src/lib/quota.service.ts` - Quota service implementation
- `apps/api/src/middleware/quota.ts` - Quota middleware (enforcement logic)
- `.local-app-stack/docker-compose.yml` - Production Docker configuration
- `.env.production.example` - Production environment template
