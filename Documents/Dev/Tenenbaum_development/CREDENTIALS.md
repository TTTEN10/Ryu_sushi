# Tenenbaum Development - Server Credentials & Configuration

**⚠️ SECURITY: Keep this file private. Do not commit to version control.**

---

## Server Information

| Property | Value |
|----------|-------|
| **Provider** | Scaleway |
| **Instance** | scw-tenenbaum-eu |
| **IP Address** | `51.159.154.29` |
| **Domain** | `tenenbaum.eu` |
| **SSH User** | `root` |
| **App Directory** | `/opt/tenenbaum` |

---

## SSH Configuration

**Private Key:** `~/.ssh/tenenbaum_development`

**Connect Command:**
```bash
ssh -i ~/.ssh/tenenbaum_development root@51.159.154.29
```

**Set Permissions:**
```bash
chmod 600 ~/.ssh/tenenbaum_development
```

---

## Docker Container

| Property | Value |
|----------|-------|
| **Container Name** | `tenenbaum_v2` |
| **Image** | `tenenbaum-web` |
| **Ports** | 80 (HTTP), 443 (HTTPS) |
| **Network** | `tenenbaum-network` |

---

## Deployment Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Docker Compose config for production |
| `Caddyfile` | Caddy reverse proxy config |
| `Dockerfile` | Multi-stage Docker build |
| `deploy.sh` | One-command deployment script |
| `verify.sh` | Production health verification |

---

## Quick Commands

### Deploy to Production
```bash
./deploy.sh
```

### Verify Production
```bash
./verify.sh
```

### SSH to Server
```bash
ssh -i ~/.ssh/tenenbaum_development root@51.159.154.29
```

### Check Container Status
```bash
ssh -i ~/.ssh/tenenbaum_development root@51.159.154.29 "docker ps --filter name=tenenbaum_v2"
```

### View Logs
```bash
ssh -i ~/.ssh/tenenbaum_development root@51.159.154.29 "docker logs tenenbaum_v2 --tail=50"
```

### Restart Container
```bash
ssh -i ~/.ssh/tenenbaum_development root@51.159.154.29 "docker compose -f /opt/tenenbaum/docker-compose.prod.yml restart"
```

### Stop Container
```bash
ssh -i ~/.ssh/tenenbaum_development root@51.159.154.29 "docker compose -f /opt/tenenbaum/docker-compose.prod.yml down"
```

---

## DNS Configuration

| Record | Type | Value |
|--------|------|-------|
| `tenenbaum.eu` | A | `51.159.154.29` |
| `www.tenenbaum.eu` | A | `51.159.154.29` |

SSL certificates are automatically provisioned by Caddy (Let's Encrypt).

---

**Last Updated:** 2026-09-06
**Site:** https://tenenbaum.eu