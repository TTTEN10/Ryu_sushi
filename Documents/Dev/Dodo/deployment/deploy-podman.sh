#!/bin/bash
# Déploiement de dkpsychologue.com sur Scaleway DEV1-S avec PODMAN
# Instance: scw-exciting-dodo (151.115.149.202)
# Remplace le conteneur Docker par un conteneur Podman dédié.
# Docs: voir section "Déploiement Podman" dans DEPLOY.md

set -e

# Configuration
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_USER="root"
SERVER_IP="151.115.149.202"
SERVER_NAME="scw-exciting-dodo"
REMOTE_DIR="/root/dkpsychologue"
IMAGE="dkpsychologue-web"
CONTAINER="dkpsychologue-web"
SERVICE_FILE="dkpsychologue-web.service"
SERVICE_DIR="/etc/systemd/system"

echo "=== Déploiement Podman dkpsychologue.com ==="
echo "Serveur: $SERVER_NAME ($SERVER_IP)"
echo ""

# 1. Build de l'application React
echo ">> Build de l'application..."
cd "$ROOT/src"
npm run build

# 2. Copier les fichiers buildés vers le dossier public
echo ""
echo ">> Copie des fichiers buildés vers le dossier public..."
rm -rf "$ROOT/public/assets" "$ROOT/public/index.html"
cp -r "$ROOT/src/dist/"* "$ROOT/public/"

# 3. Vérifier la connexion SSH
echo ""
echo ">> Vérification de la connexion SSH..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "echo 'Connexion OK'" > /dev/null 2>&1; then
    echo "Erreur: Impossible de se connecter au serveur en SSH"
    echo "Vérifiez votre clé SSH ou configurez l'accès:"
    echo "  ssh-copy-id $SERVER_USER@$SERVER_IP"
    exit 1
fi
echo "Connexion SSH: OK"

# 4. Installer Podman si absent
echo ""
echo ">> Vérification de Podman..."
if ! ssh "$SERVER_USER@$SERVER_IP" "command -v podman >/dev/null && podman --version" > /dev/null 2>&1; then
    echo "Installation de Podman..."
    ssh "$SERVER_USER@$SERVER_IP" "apt-get update && apt-get install -y podman"
fi

# 5. Copier les fichiers sur le serveur
echo ""
echo ">> Copie des fichiers vers le serveur..."
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $REMOTE_DIR/public"
scp -q "$ROOT/deployment/Containerfile" "$ROOT/deployment/Caddyfile" "$ROOT/$SERVICE_FILE" "$ROOT/.env.example" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/"
scp -rq "$ROOT/public/" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/"

# 6. Arrêter l'ancien conteneur Docker (si présent) pour que Podman prenne le relais
echo ""
echo ">> Arrêt de l'ancien conteneur Docker (si présent)..."
ssh "$SERVER_USER@$SERVER_IP" "if command -v docker >/dev/null 2>&1 && docker ps -q --filter name=$CONTAINER | grep -q .; then docker stop $CONTAINER && docker rm $CONTAINER; fi" || echo "  (aucun conteneur Docker $CONTAINER à arrêter)"

# 7. Build de l'image avec Podman (format docker pour conserver le HEALTHCHECK)
echo ""
echo ">> Build de l'image avec Podman..."
ssh "$SERVER_USER@$SERVER_IP" "cd $REMOTE_DIR && podman build --format docker -t $IMAGE -f Containerfile ."

# 8. Installer l'unit systemd (conteneur dédié) et activer le service
echo ""
echo ">> Installation de l'unit systemd..."
ssh "$SERVER_USER@$SERVER_IP" "cp -f $REMOTE_DIR/$SERVICE_FILE $SERVICE_DIR/ && systemctl daemon-reload && systemctl enable --now $CONTAINER.service"

# 9. Vérifier le statut
echo ""
echo ">> Vérification du déploiement..."
ssh "$SERVER_USER@$SERVER_IP" "podman ps --filter name=$CONTAINER --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' && sleep 2 && curl -sI https://dkpsychologue.com | head -n 1"

echo ""
echo "=== Déploiement Podman terminé ==="
echo ""
echo "Commandes utiles:"
echo "  ssh $SERVER_USER@$SERVER_IP 'systemctl status $CONTAINER.service'"
echo "  ssh $SERVER_USER@$SERVER_IP 'podman logs -f $CONTAINER'"
echo "  ssh $SERVER_USER@$SERVER_IP 'podman healthcheck run $CONTAINER'"
echo ""
