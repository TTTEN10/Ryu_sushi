# Production deploy runbook (validated path)

This documents the **successful production deployment** to **polinapsycho.com** on Scaleway (**scw-last-app**, May 2026). Use this as the only production deploy path (Scaleway Generative API direct; no FastAPI chatbot VM).

## Target infrastructure

| Item | Value |
|------|--------|
| Instance | **scw-last-app** (`471a791b-573e-45f3-b0c6-bf630476fc6c`) |
| Type | DEV1-M, PAR2, Docker image |
| Public IP | **151.115.151.231** |
| Block volume | **scw-new-app-storage** (`f27b2a79-07d6-4e63-9d09-c9873046cc89`, 20 GB, root `/`) |
| Domain | **polinapsycho.com** (+ `www`) → A record **only** to app IP |
| Security group | **safepsy-dev-ai-service-sg** (TCP 22, 80, 443, 8000 from `0.0.0.0/0`) |
| LLM | **Scaleway Generative API direct** (no FastAPI chatbot VM) |

Terraform defaults in `infra/terraform/envs/prod/variables.tf` point at this instance for both `app_instance_id` and `chatbot_instance_id` (single VIP).

## What gets deployed

On the app host under **`/home/safepsy/app`**:

- **Caddy** — TLS for `polinapsycho.com`, routes `/api/*` → backend, `/*` → frontend
- **Frontend** — Vite production build of `apps/web` (`serve` on :3000 inside Docker network)
- **Backend** — Python FastAPI **proxy** (not the Node `apps/api` monorepo service) with `USE_SCALEWAY_DIRECT=1`

The legacy FastAPI chatbot VM stack was removed from the repo; see `documentation/chatbot-migration.md`.

## Prerequisites

1. **Secrets** in repo root **`.env`** (gitignored), at minimum:
   - `SCALEWAY_API_KEY` — Generative API secret
   - Optional: `SCALEWAY_PROJECT_ID`, `SCALEWAY_MODEL`, `SCALEWAY_API_BASE_URL`
2. **Terraform** (optional for resume): `infra/terraform/envs/prod/terraform.tfvars` with Scaleway IAM keys (gitignored). Do **not** set duplicate `TF_VAR_scaleway_*` when tfvars is present.
3. **SSH** as `root@151.115.151.231` from the machine running deploy. Whitelist deploy egress IP on TCP **22** (see `[PRE-FLIGHT] OUTBOUND_IP` in deploy logs).
4. **Disk**: ~12 GB free on the block volume before `DEPLOY_FRESH_CONTAINERS=1` (frontend Docker build is large). Prune with `docker system prune -af` if needed.

## Recommended command (production)

From repo root, with `.env` containing `SCALEWAY_API_KEY`:

```bash
# App-only, Scaleway direct (same as successful prod run)
./deployment/deploy-live-app.sh
```

`deploy-live-app.sh` sets:

- `DEPLOY_LEGACY=1` → runs `deploy-app.sh` only (no Terraform)
- `USE_SCALEWAY_DIRECT=1`, `SINGLE_HOST=1`, `SKIP_VLLM_DEPLOY=1`
- `APP_IP` / `API_IP` = `151.115.151.231`
- Loads `.env` for Scaleway credentials

### Full pipeline (Terraform + app stack)

```bash
export USE_SCALEWAY_DIRECT=1
export SKIP_PREFLIGHT_GIT=1          # optional
export DEPLOY_SKIP_TERRAFORM=1       # after first successful apply
export REFRESH_IPS_FROM_TF=0
export APP_HOST=151.115.151.231
export CHATBOT_HOST=151.115.151.231  # same VIP for DNS preflight when split-host outputs exist
export SSH_BOOT_WAIT_SEC=180
./deployment/deploy.sh
```

### Fresh image rebuild on server

```bash
DEPLOY_FRESH_CONTAINERS=1 ./deployment/deploy-live-app.sh
```

Use only when you need `--no-cache` rebuilds; requires free disk.

## Post-deploy verification

```bash
CHECK_LLM=1 USE_SCALEWAY_DIRECT=1 ./deployment/verify-production.sh
```

Expect: HTTPS homepage, `/api/healthz`, `/api/v1/models` (Scaleway direct), guest `POST /api/chat/completions` with `"choices"` in the response.

## Local parity (same stack on your Mac)

```bash
npm run deploy:local
# → http://localhost:9080 (Caddy + SPA + Python proxy, Scaleway direct)
```

See `deployment/deploy-local-app.sh`. Uses `deployment/local-app/backend/main.py` (same proxy logic as production).

## Operational notes (learned on scw-last-app)

1. **OOM / SSH banner timeout** — On 4 GB RAM, use `DEPLOY_FRESH_CONTAINERS=0` when layers can be reused; add **4 GB swap** on the host (`deploy.sh` calls `ensure_host_swap`).
2. **Disk full** — `no space left on device` during frontend image export → `docker system prune -af`, remove `/data/hf` if legacy model cache exists, retry with `DEPLOY_FRESH_CONTAINERS=0` if layers can be reused.
3. **Scaleway chat 422** — Frontend sends `mode: guest` without `model`. Proxy must inject `model` (`_scaleway_request_body` in `deploy-app.sh` / `deployment/local-app/backend/main.py`).
4. **DNS** — Apex must point **only** to the app IP, not a second A to a chatbot IP.
5. **Cold start** — If SSH and HTTP time out but Scaleway console shows Running, try **stop → start** instance, then deploy immediately.

## Script map

| Script | When to use |
|--------|-------------|
| **`deployment/deploy-live-app.sh`** | **Default prod** — single host, Scaleway direct |
| `deployment/deploy.sh` | Terraform + `deploy-app.sh` (Scaleway direct) |
| `deployment/deploy-app.sh` | Low-level app stack (called by wrappers) |
| `deployment/deploy-local-app.sh` | Local Docker parity |
| `deployment/verify-production.sh` | HTTPS + LLM smoke tests |
| `deployment/deploy-issue.md` | Failure modes and mitigations |

## Related docs

- `documentation/chatbot-migration.md` — why Scaleway direct replaced the chatbot VM
- `deploy/app/.env.example` — env template for app stack / Node API (future)
- `env.example` — local dev + Scaleway keys
