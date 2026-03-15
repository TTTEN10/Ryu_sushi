#!/bin/bash

# Deploy SafePsy using Scaleway API to configure instance and deploy app
# This script uses Scaleway API to ensure SSH access, then deploys the application

set -e

# Configuration - scw-focused-dubinsky (app instance, DEV1-S)
INSTANCE_IP="${SSH_SERVER_IP:-51.159.176.62}"
INSTANCE_ID="b37315e2-f767-4c87-9488-995ab19fa402"
SSH_KEY_ID="d7fcea26-d585-41b2-945c-30659d083a4d"
SERVER_USER="root"
APP_DIR="/opt/safepsy-landing"
PUBLIC_DNS="b37315e2-f767-4c87-9488-995ab19fa402.pub.instances.scw.cloud"

# SSH key: use SSH_KEY_FILE if set (e.g. ~/.ssh/scaleway-gpu-key)
SSH_KEY_FILE="${SSH_KEY_FILE:-}"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15"
[ -n "$SSH_KEY_FILE" ] && [ -f "$SSH_KEY_FILE" ] && SSH_OPTS="$SSH_OPTS -i $SSH_KEY_FILE"

# Scaleway credentials from terraform.tfvars
SCW_ACCESS_KEY="${SCW_ACCESS_KEY:-SCW517TG8E1ZMDW3WTD7}"
SCW_SECRET_KEY="${SCW_SECRET_KEY:-e9770810-4818-44a2-b6bf-f5629079f780}"
SCW_PROJECT_ID="${SCW_PROJECT_ID:-5dad0cb7-c16a-4447-9a25-e89bd3448e8a}"
SCW_ZONE="fr-par-2"

echo "🚀 Starting SafePsy Deployment via Scaleway API"
echo "Instance IP: $INSTANCE_IP"
echo "Instance ID: $INSTANCE_ID"
echo ""

# Check if Scaleway CLI is available
if ! command -v scw &> /dev/null; then
    echo "📦 Installing Scaleway CLI..."
    # Install Scaleway CLI
    curl -o /tmp/scw -L "https://github.com/scaleway/scaleway-cli/releases/latest/download/scw-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m)"
    chmod +x /tmp/scw
    SCW_CMD="/tmp/scw"
else
    SCW_CMD="scw"
fi

# Configure Scaleway CLI
echo "🔐 Configuring Scaleway CLI..."
export SCW_ACCESS_KEY="$SCW_ACCESS_KEY"
export SCW_SECRET_KEY="$SCW_SECRET_KEY"
export SCW_DEFAULT_PROJECT_ID="$SCW_PROJECT_ID"
export SCW_DEFAULT_ZONE="$SCW_ZONE"

# Initialize Scaleway CLI config
$SCW_CMD config set access-key="$SCW_ACCESS_KEY" secret-key="$SCW_SECRET_KEY" default-project-id="$SCW_PROJECT_ID" default-zone="$SCW_ZONE" 2>/dev/null || true

echo "🔍 Checking instance status..."
INSTANCE_STATUS=$($SCW_CMD instance server get "$INSTANCE_ID" zone="$SCW_ZONE" -o json 2>/dev/null | grep -o '"state":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [ "$INSTANCE_STATUS" != "running" ]; then
    echo "⚠️  Instance is not running. Current status: $INSTANCE_STATUS"
    echo "🔄 Starting instance..."
    $SCW_CMD instance server start "$INSTANCE_ID" zone="$SCW_ZONE" wait
    sleep 10
fi

echo "✅ Instance is running"

# Wait for SSH to be available
echo "⏳ Waiting for SSH to be available..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if ssh $SSH_OPTS -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$INSTANCE_IP" "echo 'SSH ready'" 2>/dev/null; then
        echo "✅ SSH is available"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - waiting 5 seconds..."
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ SSH is not available after $MAX_RETRIES attempts"
    echo "💡 Trying to add SSH key via Scaleway API..."
    
    # Get current SSH keys on instance
    CURRENT_KEYS=$($SCW_CMD instance server get "$INSTANCE_ID" zone="$SCW_ZONE" -o json 2>/dev/null | grep -o '"ssh_key_ids":\[[^]]*\]' || echo "")
    
    if [[ ! "$CURRENT_KEYS" =~ "$SSH_KEY_ID" ]]; then
        echo "🔑 Adding SSH key to instance..."
        # Note: Scaleway API requires updating the entire server config
        # This is complex via CLI, so we'll proceed with manual SSH setup instructions
        echo "⚠️  Please add SSH key manually via Scaleway Console:"
        echo "   1. Go to Scaleway Console > Instances > $INSTANCE_ID"
        echo "   2. Add SSH key: $SSH_KEY_ID"
        echo "   3. Or use: ssh-copy-id -i ~/.ssh/id_ed25519.pub root@$INSTANCE_IP"
        exit 1
    fi
fi

# Function to run commands on remote server
run_remote() {
    ssh $SSH_OPTS "$SERVER_USER@$INSTANCE_IP" "$1"
}

echo "📦 Installing Docker and dependencies..."
run_remote "apt update && apt install -y docker.io docker-compose git curl || (apt install -y docker.io git curl && curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose)"

echo "🔧 Starting Docker service..."
run_remote "systemctl start docker && systemctl enable docker || service docker start"

echo "📁 Creating application directory..."
run_remote "mkdir -p $APP_DIR"

echo "📥 Cloning repository..."
run_remote "cd $APP_DIR && (git clone https://github.com/TTTEN10/SPappv1.1.git . 2>/dev/null || (cd $APP_DIR && git pull))"

echo "🔧 Creating production environment files..."

# Generate secure database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create production .env file
run_remote "cat > $APP_DIR/.env << 'EOF'
# SafePsy Production Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://safepsy.com,https://www.safepsy.com,https://${PUBLIC_DNS}
IP_HASHING_ENABLED=false
PLAUSIBLE_DOMAIN=safepsy.com
ENABLE_CONFIRMATION_EMAIL=false
EOF"

# Create production backend .env file
run_remote "cat > $APP_DIR/apps/api/.env << 'EOF'
# SafePsy Backend Production Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://safepsy.com,https://www.safepsy.com,https://${PUBLIC_DNS}
IP_HASHING_ENABLED=false
PLAUSIBLE_DOMAIN=safepsy.com
ENABLE_CONFIRMATION_EMAIL=false
DATABASE_URL=postgresql://safepsy_user:${DB_PASSWORD}@postgres:5432/safepsy
EOF"

# Create production frontend .env file
run_remote "cat > $APP_DIR/apps/web/.env << 'EOF'
# SafePsy Frontend Production Configuration
VITE_PLAUSIBLE_DOMAIN=safepsy.com
VITE_API_URL=https://safepsy.com/api
EOF"

# Create deploy/app/.env with database password
run_remote "cd $APP_DIR && cp deploy/app/.env.example deploy/app/.env || true"
run_remote "cd $APP_DIR && sed -i 's/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${DB_PASSWORD}/' deploy/app/.env || true"
run_remote "cd $APP_DIR && sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://safepsy_user:${DB_PASSWORD}@postgres:5432/safepsy|' deploy/app/.env || true"

echo "🐳 Building and starting Docker containers..."
run_remote "cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml up --build -d"

echo "⏳ Waiting for services to start..."
sleep 30

echo "🔍 Checking service status..."
run_remote "cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml ps"

echo "🌐 Testing application..."
run_remote "sleep 10 && curl -f http://localhost:80/healthz || curl -f http://localhost:80/ || echo 'Health check - checking logs...'"

echo "📋 Recent logs..."
run_remote "cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml logs --tail=20"

echo ""
echo "✅ Deployment completed!"
echo "🌍 Your SafePsy application should be available at:"
echo "   - https://safepsy.com"
echo "   - https://www.safepsy.com"
echo "   - http://$INSTANCE_IP"
echo ""
echo "🔐 Database password: $DB_PASSWORD (saved in deploy/app/.env)"
