# SafePsy Chatbot (Prod2XSS)

Runs on the **chatbot host** (scw-nostalgic-cannon, 51.159.119.91). Container name: new-chatbot. Use either Terraform (provisions instance + runs container from image) or manual bring-up with Docker Compose.

## Option A — Terraform

1. Build and push the chatbot image (or build on the instance after Terraform).
2. In `infra/terraform`, set in `terraform.tfvars`:
   - `chatbot_enabled = true`
   - `chatbot_instance_type = "PRO2-XXS"`
   - `chatbot_container_image` = your image (e.g. `safepsy-chatbot` or `registry.scaleway.com/.../safepsy-chatbot`)
   - `chatbot_container_env` = `{ "PORT" = "8000", "USE_GPU" = "false", "AI_INTERNAL_API_KEY" = "<secret>" }`
3. `terraform init && terraform apply`
4. Set app `AI_GPU_BASE_URL` (or `CHATBOT_BASE_URL`) to `http://<chatbot_public_ip>:8000`.

## Option B — Manual bring-up on existing instance

On the chatbot server (after SSH):

```bash
# Clone repo (or copy deploy/chatbot and apps/ai-chatbot)
git clone <repo_url> /opt/safepsy && cd /opt/safepsy
cp deploy/chatbot/.env.example deploy/chatbot/.env
# Edit deploy/chatbot/.env: set AI_INTERNAL_API_KEY
docker compose -f deploy/chatbot/docker-compose.chatbot.yml up -d
```

## Verify

- `curl -s http://<chatbot_ip>:8000/healthz`
- From app host: set `AI_GPU_BASE_URL=http://<chatbot_ip>:8000` and test chat.
