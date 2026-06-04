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

- **Caddy** — TLS for `polinapsycho.com`; **`/api/auth/*`**, **`/api/did/*`**, and selected **`/api/chat/*`** → **node-api** (:3001); remaining **`/api/*`** → Python LLM proxy; **`/*`** → frontend
- **Frontend** — Vite production build of `apps/web` (`serve` on :3000 inside Docker network)
- **Backend** — Python FastAPI **proxy** (LLM: `USE_SCALEWAY_DIRECT=1`) plus **Node `apps/api`** for `/api/auth/*`, `/api/did/*`, and encrypted chat routes (Caddy routes before the Python catch-all)

The legacy FastAPI chatbot VM stack was removed from the repo; see `documentation/chatbot-migration.md`.

## Prerequisites

1. **Secrets** in repo root **`.env`** (gitignored), at minimum:
   - `SCALEWAY_API_KEY` — Generative API secret
   - `JWT_SECRET` — wallet session signing for **node-api** (required for `/api/auth/*` on prod/local stack)
   - Optional: `SCALEWAY_PROJECT_ID`, `SCALEWAY_MODEL`, `SCALEWAY_API_BASE_URL`, `SIWE_DOMAIN`, `SIWE_URI`
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

Wallet auth smoke (Node route, not 404 from Python):

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "https://polinapsycho.com/api/auth/wallet/connect" \
  -H 'Content-Type: application/json' -d '{}'
# expect 400 (validation), not 404
```

## Local parity (same stack on your Mac)

```bash
npm run deploy:local
# → http://localhost:9080 (Caddy + SPA + node-api + Python proxy, Scaleway direct)
```

See `deployment/deploy-local-app.sh`. Builds **`apps/api`** on the host (`npm run build:api`), then Dockerizes via `deployment/local-app/node-api/Dockerfile`. Python proxy: `deployment/local-app/backend/main.py` (same LLM logic as production).

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

## Troubleshooting: Wallet "Setup issue" badge

If users see **"Setup issue"** (amber badge) after wallet SIWE verify succeeds:

### Symptoms
- Wallet connects → SIWE verify succeeds (green `0x...` badge)
- Header shows **"Setup issue"** (amber) instead of **"Unlock chat save"** or **"Chat saved"**
- Hard refresh loses chat history
- `/api/did/check` returns 503 or 500
- `/api/chat/load` returns 500

### Root cause
Backend is missing required environment variables in `.env`:

| Variable | Purpose | Symptom if missing |
|----------|---------|-------------------|
| `RPC_URL` | Sepolia RPC for DID contract reads | `/did/check` → 503 |
| `DID_REGISTRY_ADDRESS` or `DID_IDENTITY_TOKEN_ADDRESS` | DID contract addresses | `/did/check` → 503 |
| `DATABASE_URL` | PostgreSQL for encrypted chat blobs | `/chat/save`, `/chat/load` → 500 |
| `JWT_SECRET` | Session cookie signing | SIWE verify fails |

### Fix
```bash
# SSH to production server
ssh root@151.115.151.231

# Edit .env in /home/safepsy/app
cd /home/safepsy/app
nano .env  # or vim/vi

# Add/verify these lines:
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
DID_REGISTRY_ADDRESS=0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5
DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
DATABASE_URL="postgresql://safepsy_user:safepsy_password@postgres:5432/safepsy"
JWT_SECRET="<32-char-random-string>"

# Redeploy
DEPLOY_FRESH_CONTAINERS=1 ./deployment/deploy-app.sh
```

### Verify fix
```bash
# Check env vars in container (should show all variables)
docker compose exec node-api printenv | grep -E "RPC_URL|DID_|DATABASE"

# Test DID endpoint (should return 401 without auth, not 503)
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://polinapsycho.com/api/did/check
# Expected: 401 (unauthorized without session cookie)

# Check node-api logs for DID initialization
docker compose logs node-api --tail=50 | grep -i "DID"
# Expected: "DID service initialized" — not "DID service not configured"
```

### Frontend build variables
If on-chain chat reference updates fail, verify frontend build has:

```bash
# In apps/web/.env (baked into SPA bundle)
VITE_DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

Rebuild frontend if these were missing:
```bash
cd /home/safepsy/app
docker compose up -d --build app-frontend
```

---

## Related docs

- `documentation/chatbot-migration.md` — why Scaleway direct replaced the chatbot VM
- Repo root `.env` — `JWT_SECRET`, Scaleway keys, optional `SIWE_*` for node-api
- `deployment/local-app/node-api/Dockerfile` — Node API image (wallet/DID/chat routes)
- `env.example` — local dev + Scaleway keys
- `deployment/WALLET_FUNNEL_SETUP_ISSUE.md` — detailed wallet funnel troubleshooting
