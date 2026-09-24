# Déploiement — dkpsychologue.com

Site statique pour Dolgoon Khuyag, psychologue, hébergé avec Docker et Caddy sur Scaleway.

## Infrastructure

| Élément | Valeur |
|---------|--------|
| **Domaine** | dkpsychologue.com |
| **Hébergeur** | Scaleway |
| **Instance** | DEV1-S (scw-exciting-dodo) |
| **IP publique** | 151.115.149.202 |
| **DNS** | cf027684-cc74-45e7-abd8-2dd89abd0e2a.pub.instances.scw.cloud |
| **Zone** | PAR 2 (Paris) |
| **Image** | Docker (5a2044d7-79cf-4e5e-b598-413c2977dfa6) |
| **Stockage** | Block Storage 5K - 10 GB |

## Déploiement Podman (recommandé)

Le site tourne désormais dans un **conteneur Podman dédié** (`dkpsychologue-web`),
géré par systemd via une unit Quadlet, en remplacement du conteneur Docker.

### Fichiers Podman

| Fichier | Rôle |
|---------|------|
| `Containerfile` | Définition de l'image (Caddy + statique + Caddyfile) |
| `dkpsychologue-web.container` | Unité Quadlet systemd du conteneur dédié |
| `deploy-podman.sh` | Script de déploiement (build → upload → build image → activation) |

### Déploiement

```bash
./deploy-podman.sh
```

Le script va :
1. Build de l'application React (`public/`)
2. Vérifier la connexion SSH et installer Podman si nécessaire
3. Copier les fichiers sur le serveur
4. Arrêter/retirer l'ancien conteneur Docker (si présent)
5. Builder l'image avec `podman build --format docker -t dkpsychologue-web`
6. Installer l'unit Quadlet dans `/etc/containers/systemd/`
7. Démarrer le service `dkpsychologue-web.service`

### Commandes usuelles (sur le serveur)

```bash
systemctl status  dkpsychologue-web.service   # statut
podman logs   -f dkpsychologue-web            # logs
podman ps --filter name=dkpsychologue-web     # processus
podman healthcheck run dkpsychologue-web      # santé (image "docker" format)
podman build  -t dkpsychologue-web -f Containerfile .  # rebuild
```

> **Note** : l'image doit être construite avec `--format docker` pour conserver
> le `HEALTHCHECK` (format OCI par défaut de Podman ne le supporte pas).

### Validation locale (sans serveur)

```bash
podman build --format docker -t dkpsychologue-web -f Containerfile .
podman run -d --name dkpsychologue-web -p 8080:80 \
  -e ACME_AGREE=true -v caddy_data:/data -v caddy_config:/config \
  localhost/dkpsychologue-web:latest
```

## Déploiement Docker (legacy)

> L'ancienne méthode Docker (`docker-compose.yml`) reste documentée ci-dessous,
> mais a été remplacée par Podman.

## Prérequis

- Clé SSH configurée sur le serveur Scaleway
- DNS configuré pour pointer vers `151.115.149.202`
- Groupe de sécurité : ports 80, 443 et 22 ouverts
- Node.js installé localement pour le build

## Structure

```
.
├── src/                   # Code source React
│   ├── components/        # Composants React
│   │   └── site/          # Composants du site
│   ├── pages/             # Pages du site
│   ├── index.css          # Styles CSS globaux
│   ├── index.html         # Template HTML
│   ├── main.jsx           # Point d'entrée React
│   └── dist/              # Build généré (après npm run build)
├── public/                # Fichiers statiques déployés
├── Dockerfile             # Image Caddy avec configuration
├── Caddyfile              # Configuration Caddy (routes, HTTPS, headers)
├── docker-compose.yml     # Orchestration Docker
├── docker-compose.prod.yml # Overrides production
├── deploy.sh              # Script de déploiement automatique
├── .env.example           # Variables d'environnement
└── DEPLOY.md              # Ce fichier
```

## Déploiement automatique (recommandé)

```bash
# Lancer le déploiement
./deploy.sh
```

Le script va :
1. Build de l'application React (`npm run build`)
2. Copier les fichiers buildés vers le dossier `public/`
3. Vérifier la connexion SSH
4. Copier les fichiers sur le serveur
5. Configurer l'environnement
6. Build et lancer les conteneurs

## Déploiement manuel

### 1. Build local

```bash
cd src
npm install
npm run build
cd ..

# Copier les fichiers buildés vers public
rm -rf public/assets public/index.html
cp -r src/dist/* public/
```

### 2. Configurer le DNS

Ajoutez les enregistrements A chez votre registrar :

```
dkpsychologue.com.      IN  A     151.115.149.202
www.dkpsychologue.com.  IN  A     151.115.149.202
```

### 3. Se connecter au serveur

```bash
ssh root@151.115.149.202
```

### 4. Installer les dépendances (si nécessaire)

L'image Scaleway Docker inclut déjà Docker. Vérifier :

```bash
docker --version
docker compose version
```

### 5. Déployer l'application

```bash
# Créer le dossier
mkdir -p /root/dkpsychologue
cd /root/dkpsychologue

# Copier les fichiers (depuis votre machine locale)
# exit # pour quitter SSH d'abord
scp Dockerfile Caddyfile docker-compose.yml docker-compose.prod.yml .env.example root@151.115.149.202:/root/dkpsychologue/
scp -r public/ root@151.115.149.202:/root/dkpsychologue/

# Sur le serveur SSH
cd /root/dkpsychologue
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 6. Vérifier le déploiement

```bash
docker compose ps
docker compose logs -f
```

## Configuration DNS

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | @ | 151.115.149.202 | 3600 |
| A | www | 151.115.149.202 | 3600 |

**Chez Scaleway DNS :**
1. Aller dans Console > Network > DNS
2. Créer une zone `dkpsychologue.com`
3. Ajouter les enregistrements A

## Groupe de sécurité (Scaleway)

Vérifier que les ports suivants sont ouverts :

| Port | Protocole | Usage |
|------|-----------|-------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP (ACME challenge) |
| 443 | TCP | HTTPS (trafic) |

```bash
# Depuis la console Scaleway
# Instances > scw-exciting-dodo > Security Groups
# Ajouter les règles inbound
```

## Commandes utiles

```bash
# Voir les logs
docker compose logs -f

# Redémarrer
docker compose restart

# Rebuild après modification
docker compose up -d --build --force-recreate

# Arrêter
docker compose down

# Nettoyer (perd les certificats)
docker compose down -v

# Santé du conteneur
docker inspect --format='{{.State.Health.Status}}' dkpsychologue-web

# Espace disque
docker system df
```

## HTTPS / Certificats SSL

Caddy gère automatiquement Let's Encrypt :

- **Premier démarrage** : 1-2 minutes pour obtenir le certificat
- **Renouvellement** : automatique (30 jours avant expiration)
- **Stockage** : volumes `caddy_data` et `caddy_config`

**Important** : Le port 80 doit être accessible pour ACME challenge.

## Monitoring

```bash
# Logs en temps réel
docker compose logs -f

# Santé
docker compose ps

# Ressources
docker stats dkpsychologue-web

# Certificat (depuis l'extérieur)
openssl s_client -connect dkpsychologue.com:443 -servername dkpsychologue.com | openssl x509 -noout -dates
```

## Sauvegarde

```bash
# Sauvegarder les certificats
docker run --rm \
  -v dkpsychologue_caddy_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/caddy-data-$(date +%Y%m%d).tar.gz /data

# Restaurer
docker compose down
docker run --rm \
  -v dkpsychologue_caddy_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/caddy-data-YYYYMMDD.tar.gz -C /
docker compose up -d
```

## Dépannage

### Le certificat ne se génère pas

```bash
# 1. Vérifier le DNS
dig dkpsychologue.com @8.8.8.8

# 2. Vérifier les ports
nmap -p 80,443 151.115.149.202

# 3. Voir les logs Caddy
docker compose logs web

# 4. Redémarrer
docker compose down && docker compose up -d
```

### Erreur de connexion SSH

```bash
# Vérifier la clé SSH
ssh -v root@151.115.149.202

# Si nécessaire, ajouter la clé dans Scaleway
# Console > Instances > SSH Keys > Add a key
```

### Le conteneur ne démarre pas

```bash
# Voir les logs
docker compose logs web

# Vérifier la config
docker compose config

# Tester localement
docker run -p 8080:80 caddy:2.9-alpine caddy --version
```

### Le site affiche une ancienne version

```bash
# 1. Vérifier que le build est à jour
cd src && npm run build && cd ..

# 2. Copier les nouveaux fichiers
rm -rf public/assets public/index.html
cp -r src/dist/* public/

# 3. Re-déployer
./deploy.sh
```

---

## Checklist de déploiement

- [ ] DNS configuré (A records)
- [ ] Groupe de sécurité : ports 80, 443, 22 ouverts
- [ ] SSH configuré avec clé
- [ ] Build effectué (`npm run build`)
- [ ] Fichiers copiés dans `public/`
- [ ] Fichiers déployés sur le serveur
- [ ] `.env` configuré avec `ACME_EMAIL`
- [ ] Conteneurs démarrés (`docker compose ps`)
- [ ] HTTPS fonctionne (`curl -I https://dkpsychologue.com`)
- [ ] Redirection www → non-www fonctionne

---

**Dernière mise à jour** : 2026-09-03  
**Serveur** : Scaleway DEV1-S `scw-exciting-dodo` — 151.115.149.202  
**Framework** : React + Vite  
**Styles** : CSS personnalisé (variables CSS)