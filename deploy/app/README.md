# SafePsy App Stack (Dev1-S)

Frontend + Backend API + Postgres + Caddy. Run on the **app host** (scw-focused-dubinsky, 51.159.176.62). Containers: new-postgres, new-app, new-caddy.

## One-command bring-up

From **repository root**:

```bash
cd /path/to/SPappv1.1
cp deploy/app/.env.example deploy/app/.env
# Edit deploy/app/.env: set POSTGRES_PASSWORD, DATABASE_URL, AI_GPU_BASE_URL, AI_INTERNAL_API_KEY
docker compose -f deploy/app/docker-compose.app.yml up -d
```

## Verify

- `curl -sI https://safepsy.com` — 200, HTTPS
- `curl -s https://safepsy.com/healthz` — healthy
- `curl -s https://safepsy.com/api/health` or `/healthz` if exposed
- Caddy logs: `docker compose -f deploy/app/docker-compose.app.yml logs caddy` — certificate issuance

Ensure DNS A record for safepsy.com points to this instance’s public IP.

## Files

- `docker-compose.app.yml` — services (postgres, app, caddy)
- `Caddyfile` — TLS (safepsy.com, www), reverse proxy to app:3000
- `.env.example` — env template
