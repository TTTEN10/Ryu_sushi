# Deployment blockers and mitigations

This document summarizes issues that have blocked or complicated production deployment for SafePsy (`./deployment/deploy.sh` and related scripts). **Current prod target:** single Scaleway instance **scw-new-psy** (`60a5e86a-07a8-4e17-aa3b-862ae586d030`), public IPv4 **62.210.238.160** — Terraform defaults and deploy scripts use this IP; point **`safepsy.com` DNS A** at this host when going live. Override with `APP_HOST`, `CHATBOT_HOST`, etc. if you split services again.

---

## 1. SSH not reachable (most common)

### Symptom

- `ssh: connect to host <chatbot-ip> port 22: Operation timed out`
- `Connection timed out during banner exchange` / `Connection to <app-ip> port 22 timed out`
- Colocate path fails at `tar | ssh` to the app host with a **Write error** (opaque failure from the pipe when SSH never connects).

### Cause

**Inbound TCP 22** to the Scaleway instances is not allowed from the **public IPv4 of the machine running the deploy** (home/office IP changed, new laptop, or rules never added). Terraform and the Scaleway API can still succeed while SSH fails.

### Mitigation

1. From the same machine you use for deploy, note your outbound IP (browser or `curl -4 https://ifconfig.me/ip`). Recent `deploy.sh` prints a **Hint** line in the colocate branch with a detected IPv4 when possible.
2. In **Scaleway** → instance (or security group) → **inbound rules**: allow **TCP 22** from that IP (ideally `/32`).
3. Apply the rule on **both** the **app** and **chatbot** instances if you use the split-host path; the colocate path still needs SSH to the **app** host.

### Script behavior

- If SSH to the **dedicated chatbot host** fails, `deploy.sh` **colocates** the chatbot compose on the **app** host (`SINGLE_HOST=1` + `host.docker.internal` for the proxy). That **still requires SSH to the app server**.
- NDJSON debug lines (including outbound IP hint **H6**) are written under `deployment/deployment-logs/debug-fcc1a0.log` when `deploy.sh` from `main` includes the instrumentation commits.

---

## 2. App VM cannot reach chatbot VM (split-host LLM path)

### Symptom

- From the app server: `curl http://<chatbot-ip>:8000/health` → **No route to host** or similar.
- Production `/api/v1/models` returns **502/500** because the Python proxy on the app cannot open the chatbot upstream.

### Cause

Even if the chatbot listens on `0.0.0.0:8000`, **routing or security groups** may block **app → chatbot** on **TCP 8000** (or ICMP/routing issues between public IPs in the same region). Terraform in this repo does **not** manage fine-grained SG rules (see `infra/terraform/envs/prod/main.tf` comments).

### Mitigation

- Allow **TCP 8000** from the **app instance public (or private) IP** to the **chatbot** instance SG.
- If a **private VPC** is introduced later, point `MODEL_API_URL_*` at the chatbot **private** IP instead of the public one.

### Script behavior

- After the dedicated chatbot is up, `deploy.sh` runs an **app → chatbot** HTTP probe (`ssh` to app, `curl` to `http://<chatbot>:8000/health`). If it fails, set **`FORCE_COLOCATE_ON_ROUTING_FAIL=1`** to **auto-colocate** on the app host, or fix SG/routing.
- `deploy.sh` may **colocate** when **SSH to the chatbot fails**, or when the inter-VM probe fails and **`FORCE_COLOCATE_ON_ROUTING_FAIL=1`**.

---

## 3. Chatbot container crash on boot (image / imports)

### Symptom

- Colocated or remote chatbot container **restarts**; logs show `ModuleNotFoundError: No module named 'prompt_builder'` (or `session_redis`).

### Cause

The `apps/ai-chatbot/Dockerfile` only copied `main.py` and omitted helper modules.

### Status

**Fixed in repo:** `Dockerfile` copies `prompt_builder.py` and `session_redis.py`, runs **`RUN python -c "import prompt_builder, session_redis"`** so a bad image fails at build time, and defines a **Docker HEALTHCHECK** on `/health` with a long **start-period** for model load. Rebuild images after pull.

---

## 4. Deploy health timeouts while the CPU model loads

### Symptom

- `deploy.sh` fails at “Verify colocated chatbot /health” even though the container eventually becomes healthy.

### Cause

`initialize_model()` used to run **synchronously** in the FastAPI lifespan **before** the server accepted connections, so `/health` was unreachable for a long time during Hugging Face weight load on small instances.

### Status

**Fixed in repo:** model init runs in a **background thread** so `/health` responds immediately (degraded until the model is ready).

---

## 5. Stale or unpushed `deploy.sh` (missing logging / preflight)

### Symptom

- No line `Debug NDJSON (session fcc1a0): …` after Terraform.
- Immediate failure at `tar | ssh` without a clear **preflight** SSH error to the app host.

### Cause

Local changes (NDJSON, app SSH preflight, outbound IP hint) were not on `origin/main` yet, or the machine never **`git pull`** after pushes.

### Mitigation

Always **`git pull origin main`** before diagnosing deploy behavior. Check `git log -1 deployment/deploy.sh`.

---

## 6. NDJSON log not under `.cursor/`

### Symptom

- Expected ` .cursor/debug-fcc1a0.log` never appears.

### Cause

On some hosts, writing under **`.cursor/`** can return **EPERM** (tooling / OS policy). Logs are therefore written primarily to **`deployment/deployment-logs/debug-fcc1a0.log`**.

---

## 7. Terraform / credentials

### Symptom

- Terraform fails init/apply; or provider warnings about multiple credential sources.

### Cause

Missing or mixed **Scaleway** credentials (`terraform.tfvars` vs env vs `scw` config profile).

### Mitigation

Use one clear source: e.g. `infra/terraform/envs/prod/terraform.tfvars` (gitignored) from `terraform.tfvars.example`, **or** exported `TF_VAR_*` variables, and align `scw` active profile if you use the CLI alongside Terraform.

---

## 8. macOS `tar` extended attributes (noise)

### Symptom

Many lines: `tar: Ignoring unknown extended header keyword 'LIBARCHIVE.xattr.com.apple.provenance'`

### Cause

BSD `tar` on macOS embeds xattrs in archives consumed by GNU `tar` on Linux.

### Status

**Mitigated in repo:** `COPYFILE_DISABLE=1` is set for `tar` invocations in `deploy.sh` / `deploy-app.sh` where applicable.

---

## 9. Production stack vs monorepo `apps/api`

### Fact

`deploy-app.sh` deploys a **small FastAPI proxy** plus **Vite-built `apps/web`** behind Caddy. It does **not** build or run the **Node `apps/api`** service from the monorepo. “API” in that stack means **`/api/*` → Python proxy** (OpenAI-compatible passthrough to the chatbot), not the TypeScript API unless you add a separate compose/service.

---

## Quick checklist before opening an issue

- [ ] `git pull` and latest `deployment/deploy.sh` on the machine running deploy  
- [ ] Optional: **`./deployment/deploy.sh --diagnose`** — runs pre-flight + SSH + app→chatbot probe **without** Terraform apply or stack deploy  
- [ ] **TCP 22** allowed from **this** public IP to **app** (and **chatbot** if split host)  
- [ ] **TCP 8000** from **app** to **chatbot** if chatbot stays on a separate VM  
- [ ] `terraform apply` succeeds for `infra/terraform/envs/prod`  
- [ ] After a failed run: read `deployment/deployment-logs/deploy.jsonl`, `debug-fcc1a0.log` (if present), **`tf-output.json`**, and the **outbound IPv4** line from pre-flight  
- [ ] Post-deploy: `bash deployment/verify-production.sh` (and `CHECK_LLM=1` if you want a chat probe)

### `deploy.sh` environment switches (reference)

| Variable | Effect |
|----------|--------|
| `SKIP_PREFLIGHT_GIT=1` | Skip “local HEAD must match `origin/main`” check |
| `REFRESH_IPS_FROM_TF=0` | Do not overwrite `APP_HOST` / `CHATBOT_HOST` from `terraform output -json` |
| `FORCE_COLOCATE_ON_ROUTING_FAIL=1` | If app cannot reach chatbot `:8000`, colocate chatbot on app |
| `PREFLIGHT_SSH=1` | After other pre-flight checks, require SSH to **current** `APP_HOST` **before** Terraform (IPs may still refresh after apply) |
| `DEPLOY_RETRY_MAX` / `DEPLOY_RETRY_DELAY_SEC` | SSH / curl retry tuning |

---

## Related files

| File | Role |
|------|------|
| `deployment/deploy.sh` | Full pipeline: pre-flight, optional `--diagnose`, Terraform → chatbot (dedicated or colocated) → `deploy-app.sh`; logs to `deployment-logs/` |
| `deployment/deploy-app.sh` | Caddy + SPA + Python proxy on app host |
| `deployment/bootstrap-chatbot-host.sh` | Chatbot-only sync when you SSH only to the chatbot host |
| `deployment/verify-production.sh` | HTTPS / `/api` smoke checks against `APP_DOMAIN` |
| `infra/terraform/envs/prod/main.tf` | Notes on SG management vs Terraform |
