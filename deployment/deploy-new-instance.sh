#!/bin/bash

# Production Deployment Script for New Instance
# Deploys to the new Scaleway instance: 51.158.74.207

set -e

# New instance configuration
SERVER_IP="${SSH_SERVER_IP:-51.158.74.207}"
SERVER_USER="root"
APP_DIR="/opt/safepsy-landing"
PUBLIC_DNS="8e26220a-0431-416e-b297-082caef80524.pub.instances.scw.cloud"
REPO_URL="https://github.com/TTTEN10/SPappv1.1.git"

echo "🚀 Starting Deployment to New Instance"
echo "Server: $SERVER_IP"
echo "Public DNS: $PUBLIC_DNS"
echo ""

# Function to run commands on remote server
run_remote() {
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    scp -o StrictHostKeyChecking=no "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo "🔐 Checking server access..."
if ! run_remote "echo 'Connection verified'" 2>/dev/null; then
  echo "❌ ERROR: Cannot connect to server. Please ensure SSH keys are configured."
  echo "   Try: ssh-copy-id $SERVER_USER@$SERVER_IP"
  exit 1
fi

echo "📦 Installing Docker and dependencies..."
run_remote "apt update && apt install -y docker.io docker-compose git curl || (apt install -y docker.io git curl && curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose)"

echo "🔧 Starting Docker service..."
run_remote "systemctl start docker && systemctl enable docker || service docker start"

echo "📁 Creating application directory..."
run_remote "mkdir -p $APP_DIR"

echo "📥 Cloning repository..."
run_remote "cd $APP_DIR && git clone $REPO_URL . || (cd $APP_DIR && git pull)"

echo "🔧 Creating production environment files..."

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

# Get database credentials from environment or use defaults
DB_USER="${DATABASE_USER:-safepsy_user}"
DB_PASSWORD="${DATABASE_PASSWORD:-ceCS4EeuS3owaoFnAZYPvyLg6BrxvOYeeNTFzYed5EU=}"
DB_NAME="${DATABASE_NAME:-safepsy}"
DB_HOST="${DATABASE_HOST:-postgres}"
DB_PORT="${DATABASE_PORT:-5432}"

# Create production backend .env file
run_remote "cat > $APP_DIR/apps/api/.env << 'EOF'
# SafePsy Backend Production Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://safepsy.com,https://www.safepsy.com,https://${PUBLIC_DNS}
IP_HASHING_ENABLED=false
PLAUSIBLE_DOMAIN=safepsy.com
ENABLE_CONFIRMATION_EMAIL=false
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
EOF"

# Create production frontend .env file
run_remote "cat > $APP_DIR/apps/web/.env << 'EOF'
# SafePsy Frontend Production Configuration
VITE_PLAUSIBLE_DOMAIN=safepsy.com
VITE_API_URL=https://safepsy.com/api
EOF"

echo "🐳 Building and starting Docker containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml up --build -d"

echo "⏳ Waiting for services to start..."
sleep 30

echo "🔍 Checking service status..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps"

echo "🌐 Testing application..."
run_remote "sleep 10 && curl -f http://localhost:80/healthz || curl -f http://localhost:80/ || echo 'Health check failed'"

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🌍 Your SafePsy application should be available at:"
echo "   - https://safepsy.com (main site)"
echo "   - https://www.safepsy.com (redirects to safepsy.com)"
echo "   - https://safepsy.com/chat (chat route)"
echo "   - http://${SERVER_IP} (direct IP access)"
echo ""
echo "🔧 Useful commands:"
echo "   Check logs: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs -f'"
echo "   Stop: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml down'"
echo "   Restart: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml restart'"
