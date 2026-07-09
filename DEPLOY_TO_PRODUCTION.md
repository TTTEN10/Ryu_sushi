# Deploy Crisis Safety Net to polinapsycho.com

## Quick Start

Copy these commands and run them on your production server:

```bash
# 1. SSH into production server
ssh user@polinapsycho.com

# 2. Navigate to project directory
cd /path/to/SPiOSv2  # Adjust to your actual path

# 3. Pull latest code
git pull origin main

# 4. Run the production deployment script
./deployment/deploy-crisis-safety-net-production.sh

# 5. Verify deployment
curl "https://polinapsycho.com/api/crisis/hotlines?language=en"
```

---

## Detailed Step-by-Step Instructions

### Step 1: SSH to Production Server

```bash
# Replace with your actual SSH user
ssh root@polinapsycho.com
# or
ssh ubuntu@polinapsycho.com
# or
ssh your-user@polinapsycho.com
```

### Step 2: Navigate to Project Directory

```bash
# Common locations - use the one that applies:
cd /var/www/SPiOSv2
# or
cd /opt/safepsy
# or
cd ~/SPiOSv2
# or wherever your code is deployed
```

### Step 3: Pull Latest Code

```bash
# Ensure you're on main branch
git checkout main
git pull origin main
```

### Step 4: Run Deployment Script

```bash
# Make script executable (if needed)
chmod +x deployment/deploy-crisis-safety-net-production.sh

# Run deployment
./deployment/deploy-crisis-safety-net-production.sh
```

The script will:
1. ✅ Install dependencies
2. ✅ Build API and frontend
3. ✅ Run database migrations
4. ✅ Set up cron job for auto-purge
5. ✅ Restart services
6. ✅ Verify endpoints

### Step 5: Manual Cron Setup (if script fails)

If the cron job setup fails in the script, run manually:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path to your project):
0 3 * * * cd /path/to/SPiOSv2 && npm run crisis:purge >> logs/crisis-purge.log 2>&1

# Save and exit
```

### Step 6: Verify Deployment

```bash
# Test crisis hotlines endpoint
curl "https://polinapsycho.com/api/crisis/hotlines?language=en"

# Expected output:
# {"success":true,"data":{"name":"988 Suicide & Crisis Lifeline",...}}

# Test all languages
curl "https://polinapsycho.com/api/crisis/hotlines"

# Test purge endpoint
curl "https://polinapsycho.com/api/crisis/purge"

# Test frontend
curl -I "https://polinapsycho.com"
```

### Step 7: Test Full User Flow

1. **Open browser**: https://polinapsycho.com
2. **Open chat widget**
3. **Type a crisis keyword**: "I'm feeling suicidal" or "I want to die"
4. **Verify Safety Modal appears** with:
   - Crisis hotline number (988 for English)
   - "Set Up Safety Net" button
   - "Dismiss" button
5. **Test opt-in form** (optional):
   - Enter email and/or name
   - Submit
   - Verify confirmation message

---

## Troubleshooting

### Issue: SSH Connection Refused

```bash
# Check if server is reachable
ping polinapsycho.com

# Try with verbose SSH
ssh -v user@polinapsycho.com

# Check firewall rules on server
sudo ufw status
# or
sudo iptables -L
```

### Issue: Git Pull Fails

```bash
# Check git status
git status

# If there are local changes, stash them
git stash

# Try pull again
git pull origin main

# If conflicts, resolve them
git diff
# Edit conflicting files
git add <files>
git commit -m "Resolve merge conflicts"
```

### Issue: npm Install Fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Issue: Prisma Migration Fails

```bash
# Check database connection
cd apps/api
npx prisma db pull --schema=schema.prisma

# If database is empty, use db push instead
npx prisma db push --schema=schema.prisma

# Generate Prisma client
npx prisma generate --schema=schema.prisma
```

### Issue: Cron Job Not Running

```bash
# Check if cron service is running
sudo systemctl status cron
# or
sudo systemctl status crond

# Start if not running
sudo systemctl start cron
# or
sudo systemctl enable cron

# View cron logs
grep CRON /var/log/syslog
# or
tail -f /var/log/cron
```

### Issue: Endpoints Return 404

```bash
# Check if Caddy/nginx is proxying /api/crisis/* routes
# For Caddy, check Caddyfile:
cat /etc/caddy/Caddyfile | grep crisis

# Should have:
handle /api/crisis/* {
    reverse_proxy localhost:3001
}

# Restart Caddy
sudo systemctl restart caddy
```

### Issue: Endpoints Return 503

```bash
# Check if Node API is running
docker ps | grep node-api
# or
pm2 status

# Restart Node API
docker restart node-api
# or
pm2 restart all

# Check logs
docker logs node-api --tail 50
# or
pm2 logs
```

---

## Post-Deployment Checklist

- [ ] Crisis hotlines endpoint returns data
- [ ] All 10 languages available (en, es, fr, zh, hi, ar, bn, pt, ru, ur)
- [ ] Safety modal appears on crisis keywords
- [ ] Opt-in form submits successfully
- [ ] Cron job is scheduled (check with `crontab -l`)
- [ ] Purge job runs (check logs/crisis-purge.log after 3 AM)
- [ ] Privacy policy updated on website
- [ ] Analytics tracking crisis events

---

## Rollback Plan

If issues arise, rollback with:

```bash
# 1. Revert git to previous commit
git checkout <previous-commit-hash>
git pull origin <previous-commit-hash>

# 2. Rebuild
npm run build:api && npm run build:web

# 3. Restart services
docker compose restart
# or
sudo systemctl restart polinapsycho

# 4. Remove cron job
crontab -e
# Delete the crisis:purge line
```

---

## Support Contacts

- **Technical Issues**: Check logs in `logs/` directory
- **Privacy Questions**: privacy@polinapsycho.com
- **Emergency**: [Insert your emergency contact]

---

## Expected Output

After successful deployment, you should see:

```
========================================
  ✅ Crisis Safety Net Deployment Complete
========================================

Server: polinapsycho.com
Date: [timestamp]
Version: crisis-safety-net-mvp

Endpoints:
  - Hotlines: https://polinapsycho.com/api/crisis/hotlines
  - Opt-in:   https://polinapsycho.com/api/crisis/opt-in
  - Purge:    https://polinapsycho.com/api/crisis/purge

Cron Job:
  - Schedule: Daily at 3:00 AM
  - Command:  npm run crisis:purge
  - Logs:     /path/to/SPiOSv2/logs/crisis-purge.log

========================================
```

---

**Last Updated**: July 8, 2026  
**Version**: 1.0.0
