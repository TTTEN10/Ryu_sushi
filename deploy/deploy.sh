#!/usr/bin/env bash
# Déploiement de Ryu Sushi sur une instance Scaleway: podman + Caddy (HTTPS Let's Encrypt)
# À exécuter en root sur l'instance, depuis n'importe où (le script se repère au dossier deploy/).
set -euo pipefail

DOMAIN="${DOMAIN:-ryusushi.fr}"
APP_IMAGE="${APP_IMAGE:-ryu-sushi:latest}"
NET="ryu-net"
DATA_VOL="ryu-data"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
CADDYFILE="$REPO/deploy/Caddyfile"

[ "$(id -u)" -eq 0 ] || { echo "Erreur: exécuter en root (sudo)." >&2; exit 1; }
[ -f "$REPO/Containerfile" ] || { echo "Erreur: Containerfile introuvable dans $REPO." >&2; exit 1; }

# 1/8 Vérifier podman (la 3.4.4 d'Ubuntu 22.04 convient: le CNI est corrigé à l'étape 4/8)
PODMAN_MAJOR="$(podman --version 2>/dev/null | sed -nE 's/.*version ([0-9]+).*/\1/p')"
if [ "${PODMAN_MAJOR:-0}" -ge 3 ]; then
  echo "[1/8] podman $PODMAN_MAJOR.x déjà installé."
else
  if [ -n "$PODMAN_MAJOR" ]; then
    echo "[1/8] podman $PODMAN_MAJOR.x trop ancien. Mise à niveau vers podman 3.x/4.x..."
  else
    echo "[1/8] Installation de podman..."
  fi
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y podman buildah
fi

# 2/8 Environnement de production
cd "$REPO"
echo "[2/8] Vérification de .env.production..."
if [ ! -f .env.production ]; then
  cp deploy/.env.production.example .env.production
  echo "      .env.production créé à partir du modèle."
  echo "      Avertissement: SMTP vide => emails désactivés (base SQLite active)."
  echo "      Pour activer les emails: modifier .env.production puis relancer le script."
fi

# 3/8 Construction de l'image
echo "[3/8] Construction de l'image $APP_IMAGE (amd64 natif)..."
podman build -t "$APP_IMAGE" .

# 4/8 Réseau et volumes
echo "[4/8] Réseau $NET et volumes..."
podman network create "$NET" >/dev/null 2>&1 || true
# Podman 3.4.4 (CNI) d'Ubuntu 22.04 génère les réseaux en cniVersion 1.0.0,
# que le plugin firewall local ne supporte pas ("firewall does not support
# config version 1.0.0"). On rétrograde en 0.4.0 (comme le réseau par défaut,
# qui fonctionne) et on vide le cache IPAM éventuellement corrompu.
if [ -f /etc/cni/net.d/ryu-net.conflist ]; then
  sed -i 's/"cniVersion": "1.0.0"/"cniVersion": "0.4.0"/' /etc/cni/net.d/ryu-net.conflist
  rm -rf /var/lib/cni/networks/ryu-net
fi
for v in "$DATA_VOL" caddy-data caddy-config; do
  podman volume create "$v" >/dev/null 2>&1 || true
done

# 5/8 Droits d'écriture du volume de données pour l'utilisateur node (uid 1000) du conteneur
echo "[5/8] Permissions du volume $DATA_VOL..."
podman run --rm --user 0 -v "$DATA_VOL":/data "$APP_IMAGE" chown -R 1000:1000 /data

# 6/8 Conteneurs applicatif + Caddy
echo "[6/8] Lancement des conteneurs..."
# Nettoie un éventuel dnsmasq orphelin du plugin dnsname (podman 3.x ne le
# ferme pas toujours: "dnsmasq: address already in use" au redémarrage).
pkill -f 'containers/cni/dnsname/ryu-net/' >/dev/null 2>&1 || true
podman rm -f ryu-sushi ryu-caddy >/dev/null 2>&1 || true

podman run -d --name ryu-sushi \
  --network "$NET" \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e CORS_ORIGIN="https://$DOMAIN" \
  -e DB_PATH="/data/ryu-sushi.db" \
  --env-file .env.production \
  -v "$DATA_VOL":/data \
  --health-cmd 'node -e "fetch(\"http://localhost:3001/api/health\").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"' \
  --health-interval 30s --health-timeout 5s --health-retries 3 \
  "$APP_IMAGE"

podman run -d --name ryu-caddy \
  --network "$NET" \
  -p 80:80 \
  -p 443:443 \
  -v "$CADDYFILE:/etc/caddy/Caddyfile:ro" \
  -v caddy-data:/data \
  -v caddy-config:/config \
  docker.io/library/caddy:2-alpine

# 7/8 Services systemd (redémarrage automatique au boot)
echo "[7/8] Installation des services systemd..."
mkdir -p /etc/systemd/system
podman generate systemd --new --name ryu-sushi > /etc/systemd/system/ryu-sushi.service
podman generate systemd --new --name ryu-caddy > /etc/systemd/system/ryu-caddy.service
sed -i '/\[Service\]/a Restart=always' /etc/systemd/system/ryu-sushi.service
sed -i '/\[Service\]/a Restart=always' /etc/systemd/system/ryu-caddy.service
# systemd démarre le service depuis /: sans WorkingDirectory, le --env-file
# relatif ".env.production" du service ryu-sushi est introuvable.
sed -i '/\[Service\]/a WorkingDirectory='"$REPO" /etc/systemd/system/ryu-sushi.service
sed -i '/\[Service\]/a WorkingDirectory='"$REPO" /etc/systemd/system/ryu-caddy.service
systemctl daemon-reload
podman stop ryu-sushi ryu-caddy >/dev/null 2>&1 || true
podman rm ryu-sushi ryu-caddy >/dev/null 2>&1 || true
# Les conteneurs lancés manuellement ci-dessus orphelinent leur dnsmasq lors de
# l'arrêt (bug podman/CNI 3.4); sans ce nettoyage systemd échoue sur
# "dnsmasq: address already in use".
pkill -f 'containers/cni/dnsname/ryu-net/' >/dev/null 2>&1 || true
systemctl enable --now ryu-sushi.service >/dev/null 2>&1 || true
systemctl enable --now ryu-caddy.service >/dev/null 2>&1 || true

# 8/8 Vérification
echo "[8/8] Vérification..."
sleep 3
podman ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E '^(NAMES|ryu-)'
echo "Site: https://$DOMAIN (certificat TLS automatique par Caddy, premier chargement ~30 s)"
