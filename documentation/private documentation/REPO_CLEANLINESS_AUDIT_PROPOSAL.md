# Repository Cleanliness Audit Proposal

**Audit Date:** August 26, 2026  
**Auditor:** Automated scan + manual review  
**Scope:** Entire repository excluding `node_modules`

---

## Executive Summary

**Total source files:** 582  
**Test files:** 364  
**Documentation files:** 40+  
**Node modules size:** 1.9GB (expected)

**Findings:**
- ✅ **Clean:** No console.log in web runtime code
- ⚠️ **Deploy scripts:** 130+ console.log in contract deployment scripts (acceptable - deploy only)
- 🗑️ **Cleanup needed:** 2 backup files, old deployment logs, some temp files
- 🗑️ **Dead code:** Old Paywall.tsx in .local-app-stack (staging area)
- 📝 **Documentation:** Some localhost references should be updated to production URLs

---

## 1. Files Safe to Delete

### 1.1 Backup Files (2 files)

| File | Size | Reason | Action |
|------|------|--------|--------|
| `apps/api/package.json.bak` | ~2KB | Backup from previous edit | DELETE |
| `.local-app-stack/node-api-src/apps/api/package.json.bak` | ~2KB | Backup in staging area | DELETE |

**Command:**
```bash
rm apps/api/package.json.bak
rm -rf .local-app-stack/node-api-src/apps/api/package.json.bak
```

---

### 1.2 Old Deployment Logs (1 folder)

| Folder | Contents | Reason | Action |
|--------|----------|--------|--------|
| `deployment/deployment-logs/` | debug-fcc1a0.log, deploy.jsonl, tf-output.json | From Aug 26 deploy, can be archived | ARCHIVE or DELETE |

**Recommendation:** Keep only last 3 deployment logs, archive older ones.

**Command:**
```bash
# Keep only recent logs, delete debug logs
rm deployment/deployment-logs/debug-*.log
```

---

### 1.3 Application Log Files (8 files)

| File | Location | Reason | Action |
|------|----------|--------|--------|
| `logs/*.log` | Root logs folder | Development logs | DELETE |
| `logs/*.log` | `apps/api/logs/` | API logs | DELETE |
| `logs/*.log` | `.local-app-stack/node-api-src/apps/api/logs/` | Staging logs | DELETE |

**Files:**
- `logs/exceptions.log`
- `logs/error.log`
- `logs/rejections.log`
- `logs/combined.log`
- `apps/api/logs/exceptions.log`
- `apps/api/logs/error.log`
- `apps/api/logs/rejections.log`
- `apps/api/logs/combined.log`

**Command:**
```bash
rm -rf logs/*.log
rm -rf apps/api/logs/*.log
rm -rf .local-app-stack/node-api-src/apps/api/logs/*.log
```

---

### 1.4 TODO_NEXT_WEEK.md (1 file)

| File | Reason | Action |
|------|--------|--------|
| `documentation/private documentation/TODO_NEXT_WEEK.md` | Superseded by NEXT_STEPS_WEEK_AUG_26-31.md | DELETE |

**Command:**
```bash
rm "documentation/private documentation/TODO_NEXT_WEEK.md"
```

---

### 1.5 Staging Area Cleanup (Optional)

| Folder | Contents | Action |
|--------|----------|--------|
| `.local-app-stack/` | Local dev staging (~50MB) | KEEP for local dev, or DELETE if not needed |

**Note:** This folder is used for local deployment testing. Delete only if you're done with local testing.

---

## 2. Files to Review for Deletion

### 2.1 Contract Deployment Scripts (10 files in `apps/api/src/contracts/scripts/`)

| File | Purpose | Keep? |
|------|---------|-------|
| `deploy-idempotent.ts` | Sepolia testnet deploy | KEEP for mainnet migration |
| `deploy-upgradeable.ts` | UUPS proxy deploy | KEEP for mainnet migration |
| `deploy-timelock.ts` | Timelock setup | KEEP for mainnet migration |
| `setup-governance.ts` | Governance wiring | KEEP for mainnet migration |
| `fix-sepolia-ownership.ts` | Sepolia-specific fix | REVIEW - may be obsolete after mainnet |
| `smoke-check.ts` | Post-deploy verification | KEEP |
| `deployment-registry.ts` | Deployment metadata | KEEP |
| `types.ts` | Deploy script types | KEEP |
| `deploy.ts` | Basic deploy | REVIEW - superseded by deploy-idempotent? |

**Recommendation:** Keep all for now. Review `fix-sepolia-ownership.ts` and `deploy.ts` after mainnet migration.

---

### 2.2 Legacy Script Files

| File | Purpose | Keep? |
|------|---------|-------|
| `deployment/deploy-crisis-safety-net.sh` | Crisis deploy (Jul 8) | KEEP - production script |
| `deployment/deploy-instance-aware-roadmap.sh` | Old deploy wrapper | REVIEW - may be obsolete |
| `deployment/deploy-safepsy.sh` | Very old deploy (311 bytes) | REVIEW - likely obsolete |
| `scripts/backup-*.sh` | Backup scripts (Jan 4) | KEEP for DR |
| `scripts/restore-*.sh` | Restore scripts (Jan 4) | KEEP for DR |
| `scripts/dr-disaster-recovery.sh` | DR runbook | KEEP |

---

### 2.3 Dead Code / Unused Components

| File | Location | Reason | Action |
|------|----------|--------|--------|
| `Paywall.tsx` | `.local-app-stack/frontend/src/components/` | Old paywall, replaced by SubscriptionTerminal | DELETE with staging cleanup |

**Note:** Only exists in `.local-app-stack/` staging area, not in main app.

---

## 3. Documentation Updates Needed

### 3.1 Localhost References in Public Docs

**Found:** 20+ references to `localhost:3001`, `localhost:3000`, `localhost:9080`

| Document | References | Action |
|----------|------------|--------|
| `WALLET_COMPLETE_GUIDE.md` | `localhost:3001` | Add production URL alternative |
| `RAG_COMPLETE_GUIDE.md` | `localhost:3001` (5x) | Add production URL alternative |
| `PRIVACY-BY-DESIGN.md` | `localhost:3001` | Add production URL alternative |
| `TESTING_COMPLETE_GUIDE.md` | `localhost:3000`, `localhost:3001` | Add production URL alternative |
| `DID_COMPLETE_GUIDE.md` | `localhost:3001` | Add production URL alternative |
| `CRISIS_DEPLOYMENT_SUMMARY.md` | `localhost:9080` (3x) | Add production URL alternative |
| `CHAT_COMPLETE_GUIDE.md` | `localhost:3001` (2x) | Add production URL alternative |

**Recommendation:** Add a "Production URLs" section to each guide:
```markdown
## Production URLs

Replace `localhost:3001` with:
- API: `https://polinapsycho.com/api`
- App: `https://app.polinapsycho.com`
```

---

### 3.2 Sepolia Testnet References

**Action needed:** Create mainnet migration guide

| Document | Mentions Sepolia | Action |
|----------|------------------|--------|
| `FAQ.md` | "Sepolia Testnet (Chain ID 11155111)" | Add mainnet section |
| `DID_COMPLETE_GUIDE.md` | Sepolia-only runtime | Add mainnet migration section |
| `WALLET_COMPLETE_GUIDE.md` | Sepolia checklist | Add mainnet checklist |
| `programming_sprint.md` | Sepolia contract addresses | Add mainnet addresses table |

---

## 4. Proposed Cleanup Commands

### Safe to Run Now

```bash
# 1. Delete backup files
rm apps/api/package.json.bak
rm -rf .local-app-stack/node-api-src/apps/api/package.json.bak

# 2. Delete debug deployment logs
rm deployment/deployment-logs/debug-*.log

# 3. Delete application logs
rm -rf logs/*.log
rm -rf apps/api/logs/*.log
rm -rf .local-app-stack/node-api-src/apps/api/logs/*.log

# 4. Delete superseded documentation
rm "documentation/private documentation/TODO_NEXT_WEEK.md"
```

### Review Before Running

```bash
# 5. Optional: Clean staging area (only if done with local testing)
rm -rf .local-app-stack/

# 6. Optional: Remove old deploy wrapper
rm deployment/deploy-safepsy.sh
rm deployment/deploy-instance-aware-roadmap.sh
```

---

## 5. Repository Size Analysis

| Category | Size | Notes |
|----------|------|-------|
| `node_modules/` | 1.9GB | Expected, not committed |
| `.git/` | ~200MB | Git history, acceptable |
| Source code | ~50MB | TypeScript, React, etc. |
| Documentation | ~5MB | Markdown files |
| Deployment artifacts | ~10MB | Including staging area |

**Total repository size (without node_modules):** ~265MB

**Recommendation:** Repository size is healthy. No large file cleanup needed.

---

## 6. Git History Cleanup (Optional)

**Not recommended** unless repository size becomes an issue.

If needed in future:
```bash
# BFG Repo-Cleaner for sensitive data
# git filter-branch for removing large files
```

---

## 7. Action Items Summary

### Immediate (This Week)

- [ ] Delete 2 backup files
- [ ] Delete debug deployment logs
- [ ] Delete application log files (8 files)
- [ ] Delete TODO_NEXT_WEEK.md
- [ ] Update documentation with production URLs

### Before Mainnet Migration

- [ ] Review `fix-sepolia-ownership.ts` for deletion
- [ ] Review `deploy.ts` for deletion
- [ ] Create mainnet migration guide
- [ ] Update contract addresses in docs

### Post-Mainnet Migration

- [ ] Delete Sepolia-specific scripts (if no longer needed)
- [ ] Update all Sepolia references to mainnet
- [ ] Archive old deployment logs

---

## 8. Files Structure Recommendations

### Keep As-Is ✅

- Contract deployment scripts (needed for mainnet)
- Backup/restore scripts (DR preparedness)
- Public documentation (even with localhost refs - add production notes instead)

### Clean Up 🗑️

- Backup files (`.bak`)
- Debug logs
- Application runtime logs
- Superseded documentation

### Review ⚠️

- `deploy-safepsy.sh` (311 bytes, likely obsolete)
- `deploy-instance-aware-roadmap.sh` (wrapper script)
- `fix-sepolia-ownership.ts` (Sepolia-specific fix)
- `deploy.ts` (basic deploy, may be superseded)

---

*Audit completed: August 26, 2026*  
*Next audit: After mainnet migration (target: September 2026)*