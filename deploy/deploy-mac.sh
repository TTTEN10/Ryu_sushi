#!/usr/bin/env bash
# Deploy Ryu Sushi go-live (depuis votre Mac): installe podman sur l'instance,
# copie le dépôt, construit l'image et met en ligne l'application + Caddy (HTTPS).
# Usage: ./deploy/deploy-mac.sh     (variables: INSTANCE, DOMAIN, SSH_KEY)
set -euo pipefail

INSTANCE="${INSTANCE:-51.15.79.169}"
DOMAIN="${DOMAIN:-ryusushi.fr}"
SSH_USER="${SSH_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/ryu-sushi}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

log()  { printf '\n\033[1;36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
fail() { printf '\n\033[1;31mERREUR:\033[0m %s\n' "$*" >&2; exit 1; }

# --- 0. Prérequis locaux -----------------------------------------------------
command -v ssh >/dev/null 2>&1 || fail "ssh introuvable sur ce Mac."
command -v podman >/dev/null 2>&1 || fail "podman introuvable: ces commandes servent seulement à vérifier l'image localement."

# --- 1. Sélection de la clé SSH qui ouvre l'instance --------------------------
KEYS=()
[ -n "${SSH_KEY:-}" ] && KEYS+=("$SSH_KEY")
while IFS= read -r k; do
  [ -n "$k" ] && KEYS+=("$k")
done < <(printf '%s\n' \
  "$HOME/.ssh/id_ed25519" \
  "$HOME/.ssh/tenenbaum-prod" \
  "$HOME/.ssh/scaleway-gpu-key")

SSH=()
for k in "${KEYS[@]}"; do
  [ -f "$k" ] || continue
  if ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -i "$k" "$SSH_USER@$INSTANCE" 'true' >/dev/null 2>&1; then
    SSH=(-i "$k")
    log "Clé SSH utilisée: $k"
    break
  fi
done
[ ${#SSH[@]} -gt 0 ] || fail "Aucune clé SSH n'ouvre root@$INSTANCE (port 22). Vérifier la clé ajoutée à l'instance Scaleway."

# --- 2. DNS -------------------------------------------------------------------
log "Vérification DNS $DOMAIN -> $INSTANCE"
resolve() { python3 - "$1" <<'PY' 2>/dev/null || true
import socket,sys
try: print(socket.gethostbyname(sys.argv[1]))
except Exception: pass
PY
}
RESOLVED="$(resolve "$DOMAIN")"
if [ -n "${RESOLVED:-}" ] && [ "$RESOLVED" != "$INSTANCE" ] && [ "$RESOLVED" != "$INSTANCE." ]; then
  fail "DNS de $DOMAIN pointe vers $RESOLVED, pas $INSTANCE."
fi
log "DNS ok ($DOMAIN -> ${RESOLVED:-$INSTANCE})"

# --- 3. Synchronisation du dépôt vers l'instance ------------------------------
MYARC="/tmp/env.sh"
printf 'export PATH="$PATH:/usr/bin:/bin:/usr/sbin:/sbin"\n' > "$MYARC"
log "Synchronisation du dépôt vers $SSH_USER@$INSTANCE:$REMOTE_DIR ..."
tar czf - -C "$REPO" \
  --exclude=.git --exclude=.gitignore --exclude=node_modules --exclude=.crush \
  --exclude=.claude --exclude='*.db' --exclude='*.db-*' --exclude=.env.production \
  . | ssh "${SSH[@]}" "$SSH_USER@$INSTANCE" "mkdir -p '$REMOTE_DIR' && tar xzf - -C '$REMOTE_DIR'"
rm -f "$MYARC"

# --- 4. Installation de podman sur l'instance (si absent) ----------------------
log "Vérification de podman sur l'instance..."
ssh "${SSH[@]}" "$SSH_USER@$INSTANCE" "sh -c '
  set -e
  command -v podman >/dev/null 2>&1 && { echo \"podman présent\"; exit 0; }
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq podman
  echo \"podman installé\"
'" || fail "Échec de l'installation de podman sur l'instance."

# --- 5. Deploiement (image, conteneur ryu-sushi + Caddy, systemd) --------------
log "Déploiement (build image + lancement Caddy et conteneur)..."
ssh "${SSH[@]}" "$SSH_USER@$INSTANCE" "cd '$REMOTE_DIR' && ./deploy/deploy.sh"

# --- 6. Attente du site en ligne ----------------------------------------------
log "Attente du site https://$DOMAIN (TLS Let's Encrypt, première fois ~30-60 s)..."
http_check() {
  if command -v curl >/dev/null 2>&1; then
    curl -m 8 -fsS "$1" >/dev/null 2>&1
  else
    node -e "fetch('$1').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1
  fi
}
UP=0
for i in $(seq 1 24); do
  if http_check "http://$DOMAIN/api/health"; then UP=$((UP+1)); fi
  [ "$UP" -ge 2 ] && break
  sleep 5
done

# --- 7. Rapport final ----------------------------------------------------------
set +e
HEALTH="$( (curl -m 10 -fsS "https://$DOMAIN/api/health" 2>/dev/null || node -e "fetch('https://$DOMAIN/api/health').then(r=>{process.stdout.write(String(r.status));process.exit(r.ok?0:1)}).catch(()=>process.exit(1))" 2>/dev/null) )"
HTTP="$( (curl -m 10 -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/" 2>/dev/null) || echo '?')"
TPL="$(curl -m 10 -fsS "https://$DOMAIN/" 2>/dev/null | grep -o 'Ryu Sushi' | head -1)"
set -e

printf '\n\033[1;32mDeploiement termine.\033[0m\n'
printf '  - API:     https://%s/api/health -> %s\n' "$DOMAIN" "${HEALTH:-KO}"
printf '  - Site:    https://%s  (HTTP %s) %s\n' "$DOMAIN" "${HTTP:-?}" "$([ "$TPL" = "Ryu Sushi" ] && echo '[content ok]' || echo '[verifier]')"
printf '  - Instance: %s (%ssystemd)\n' "$INSTANCE" ""
printf '\nCommandes:\n  ssh -i <cle> root@%s "podman ps && podman logs -f ryu-sushi|ryu-caddy"\n' "$INSTANCE"
