# Déploiement Ryu Sushi (podman + Caddy, HTTPS pour ryusushi.fr)

## Prérequis

- Instance Scaleway STARDUST1-S (Linux Debian/Ubuntu, amd64), étendue publique 51.15.79.169
- DNS: `ryusushi.fr -> 51.15.79.169` (déjà configuré)
- Opening des ports **80** et **443** (entrants) dans le Security Group de l'instance
- Le dépôt complet (avec `Containerfile`, `server/`, `src/`, `public/`) présent sur l'instance

## Déploiement

Sur l'instance, depuis la racine du dépôt (recommandé: `/opt/ryu-sushi`):

```bash
git clone https://github.com/TTTEN10/Ryu_sushi.git /opt/ryu-sushi
cd /opt/ryu-sushi
# optionnel: git checkout <branche>
sudo ./deploy/deploy.sh
```

Au premier passage, le script crée `.env.production` à partir du modèle puis s'arrête:
compléter les variables SMTP (laisser `SMTP_USER` vide pour désactiver l'envoi) et relancer.

Le script:
1. installe podman si absent
2. construit l'image `ryu-sushi:latest` (multistage: Vite puis Express)
3. crée le réseau podman `ryu-net` + volumes (`ryu-data`, `caddy-data`, `caddy-config`)
4. lance `ryu-sushi` (app sur 3001, DB SQLite persistée dans `ryu-data`) + `ryu-caddy` (80/443, TLS auto pour `ryusushi.fr`)
5. installe des services systemd pour le redémarrage au boot

## Architecture

```
ryusushi.fr:443 (Caddy, TLS Let's Encrypt auto)
   └── reverse_proxy -> ryu-sushi:3001 (Express: /api/* + frontend dist/)
```

- L'API est accessible sur `/api/*` (le serveur Express retire le préfixe `/api`)
- Le frontend (build Vite) est servi par Express lui-même, fallback SPA inclus
- La base SQLite `ryu-sushi.db` est stockée dans le volume `ryu-data`, monté sur `/data` du conteneur

## Commandes utiles

```bash
podman ps                                   # état des conteneurs
podman logs -f ryu-sushi                    # logs de l'application
podman logs -f ryu-caddy                    # logs de Caddy / TLS
systemctl status ryu-sushi.service          # service applicatif
```

## Problèmes connus et contournements (podman 3.4.4 d'Ubuntu 22.04)

Sur Ubuntu 22.04, podman 3.4.4 (CNI) nécessite 3 corrections, intégrées à `deploy.sh`:

1. **Réseau `ryu-net` — cniVersion 1.0.0 refusé.** Le réseau créé par
   `podman network create` est écrit en `cniVersion: 1.0.0`, que le plugin
   `firewall` d'Ubuntu 22.04 refuse (`plugin firewall does not support config
   version 1.0.0`, `CNI network "ryu-net" not found`). Le script rétrograde
   `/etc/cni/net.d/ryu-net.conflist` en `0.4.0` (même version que le réseau
   par défaut) puis vide `/var/lib/cni/networks/ryu-net`.
2. **dnsmasq orphelin du plugin dnsname.** `podman stop/rm` ne ferme pas
   toujours le dnsmasq du plugin dnsname: au redémarrage, les conteneurs
   échouent avec `dnsmasq: address already in use`. Le script tue les
   processus restants via `pkill -f 'containers/cni/dnsname/ryu-net/'`
   avant chaque (re)lancement.
3. **Services systemd — `.env.production` relatif.** Les unités générées par
   `podman generate systemd` héritent du `--env-file .env.production` relatif:
   systemd démarre depuis `/` et ne trouve pas le fichier. Le script ajoute
   `WorkingDirectory=$REPO` aux unités.
4. **Ports publiés injoignables (FORWARD DROP).** Podman 3.4.4 DNATé bien
   `80`/`443` vers le conteneur Caddy mais ne crée pas de règle d'acceptation
   des connexions `NEW` entrantes: `-P FORWARD DROP` les jette (timeouts
   externes alors que SSH et le SG Scaleway passent). `deploy.sh` insère la
   règle `ACCEPT ... --ctstate NEW` et installe le service `ryu-ports.service`
   qui la réapplique à chaque boot.

Prérequis externe: ouvrir les ports entrants **80** et **443** dans le Security
Group Scaleway de l'instance. Le premier certificat Let's Encrypt est alors émis
automatiquement par Caddy (compte ACME de production forcé via `acme_ca` dans le
Caddyfile), en quelques minutes.

## Redéploiement après modification

```bash
cd /opt/ryu-sushi && git pull
sudo ./deploy/deploy.sh
```

## Déploiement autonome GitHub Actions (CI/CD)

Le déploiement automatisé fonctionne via GitHub Actions :

### 1. Clé SSH de déploiement

L'instance Scaleway (`51.15.79.169`, zone `nl-ams-1`) utilise une clé SSH dédiée :
- **Clé publique** : `~/.ssh/ryu-deploy.pub` (sans passphrase)
- **Clé privée** : `~/.ssh/ryu-deploy` → ajoutée comme secret GitHub `SSH_PRIVATE_KEY`

Pour ajouter la clé à l'instance (première fois ou remplacement) :
```bash
# Via Scaleway CLI (recommandé, fonctionne depuis Mac/local)
scw instance ssh add-key \
  server-id=a96f58e6-fac3-4e1c-9a67-a912b536881e \
  public-key="$(cat ~/.ssh/ryu-deploy.pub)" \
  zone=nl-ams-1

# Reboot requis pour prendre en compte la nouvelle clé
scw instance server reboot a96f58e6-fac3-4e1c-9a67-a912b536881e zone=nl-ams-1 --wait
```

Ou manuellement sur l'instance (si accès SSH existant) :
```bash
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEd+Pi7mG+lsZ93HaEQOKuXK2VKn8UONcPmKlMFD4pfE ryu-deploy' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2. Workflow GitHub Actions

Le workflow `.github/workflows/deploy.yml` :
1. Checkout du code
2. Sync tarball via `scp` (exclut `.git`, `node_modules`, `*.db`, `.env.*`)
3. Extraction + exécution de `./deploy/deploy.sh` sur l'instance
4. Vérification HTTP (6 retries × 10s)

Déclenchement automatique sur push vers `feat/koi-css-fish`.
Déclenchement manuel : `gh workflow run deploy.yml --ref feat/koi-css-fish`

### 3. Dépannage SSH

Si "Permission denied (publickey)" :
- Vérifier que la clé `ryu-deploy.pub` est bien dans `~/.ssh/authorized_keys` sur le serveur
- Redémarrer l'instance après ajout de clé : `scw instance server reboot <id> zone=nl-ams-1 --wait`
- Tester localement : `ssh -i ~/.ssh/ryu-deploy root@51.15.79.169`

## Alternative nginx (sans conteneur Caddy)

Si vous préférez nginx + certbot sur l'hôte:
- supprimer le conteneur `ryu-caddy`, exposer le conteneur `ryu-sushi` sur 127.0.0.1:3001
- installer nginx + certbot, et utiliser cette config (TLS pour `ryusushi.fr`, proxy vers 3001):

```nginx
server {
  listen 80;
  server_name ryusushi.fr;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```
