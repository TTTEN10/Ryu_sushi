#!/bin/bash
set -e

# Configuration
INSTANCE_ID="3eadf5a9-42c0-41d8-9a5f-144e81e6abeb"
INSTANCE_IP="51.158.114.32"
DOMAIN="safepsy.com"
APP_NAME="safepsy-landing"

echo "============================================"
echo "Deploying SafePsy Landing to $DOMAIN"
echo "Instance: $INSTANCE_ID ($INSTANCE_IP)"
echo "============================================"

# Check if scw CLI is available
if ! command -v scw &> /dev/null; then
    echo "Error: Scaleway CLI (scw) is not installed"
    exit 1
fi

# Build the Docker image
echo ""
echo "[1/5] Building Docker image..."
docker build -t safepsy-landing:latest .

# Tag for Scaleway registry (optional - can also deploy directly)
echo ""
echo "[2/5] Preparing deployment to Scaleway..."

# Create deployment archive
DEPLOY_DIR="/tmp/safepsy-deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files
cp Dockerfile "$DEPLOY_DIR/"
cp Caddyfile "$DEPLOY_DIR/"
cp -r frontend "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"

# Create tarball
cd "$DEPLOY_DIR"
tar -czf safepsy-landing.tar.gz Dockerfile Caddyfile frontend package.json
cd - > /dev/null

echo ""
echo "[3/5] Copying files to instance..."
scp -o StrictHostKeyChecking=no "$DEPLOY_DIR/safepsy-landing.tar.gz" root@$INSTANCE_IP:/root/

echo ""
echo "[4/5] Deploying on remote instance..."
ssh -o StrictHostKeyChecking=no root@$INSTANCE_IP << 'EOF'
set -e

echo "Stopping existing container if running..."
docker stop safepsy-landing 2>/dev/null || true
docker rm safepsy-landing 2>/dev/null || true

echo "Extracting deployment archive..."
cd /root
tar -xzf safepsy-landing.tar.gz

echo "Building Docker image..."
docker build -t safepsy-landing:latest .

echo "Starting container..."
docker run -d \
    --name safepsy-landing \
    --restart unless-stopped \
    -p 80:80 \
    -p 443:443 \
    safepsy-landing:latest

echo "Cleaning up..."
rm -f safepsy-landing.tar.gz
rm -rf Dockerfile Caddyfile frontend package.json

echo "Container status:"
docker ps --filter name=safepsy-landing
EOF

echo ""
echo "[5/5] Verifying deployment..."
sleep 5

# Verify the site is responding
if curl -s -o /dev/null -w "%{http_code}" "http://$INSTANCE_IP" | grep -q "200\|301\|302"; then
    echo "✓ Deployment successful!"
    echo ""
    echo "============================================"
    echo "Deployment Complete!"
    echo "============================================"
    echo "Instance IP: http://$INSTANCE_IP"
    echo "Domain: https://$DOMAIN"
    echo ""
    echo "Next steps:"
    echo "1. Verify DNS points to $INSTANCE_IP"
    echo "2. Check SSL certificate provisioning (Caddy auto-provisions)"
    echo "3. Monitor logs: ssh root@$INSTANCE_IP 'docker logs -f safepsy-landing'"
    echo "============================================"
else
    echo "Warning: Could not verify deployment. Please check manually."
    exit 1
fi

# Cleanup
rm -rf "$DEPLOY_DIR"