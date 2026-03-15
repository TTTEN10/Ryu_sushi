# SafePsy Production Deployment (Reset from Zero)

Re-deploy from scratch on Scaleway: **App host** (Dev1-S) + **Chatbot host** (PRO2-XXS), Docker + Caddy + HTTPS.

**Deployment docs (canonical):**
- **DEPLOYMENT.md** (this file) — end-to-end deployment, DNS, verification, troubleshooting.
- **documentation/NEW_INSTANCES_DEPLOYMENT.md** — new instance IPs, scripts, and runbook.
- **deployment_issue.md** — known issues and production context.

**When the app at http://51.159.176.62 is down (HTTP 000 / connection timeout):** run the diagnostic script from a machine that can SSH to the server:
```bash
# From repo root (optionally set DATABASE_PASSWORD if .env is missing on server)
bash deployment/diagnose-and-fix-app-server.sh
```
This runs the full runbook: reachability, ports, Docker stack, Caddy, firewall, and ends with `deployment/verify-live.sh`.

---

## 1. Manual Scaleway steps (high level)

1. **Create or reuse two instances**
   - **App host**: type **DEV1-S**, name `scw-focused-dubinsky`, public IP `51.159.176.62`. Block storage: 30 GB (e.g. `ee55e3e9-e425-4dd5-bf95-ccb0c88a0af5`).
   - **Chatbot host**: type **POP2-2C-8G**, name `scw-nostalgic-cannon`, public IP `51.159.119.91`. Block storage: 30 GB (e.g. `a9bf2881-cea9-41dd-9c31-0d636f7fe471`).

2. **DNS (Scaleway DNS or your registrar)**
   - `safepsy.com` → A → app host IP (`51.159.176.62`).
   - `www.safepsy.com` → CNAME → `safepsy.com` (or A → same IP).
   - Optional: second A record or subdomain for chatbot IP if you want a dedicated hostname for the chatbot.

3. **Credentials**
   - **App / Caddy / Docker on app host**: use Scaleway API key for app (e.g. `SCW_ACCESS_KEY`, `SCW_SECRET_KEY`, `SCW_DEFAULT_PROJECT_ID`) only if the app needs to call Scaleway APIs; otherwise not required for Caddy/Docker.
   - **Terraform**: use a **different** Scaleway API key (e.g. Terraform-specific) in `infra/terraform/terraform.tfvars`: `scaleway_access_key`, `scaleway_secret_key`, `scaleway_project_id`. Do not commit `terraform.tfvars`.

---

## 2. App instance deployment (Dev1-S)

**Server**: app host (scw-focused-dubinsky, `51.159.176.62`).

1. SSH into the app server and ensure Docker is installed (e.g. Docker + Compose V2).

2. Clone the repo (or copy `deploy/app` and repo root for build context):
   ```bash
   git clone <repo> /opt/safepsy && cd /opt/safepsy
   ```

3. Configure env:
   ```bash
   cp deploy/app/.env.example deploy/app/.env
   # Edit deploy/app/.env: set POSTGRES_PASSWORD, DATABASE_URL, AI_GPU_BASE_URL, AI_INTERNAL_API_KEY
   ```

4. Bring up the stack (from repo root):
   ```bash
   docker compose -f deploy/app/docker-compose.app.yml up -d
   ```

5. Optional: run DB migrations (from repo root, with app container or local Prisma):
   ```bash
   npx prisma migrate deploy
   ```
   (If Prisma runs inside the app container, exec into it or run migrations as part of startup.)

**References**: `deploy/app/README.md`, `deploy/app/.env.example`, `deploy/app/Caddyfile`.

---

## 3. Terraform chatbot deployment (PRO2-XXS)

**Purpose**: Provision the chatbot instance (PRO2-XXS) with Docker and run the chatbot container.

1. Install Terraform and configure Scaleway:
   ```bash
   cd infra/terraform
   cp terraform.tfvars.chatbot.example terraform.tfvars
   # Edit terraform.tfvars: set scaleway_access_key, scaleway_secret_key, scaleway_project_id, chatbot_container_env (AI_INTERNAL_API_KEY)
   ```

2. Build and push the chatbot image (required for Terraform cloud-init to pull):
   - Either push to a registry (e.g. Scaleway Container Registry or Docker Hub):
     ```bash
     docker build -t safepsy-chatbot:2.0.0 -f deploy/chatbot/Dockerfile .
     docker tag safepsy-chatbot:2.0.0 <registry>/safepsy-chatbot:2.0.0
     docker push <registry>/safepsy-chatbot:2.0.0
     ```
   - Then set `chatbot_container_image` in `terraform.tfvars` to that image (e.g. `registry.scaleway.com/.../safepsy-chatbot`).
   - Or: use Terraform only to create the instance with Docker installed, then SSH and run Docker Compose (see `deploy/chatbot/README.md`).

3. Apply:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

4. Note outputs:
   - `chatbot_public_ip` → use this as the chatbot base URL.
   - `chatbot_ssh_command` → SSH to the instance.
   - `chatbot_health_url` → health check URL.

5. Set on the **app** host in `deploy/app/.env`:
   - `AI_GPU_BASE_URL=http://<chatbot_public_ip>:8000` (or `CHATBOT_BASE_URL`)
   - `AI_INTERNAL_API_KEY` = same value as in `chatbot_container_env.AI_INTERNAL_API_KEY`

6. Restart the app stack so it picks up the new env:
   ```bash
   docker compose -f deploy/app/docker-compose.app.yml up -d
   ```

**References**: `infra/terraform/`, `deploy/chatbot/README.md`, `terraform.tfvars.chatbot.example`.

---

## 4. DNS setup

- **safepsy.com** → A → app host public IP (`51.159.176.62`).
- **www.safepsy.com** → CNAME → `safepsy.com` (or A → same IP).
- Chatbot is reached by IP:port from the app backend (`AI_GPU_BASE_URL`); no public DNS is required unless you want a dedicated hostname.

---

## 5. Verification checklist

- **App / HTTPS**
  - `curl -sI https://safepsy.com` → 200.
  - `curl -s https://safepsy.com/healthz` → healthy.
  - `curl -s https://safepsy.com/api/...` (e.g. health if exposed) → 200.
- **Caddy**
  - `docker compose -f deploy/app/docker-compose.app.yml logs caddy` → no TLS errors; certificate issuance for safepsy.com.
- **DNS**
  - `dig +short safepsy.com` → app host IP.
- **Chatbot**
  - `curl -s http://<chatbot_public_ip>:8000/healthz` → healthy.
  - From app: trigger a chat request and confirm the backend can reach the chatbot (check app logs and `AI_GPU_BASE_URL` / `CHATBOT_BASE_URL`).

---

## 6. Troubleshooting

- **HTTP 000 / connection timeout** (app at 51.159.176.62 unreachable)
  - Usually: Docker Compose stack not running or Caddy (reverse proxy) not listening on 80/443. From a machine that can reach the server, run `bash deployment/diagnose-and-fix-app-server.sh`. It checks SSH, ports, `docker ps`, starts the stack if needed, and runs `deployment/verify-live.sh`. Ensure Scaleway security group allows TCP 22, 80, 443.

- **DNS mismatch**
  - If the browser hits the wrong IP, check A/CNAME at your DNS provider. Ensure no old CDN/proxy is caching. Use `dig`/`nslookup` and browser devtools (network) to see which IP is used.

- **502 on /api or /healthz returns HTML** — Backend (app) is down or old Caddy served static first. Redeploy with `deploy/app/`: on app host run `docker compose -f deploy/app/docker-compose.app.yml up -d --build` (ensure `deploy/app/.env` has DATABASE_URL and POSTGRES_PASSWORD). Then `curl -s https://safepsy.com/healthz` should return `ok`.

- **TLS / certificate issues**
  - Caddy must be able to bind 80/443 and reach the internet for ACME. Ensure ports 80 and 443 are open (security group / firewall). Check Caddy logs for ACME errors. Ensure the domain A record points to this server before requesting certificates.

- **Container health**
  - App: `docker compose -f deploy/app/docker-compose.app.yml ps` — app and postgres should be “healthy”. If app is unhealthy, exec into the app container and `curl -s http://localhost:3000/healthz`.
  - Chatbot: `curl -s http://<chatbot_ip>:8000/healthz`. If Terraform-provisioned, SSH and run `docker ps` and `docker logs <container>`.

- **App cannot reach chatbot**
  - Verify `AI_GPU_BASE_URL` (or `CHATBOT_BASE_URL`) on the app host (no trailing slash). Verify `AI_INTERNAL_API_KEY` matches the chatbot’s `AI_INTERNAL_API_KEY`. From the app host: `curl -s -H "Authorization: Bearer <key>" http://<chatbot_ip>:8000/healthz`. Ensure the chatbot security group allows port 8000 from the app host IP (or from anywhere if acceptable).

- **Postgres data**
  - Data is in the `postgres_data` volume. Back up with `docker exec` + `pg_dump` (see “Backups” below).

---

## 7. Operational hardening (minimum viable)

- **Firewall / security groups**
  - Restrict SSH (port 22) to known IPs. Open 80, 443 on the app host; open 8000 on the chatbot host only from the app host IP (or restrict as needed).

- **fail2ban**
  - Optional: install fail2ban on both instances for SSH and, if desired, for HTTP abuse.

- **Log rotation**
  - Configure log rotation for Docker (e.g. `/var/lib/docker/containers/...`) and app logs under `app_logs` volume so disks do not fill.

- **Backups**
  - **Postgres**: from the app host, run:
    ```bash
    docker exec $(docker compose -f deploy/app/docker-compose.app.yml ps -q postgres) pg_dump -U safepsy_user safepsy > backup_$(date +%Y%m%d).sql
    ```
    Store backups off-host and test restore.

- **Updates (new version with minimal downtime)**
  - **App**: from repo root on app host, pull latest, rebuild and recreate:
    ```bash
    git pull
    docker compose -f deploy/app/docker-compose.app.yml build --no-cache app
    docker compose -f deploy/app/docker-compose.app.yml up -d
    ```
  - **Chatbot**: rebuild image, push to registry, then on the chatbot instance `docker pull ... && docker stop ... && docker rm ... && docker run ...` (or use the same image tag and restart the container). If using Docker Compose on the chatbot host, pull and `docker compose -f deploy/chatbot/docker-compose.chatbot.yml up -d`.

---

## Deliverables summary

| Path | Description |
|------|-------------|
| `deploy/app/` | docker-compose.app.yml, Caddyfile, .env.example, README |
| `deploy/chatbot/` | docker-compose.chatbot.yml, Dockerfile, .env.example, README |
| `infra/terraform/` | main config, modules (gpu_ai_service reused for chatbot), variables, outputs, terraform.tfvars.chatbot.example |
| `DEPLOYMENT.md` (this file) | End-to-end deployment, DNS, verification, troubleshooting, hardening |
| `documentation/NEW_INSTANCES_DEPLOYMENT.md` | New instances (51.159.176.62 / 51.159.119.91), scripts, verify-live |
| `deployment_issue.md` | Production issues and context |
| `deployment/diagnose-and-fix-app-server.sh` | Runbook script when app at 51.159.176.62 is down (HTTP 000) |
