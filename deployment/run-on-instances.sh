#!/bin/bash
# Run SafePsy on instances as per deploy files, Caddy, and Terraform.
# 1) Optional: Terraform init/apply (creates/updates Scaleway instances)
# 2) App instance (scw-focused-dubinsky): Frontend + Backend + Postgres + Caddy (deploy/app)
# 3) Chatbot instance (scw-nostalgic-cannon): AI chatbot (deploy/chatbot)
# 4) Verify all endpoints
#
# Required: SSH key (SSH_KEY_FILE or ~/.ssh/id_ed25519), DATABASE_PASSWORD for app deploy.
# Optional: SKIP_TERRAFORM=1 to skip Terraform; SKIP_APP=1 / SKIP_CHATBOT=1 to skip a step.

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Instance IPs (scw-focused-dubinsky = app, scw-nostalgic-cannon = chatbot)
APP_IP="${SSH_SERVER_IP:-51.159.176.62}"
CHATBOT_IP="${CHATBOT_SERVER_IP:-51.159.119.91}"

echo "=============================================="
echo " SafePsy — Run on instances (Terraform + Caddy + deploy)"
echo "=============================================="
echo " App (Frontend+API+Postgres+Caddy): $APP_IP"
echo " Chatbot (API):                     $CHATBOT_IP"
echo "=============================================="
echo ""

# --- 1) Terraform (optional) ---
if [ "${SKIP_TERRAFORM}" != "1" ]; then
  echo "📐 Step 1/4: Terraform (init + apply)"
  if [ ! -d "infra/terraform" ]; then
    echo "   Skipping Terraform (infra/terraform not found)"
  else
    (cd infra/terraform && terraform init -input=false)
    if [ "${TERRAFORM_AUTO_APPLY}" = "1" ] || [ ! -t 0 ]; then
      echo "   Applying Terraform (non-interactive or TERRAFORM_AUTO_APPLY=1)..."
      (cd infra/terraform && terraform apply -input=false -auto-approve) || echo "   Terraform apply failed or no changes (instances may already exist)."
    else
      echo "   Plan: run 'cd infra/terraform && terraform plan' to review, then apply."
      read -p "   Apply Terraform now? [y/N] " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        (cd infra/terraform && terraform apply -input=false -auto-approve)
      else
        echo "   Skipped Terraform apply. Set SKIP_TERRAFORM=1 next run to skip init too."
      fi
    fi
  fi
  echo ""
else
  echo "📐 Step 1/4: Terraform skipped (SKIP_TERRAFORM=1)"
  echo ""
fi

# --- 2) App instance: deploy/app (Caddy + app + Postgres) ---
if [ "${SKIP_APP}" != "1" ]; then
  echo "🌐 Step 2/4: Deploy app stack on $APP_IP (deploy/app + Caddy)"
  export SSH_SERVER_IP="$APP_IP"
  bash deployment/deploy-safepsy.sh
  echo ""
else
  echo "🌐 Step 2/4: App deploy skipped (SKIP_APP=1)"
  echo ""
fi

# --- 3) Chatbot instance: deploy/chatbot ---
if [ "${SKIP_CHATBOT}" != "1" ]; then
  echo "🤖 Step 3/4: Deploy chatbot on $CHATBOT_IP (deploy/chatbot)"
  export SSH_SERVER_IP="$CHATBOT_IP"
  bash deployment/update-production.sh
  echo ""
else
  echo "🤖 Step 3/4: Chatbot deploy skipped (SKIP_CHATBOT=1)"
  echo ""
fi

# --- 4) Verify ---
echo "✅ Step 4/4: Verify endpoints"
FRONTEND_IP="$APP_IP" API_SERVER_IP="$CHATBOT_IP" bash deployment/verify-live.sh

echo ""
echo "Done. App: https://safepsy.com (and http://$APP_IP). Chatbot: http://$CHATBOT_IP:8000/healthz"
