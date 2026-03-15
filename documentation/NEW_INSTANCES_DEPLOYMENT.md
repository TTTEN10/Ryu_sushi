# New Scaleway Instances Deployment (March 2025)

This document describes the migration to new Scaleway instances and block storage. All repo references have been updated to use these instances.

## Instance Summary

| Role    | Instance name           | Type        | Public IP       | Block storage (volume ID) | Zone  |
|---------|-------------------------|-------------|-----------------|----------------------------|-------|
| **App** | scw-focused-dubinsky    | DEV1-S      | **51.159.176.62** | 30 GB, `ee55e3e9-e425-4dd5-bf95-ccb0c88a0af5` | PAR 2 |
| **Chatbot** | scw-nostalgic-cannon | POP2-2C-8G | **51.159.119.91** | 30 GB, `a9bf2881-cea9-41dd-9c31-0d636f7fe471` | PAR 2 |

- **App instance ID**: `b37315e2-f767-4c87-9488-995ab19fa402`
- **Chatbot instance ID**: `88ddf148-3201-4092-b2e3-9683a3c2efae`
- **Public DNS (app)**: `b37315e2-f767-4c87-9488-995ab19fa402.pub.instances.scw.cloud`
- **Public DNS (chatbot)**: `88ddf148-3201-4092-b2e3-9683a3c2efae.pub.instances.scw.cloud`

SSH keys are unchanged.

## Docker container names (new*)

All new containers use names prefixed with `new`:

- **App stack** (`deploy/app/docker-compose.app.yml`): `new-postgres`, `new-app`, `new-caddy`
- **Chatbot** (`deploy/chatbot/docker-compose.chatbot.yml`): `new-chatbot`

## What was updated in the repo

- **Deployment scripts**: `deployment/deploy-safepsy.sh`, `deployment/run-on-instances.sh`, `deployment/update-production.sh`, `deployment/verify-live.sh`, `deployment/diagnose-and-fix-app-server.sh`, `deployment/deploy-via-scaleway-api.sh` — default IPs and hostnames set to the new instances.
- **Env examples**: `deploy/app/.env.example` — `AI_GPU_BASE_URL=http://51.159.119.91:8000`
- **Terraform**: `infra/terraform/dns-update.tf` — DNS fallback IP set to `51.159.176.62`; `terraform.tfvars.chatbot.example` — chatbot type `POP2-2C-8G`, zone `fr-par-2`
- **GitHub Actions**: `.github/workflows/deploy-production.yml` — `SSH_SERVER_IP: 51.159.176.62`
- **Docs**: `DEPLOYMENT.md`, `deploy/app/README.md`, `deploy/chatbot/README.md`, `deployment_issue.md` — instance names and IPs updated

## Deploy and verify (from a host with SSH to Scaleway)

1. **App (scw-focused-dubinsky)**  
   From repo root, with `DATABASE_PASSWORD` set:
   ```bash
   export SSH_SERVER_IP=51.159.176.62
   bash deployment/deploy-safepsy.sh
   ```
   Or use `deployment/run-on-instances.sh` to run app + chatbot steps (set `SKIP_TERRAFORM=1` if instances already exist).

2. **Chatbot (scw-nostalgic-cannon)**  
   ```bash
   export SSH_SERVER_IP=51.159.119.91
   bash deployment/update-production.sh
   ```

3. **Verify**  
   ```bash
   SSH_SERVER_IP=51.159.176.62 API_SERVER_IP=51.159.119.91 bash deployment/verify-live.sh
   ```

4. **When app is down (HTTP 000 / connection timeout)**  
   From a machine that can SSH to the app server, run the diagnostic and fix script (it starts the stack if needed and runs verify-live):
   ```bash
   # Optionally: export DATABASE_PASSWORD='...'  # if .env is missing on server
   bash deployment/diagnose-and-fix-app-server.sh
   ```
   See `DEPLOYMENT.md` § 6 (Troubleshooting) for details.

5. **DNS**  
   Point `safepsy.com` (and www) A records to `51.159.176.62`, or run Terraform DNS (e.g. `cd infra/terraform && terraform apply`) if you use it for DNS.

## Tests

- **API unit tests**: `cd apps/api && npm run test` (Vitest, excludes Hardhat tests)
- **Contract tests**: `cd apps/api && npm run test:contracts` (Hardhat)
- **Web tests**: `cd apps/web && npm run test -- --run` (some tests may need longer timeout or env adjustments)

All API and contract tests in the repo pass with the current config.
