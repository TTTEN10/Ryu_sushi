# Actions for This Week: August 26-31, 2026

**Based on:** `programming_sprint.md` and `GO_TO_BETA_ROADMAP.md`  
**Status:** 🟢 READY FOR BETA (95% complete)

---

## Priority Matrix

| Priority | Task | Time | Blocks Beta? |
|----------|------|------|--------------|
| 🔴 P0 | Uptime monitoring | 1h | YES — cannot launch without monitoring |
| 🔴 P0 | Database backup verification | 1h | YES — cannot launch without backups |
| 🔴 P0 | Manual testing (47 tests) | 5h | YES — must verify features work |
| 🟡 P1 | Beta tester recruitment | 2h | NO — can start with fewer testers |
| 🟡 P1 | Repository cleanup | 1h | NO — housekeeping |
| 🟡 P1 | Documentation URL updates | 2h | NO — can be done post-launch |
| 🟢 P2 | Alpha → Beta URL migration plan | 1h | NO — planning only |
| 🟢 P2 | Sepolia → Mainnet migration plan | 2h | NO — planning only |

---

## Daily Schedule

### Day 1: August 26 (Wednesday) — Infrastructure

**Focus:** Uptime monitoring + Database backup verification

| Time | Task | Steps | Done |
|------|------|-------|------|
| Morning (30min) | Uptime monitoring setup | 1. Create UptimeRobot account (free tier)<br>2. Add monitor: `https://polinapsycho.com/healthz` (5 min interval)<br>3. Add monitor: `https://polinapsycho.com/api/chat/health` (5 min interval)<br>4. Configure email alerts to your email<br>5. Test: Stop/start a service to trigger alert | ☐ |
| Afternoon (30min) | Database backup verification | 1. SSH to production: `ssh user@51.159.165.150`<br>2. Check Scaleway dashboard → Database → Backups<br>3. Verify backup age < 24 hours<br>4. Verify retention: 30+ days<br>5. Test restore: `pg_dump -U safepsy_user safepsy_prod > test_backup.sql` | ☐ |
| Evening (1h) | Repository cleanup | 1. Delete backup files: `rm apps/api/package.json.bak`<br>2. Delete debug logs: `rm deployment/deployment-logs/debug-*.log`<br>3. Delete app logs: `rm -rf logs/*.log apps/api/logs/*.log`<br>4. Delete superseded doc: `rm documentation/private documentation/TODO_NEXT_WEEK.md` | ☐ |

**Definition of Done:**
- [ ] Both endpoints monitored every 5 minutes
- [ ] Email alert received (test trigger)
- [ ] Backup age confirmed < 24 hours
- [ ] Backup retention documented (30+ days)
- [ ] Backup files deleted
- [ ] Debug logs deleted
- [ ] Application logs deleted

---

### Day 2: August 27 (Thursday) — Manual Testing (Part 1)

**Focus:** Execute manual tests — Sections 1-4 (Critical path)

**Use:** `documentation/private documentation/BETA_MANUAL_TEST_CHECKLIST.md`

| Time | Section | Tests | Focus | Done |
|------|---------|-------|-------|------|
| Morning (1h) | Section 1: Authentication | AUTH-01 to AUTH-06 | Wallet connect, disconnect, session, guest mode | ☐ |
| Morning (45min) | Section 2: DID | DID-01 to DID-05 | Mint, persistence, revocation | ☐ |
| Afternoon (1h) | Section 3: Chat | CHAT-01 to CHAT-10 | Send/receive, crisis detection, quota, export/delete | ☐ |
| Evening (1h) | Section 4: GDPR | GDPR-01 to GDPR-07 | Banner, consent, account deletion 🔴 CRITICAL | ☐ |

**Definition of Done:**
- [ ] All 28 tests executed
- [ ] Results documented in checklist
- [ ] Pass rate calculated
- [ ] Critical tests (GDPR, Auth, Chat) all pass
- [ ] Issues logged with severity

---

### Day 3: August 28 (Friday) — Manual Testing (Part 2) + Recruitment

**Focus:** Complete testing + Start beta recruitment

| Time | Task | Steps | Done |
|------|------|-------|------|
| Morning (1h) | Section 5: Subscriptions | SUB-01 to SUB-05 | Plans, payment flow, status | ☐ |
| Morning (30min) | Section 6: Mobile | MOB-01 to MOB-04 | iOS/Android chat, crisis, Sentry | ☐ |
| Afternoon (30min) | Section 7: Errors | ERR-01 to ERR-05 | Network, LLM, database errors | ☐ |
| Afternoon (30min) | Section 8: Production Health | HLTH-01 to HLTH-05 | Healthz, chat health, LLM, DB, Redis | ☐ |
| Evening (1h) | Beta recruitment | 1. Post to LinkedIn (use template below)<br>2. Post to Twitter/X<br>3. Send 5-10 direct emails to personal network | ☐ |

**Definition of Done:**
- [ ] All 47 tests executed
- [ ] Pass rate > 90%
- [ ] LinkedIn post published
- [ ] Twitter thread posted
- [ ] 5-10 direct emails sent
- [ ] First 3-5 beta tester signups

---

### Day 4: August 29 (Saturday) — Migration Planning

**Focus:** Alpha → Beta URL migration + Sepolia → Mainnet migration planning

| Time | Task | Steps | Done |
|------|------|-------|------|
| Morning (1h) | Alpha → Beta URL migration plan | 1. Document current URLs: `polinapsycho.com/beta/chat`<br>2. Document target URLs: `app.polinapsycho.com/beta`<br>3. Plan redirect: Update landing page CTA, update docs<br>4. Test: Verify subdomain resolves correctly | ☐ |
| Afternoon (2h) | Sepolia → Mainnet migration plan | 1. List all Sepolia contract addresses in codebase<br>2. List all Sepolia RPC endpoints<br>3. Document mainnet deployment steps:<br>   - Deploy DID contracts to mainnet<br>   - Update contract addresses in `.env`<br>   - Update contract addresses in docs<br>   - Fund backend signer with mainnet ETH<br>4. Create migration runbook: `documentation/private documentation/MAINNET_MIGRATION.md` | ☐ |

**Definition of Done:**
- [ ] URL migration plan documented
- [ ] Landing page CTA update identified
- [ ] Mainnet migration runbook created
- [ ] Sepolia contract addresses listed
- [ ] Mainnet contract addresses to be added
- [ ] Backend signer funding plan (ETH amount)

---

### Day 5: August 30 (Sunday) — Documentation Updates

**Focus:** Replace localhost references with production URLs

| Time | Task | Files to Update | Done |
|------|------|-----------------|------|
| Morning (1h) | Update WALLET_COMPLETE_GUIDE.md | Replace `localhost:3001` with production API URL | ☐ |
| Morning (30min) | Update RAG_COMPLETE_GUIDE.md | Replace 5x `localhost:3001` references | ☐ |
| Afternoon (30min) | Update DID_COMPLETE_GUIDE.md | Add mainnet migration section | ☐ |
| Afternoon (30min) | Update CHAT_COMPLETE_GUIDE.md | Replace `localhost:3001` references | ☐ |
| Evening (30min) | Update TESTING_COMPLETE_GUIDE.md | Add production testing section | ☐ |

**Add to each guide:**
```markdown
## Production URLs

| Service | URL |
|---------|-----|
| API | `https://polinapsycho.com/api` |
| App | `https://app.polinapsycho.com` |
| Landing | `https://polinapsycho.com` |
```

**Definition of Done:**
- [ ] All 5 guides updated
- [ ] Production URLs section added
- [ ] Localhost references replaced or noted as "local dev only"

---

### Day 6: August 31 (Monday) — Beta Soft Launch Prep

**Focus:** First beta tester onboarding + bug fixes

| Time | Task | Steps | Done |
|------|------|-------|------|
| Morning (1h) | Review beta signups | 1. Check application form responses<br>2. Select 5-10 testers for first cohort<br>3. Send welcome emails with onboarding instructions | ☐ |
| Afternoon (1h) | Set up feedback channel | 1. Create Discord server or Slack workspace<br>2. Add welcome message, guidelines, support contact<br>3. Invite first cohort | ☐ |
| Evening (2h) | Fix critical friction points | 1. Review test failure reports<br>2. Fix top 3 issues<br>3. Deploy fixes to production | ☐ |

**Definition of Done:**
- [ ] 5-10 beta testers selected
- [ ] Welcome emails sent
- [ ] Discord/Slack channel created
- [ ] Top 3 friction points fixed
- [ ] Fixes deployed to production

---

## Beta Recruitment Templates

### LinkedIn Post

```
🧠 Beta Testing Opportunity: SafePsy

I'm launching a private, encrypted AI chatbot for mental health reflection.
Looking for 10-15 beta testers to try it and share feedback.

✅ Private: Your conversations are encrypted
✅ Anonymous: Wallet-based auth, no email required
✅ GDPR-compliant: Full data deletion, consent controls
✅ Free for beta testers

Interested? Fill out the form: [LINK TO FORM]

#MentalHealth #AI #Privacy #BetaTesting
```

### Twitter/X Thread

```
1/4 🧠 Introducing SafePsy — a private AI chatbot for mental health reflection.

Unlike other AI chat apps:
• Your conversations are encrypted (AES-256)
• No email required — wallet-based auth
• Full GDPR compliance (delete anytime)
• Not a crisis service — for reflection only

2/4 🔐 Privacy-first architecture:
• Client-side encryption
• Wallet-derived keys (not stored on servers)
• On-chain DID for identity verification
• Zero-knowledge to the platform

3/4 🎯 Looking for 10-15 beta testers to:
• Try the app
• Share honest feedback
• Help improve the experience

Free for beta duration (~2 weeks)

4/4 Interested? Fill out this form:
[LINK TO FORM]

Or DM me for details.

#MentalHealth #AI #Privacy #Web3
```

### Direct Email

```
Subject: Beta Testing Opportunity — SafePsy (Private AI Chatbot)

Hi [Name],

I'm launching a beta for SafePsy, a private AI chatbot for mental health reflection.

Key features:
- Encrypted conversations (AES-256)
- Wallet-based authentication (no email required)
- GDPR-compliant (full data deletion)
- Not a crisis service — for between-session reflection

I'm looking for 10-15 beta testers to try it and share feedback. Free for the beta duration (~2 weeks).

If you're interested, fill out this form: [LINK TO FORM]

Or just reply to this email and I'll get you set up.

Best,
[Your name]
```

---

## Success Metrics (End of Week)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Uptime monitoring | ✅ Configured | ⏳ Pending | 🟡 Day 1 |
| Database backups | ✅ Verified | ⏳ Pending | 🟡 Day 1 |
| Manual tests executed | ✅ 47/47 | ⏳ 0/47 | 🟡 Day 2-3 |
| Critical tests pass | ✅ 100% | ⏳ Pending | 🟡 Day 3 |
| Beta testers recruited | ✅ 10-15 | ⏳ 0 | 🟡 Day 3-5 |
| Documentation updated | ✅ 5 guides | ⏳ 0 | 🟡 Day 5 |
| Migration plans | ✅ 2 runbooks | ⏳ 0 | 🟡 Day 4 |
| Beta soft launch | ✅ 5-10 active | ⏳ 0 | 🟡 Day 6 |

---

## Blockers & Escalation

| Blocker | Impact | Escalation |
|---------|--------|------------|
| Cannot access production server | Blocks backup verification | Check SSH keys, Scaleway console |
| UptimeRobot alerts not received | Cannot verify monitoring | Check spam folder, reconfigure email |
| Test failures in critical path | Blocks beta launch | Fix immediately, document root cause |
| No beta tester signups | Delays soft launch | Expand recruitment channels, offer incentives |

---

## End-of-Week Review (August 31, 2026)

**Schedule:** 30-min self-review

**Questions:**
1. ✅ Did I complete infrastructure setup (monitoring, backups)?
2. ✅ What was the test pass rate?
3. ✅ How many beta testers signed up?
4. ✅ What are the top 3 friction points?
5. ✅ Are migration plans documented?
6. ✅ Am I ready for beta launch on Sept 2-5?

**Decision:**
- ☐ **Launch beta** — All metrics met, launch Sept 2-5
- ☐ **Delay 1 week** — Fix remaining issues, launch Sept 8-12
- ☐ **Delay 2+ weeks** — Major blockers, reassess timeline

---

*Document created: August 26, 2026*  
*Next review: August 31, 2026 (end of week)*