#!/bin/bash
# Déploiement de dkpsychologue.com sur Scaleway DEV1-S
# Instance: scw-exciting-dodo (151.115.149.202)

set -e

# Configuration
SERVER_USER="root"
SERVER_IP="151.115.149.202"
SERVER_NAME="scw-exciting-dodo"
REMOTE_DIR="/root/dkpsychologue"

echo "=== Déploiement dkpsychologue.com ==="
echo "Serveur: $SERVER_NAME ($SERVER_IP)"
echo ""

# 1. Build de l'application
echo ">> Build de l'application..."
cd "$(dirname "$0")/src"
npm run build
cd ..

# 2. Copier les fichiers buildés vers le dossier public
echo ""
echo ">> Copie des fichiers buildés vers le dossier public..."
rm -rf public/assets public/index.html
cp -r src/dist/* public/

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

# 4. S'assurer que Docker est installé (image Docker Scaleway)
echo ""
echo ">> Vérification de Docker..."
ssh "$SERVER_USER@$SERVER_IP" "docker --version" || {
    echo "Installation de Docker..."
    ssh "$SERVER_USER@$SERVER_IP" "curl -fsSL https://get.docker.com | sh"
}

# 5. S'assurer que Docker Compose est disponible
echo ""
echo ">> Vérification de Docker Compose..."
ssh "$SERVER_USER@$SERVER_IP" "docker compose version --short 2>/dev/null || docker-compose --version --short 2>/dev/null" || {
    echo "Docker Compose non trouvé, installation..."
    ssh "$SERVER_USER@$SERVER_IP" "apt-get update && apt-get install -y docker-compose-plugin"
}

# 6. Copier les fichiers sur le serveur
echo ""
echo ">> Copie des fichiers vers le serveur..."
# Créer le dossier distant d'abord
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $REMOTE_DIR/public"
scp -q Dockerfile Caddyfile docker-compose.yml docker-compose.prod.yml .env.example "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/"
scp -rq public/ "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/"
scp -q DEPLOY.md "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/" 2>/dev/null || true

# 7. Configurer le fichier .env sur le serveur
echo ""
echo ">> Configuration du fichier .env..."
ssh "$SERVER_USER@$SERVER_IP" "cd $REMOTE_DIR && if [ ! -f .env ]; then cp .env.example .env; fi"

# 8. Build et démarrage des conteneurs (avec overrides production pour ports 80/443)
echo ""
echo ">> Build et démarrage des conteneurs..."
ssh "$SERVER_USER@$SERVER_IP" "cd $REMOTE_DIR && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"

# 9. Vérifier le statut
echo ""
echo ">> Vérification du déploiement..."
ssh "$SERVER_USER@$SERVER_IP" "cd $REMOTE_DIR && docker compose ps"

echo ""
echo "=== Déploiement terminé ==="
echo ""
echo "Prochaines étapes:"
echo "1. Configurer le DNS:"
echo "   dkpsychologue.com.     IN  A     151.115.149.202"
echo "   www.dkpsychologue.com. IN  A     151.115.149.202"
echo ""
echo "2. Attendre la propagation DNS puis vérifier:"
echo "   curl -I https://dkpsychologue.com"
echo ""
echo "3. Surveiller les logs:"
echo "   ssh $SERVER_USER@$SERVER_IP 'docker compose -C $REMOTE_DIR logs -f'"
echo ""