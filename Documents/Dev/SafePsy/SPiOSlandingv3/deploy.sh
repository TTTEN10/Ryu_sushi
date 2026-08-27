#!/bin/bash
set -e

INSTANCE_IP="51.158.114.32"
DOMAIN="safepsy.com"
CONTAINER_NAME="safepsy-landing"

echo "============================================"
echo "Deploying SafePsy Landing to $DOMAIN"
echo "Instance: $INSTANCE_IP"
echo "============================================"

echo ""
echo "[1/4] Building Docker image..."
docker build -t safepsy-landing:latest .

DEPLOY_DIR=$(mktemp -d)
trap "rm -rf $DEPLOY_DIR" EXIT

cp Dockerfile Caddyfile index.html "$DEPLOY_DIR/"
tar -czf "$DEPLOY_DIR/deploy.tar.gz" -C "$DEPLOY_DIR" Dockerfile Caddyfile index.html

echo ""
echo "[2/4] Transferring files to instance..."
scp -o StrictHostKeyChecking=no "$DEPLOY_DIR/deploy.tar.gz" root@$INSTANCE_IP:/tmp/

echo ""
echo "[3/4] Running remote deployment..."
ssh -o StrictHostKeyChecking=no root@$INSTANCE_IP << 'EOF'
set -e
CONTAINER_NAME="safepsy-landing"

echo "Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Extracting and building..."
cd /tmp
tar -xzf deploy.tar.gz
docker build -t $CONTAINER_NAME:latest .

echo "Starting container..."
docker run -d --name $CONTAINER_NAME --restart unless-stopped -p 80:80 -p 443:443 $CONTAINER_NAME:latest

rm -f deploy.tar.gz Dockerfile Caddyfile index.html
docker ps --filter name=$CONTAINER_NAME
EOF

echo ""
echo "[4/4] Verifying deployment..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$INSTANCE_IP" 2>/dev/null || echo "000")

echo ""
echo "============================================"
echo "Deployment Complete!"
echo "============================================"
echo "Instance: http://$INSTANCE_IP"
echo "Domain: https://$DOMAIN"
echo "Logs: ssh root@$INSTANCE_IP 'docker logs -f $CONTAINER_NAME'"
echo "============================================"