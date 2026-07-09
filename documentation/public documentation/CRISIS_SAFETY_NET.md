# Crisis Safety Net - Implementation Guide

## Overview

The Safety Net is an **opt-in, privacy-first crisis support feature** that allows users to voluntarily provide contact information for crisis follow-up. It operates on these core principles:

- ✅ **Privacy-first**: No PII collection by default, client-side detection
- ✅ **User autonomy**: Opt-in only, transparent controls, easy withdrawal
- ✅ **Duty of care**: Immediate resources + optional escalation
- ✅ **Jurisdiction-aware**: Language-based hotline routing
- ✅ **False-positive safe**: Contextual filtering + user confirmation

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client-side   │────▶│  Safety Modal    │────▶│  Server-side    │
│   Detection     │     │  (Opt-in UI)     │     │  PII Storage    │
│                 │     │                  │     │  (Encrypted)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
       │                        │                        │
       │                        │                        │
       ▼                        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ 10 Languages    │     │ 3 Options:       │     │ 30-day TTL      │
│ Contextual      │     │ - Get Help Now   │     │ Auto-purge      │
│ Filtering       │     │ - Share Info     │     │ Audit logged    │
│ False +ve check │     │ - Dismiss        │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Components

### Backend (`apps/api/src/routes/crisis.ts`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/crisis/opt-in` | POST | Required | Register user for Safety Net |
| `/api/crisis/opt-in` | GET | Required | Check opt-in status |
| `/api/crisis/opt-in` | DELETE | Required | Remove opt-in data |
| `/api/crisis/hotlines` | GET | None | Get hotline by language/country |
| `/api/crisis/trigger` | POST | Required | Record crisis detection event |
| `/api/crisis/purge` | GET | None | Manually trigger expired record purge |

### Frontend

| Component | Location | Purpose |
|-----------|----------|---------|
| `useCrisisDetection` | `apps/web/src/hooks/` | Client-side keyword detection, false positive filtering |
| `SafetyModal` | `apps/web/src/components/` | Non-blocking consent modal with PII form |
| `ChatWidget` | `apps/web/src/components/` | Integrated crisis check on message send |

### Database Schema

```prisma
model CrisisOptIn {
  id                String    @id @default(cuid())
  walletAddress     String    // Pseudonymous link
  email             String?   // Encrypted at rest
  fullName          String?   // Encrypted at rest
  emergencyContact  String?   // Encrypted at rest
  language          String    // Detected language code
  consentHash       String    // Proof of opt-in
  createdAt         DateTime  @default(now())
  expiresAt         DateTime  // Auto-purge target (created + 30 days)
  lastCrisisTrigger DateTime? // Last crisis detection
  triggerCount      Int       @default(0)

  @@index([walletAddress])
  @@index([expiresAt])
}
```

## Data Flow

### 1. User Sends Message

```
User types "I want to die"
       │
       ▼
┌─────────────────────┐
│ useCrisisDetection  │  ◀── Client-side only
│ - detectLanguage()  │
│ - findKeywords()    │
│ - isFalsePositive() │
└─────────────────────┘
       │
       ▼
   Crisis detected? ───No──▶ Message sends normally
       │
      Yes
       │
       ▼
┌─────────────────────┐
│ SafetyModal opens   │  ◀── Non-blocking
│ - Shows hotline     │
│ - 3 action buttons  │
└─────────────────────┘
```

### 2. User Opts In

```
User clicks "Set Up Safety Net"
       │
       ▼
┌─────────────────────┐
│ PII Collection Form │
│ - Email (required*) │
│ - Full Name         │
│ - Emergency Contact │
│                     │
│ *At least one req.  │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ POST /api/crisis/   │
│       opt-in        │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Server:             │
│ 1. Encrypt PII      │
│ 2. Generate hash    │
│ 3. Store w/ 30d TTL │
│ 4. Log audit event  │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Confirmation        │
│ - Hotline info      │
│ - Expiry date       │
│ - Can remove anytime│
└─────────────────────┘
```

### 3. Auto-Purge (30 days)

```
Daily cron job (3 AM)
       │
       ▼
┌─────────────────────┐
│ src/jobs/           │
│ crisis-purge.ts     │
└─────────────────────┘
       │
       ▼
DELETE FROM crisis_opt_in
WHERE expiresAt < NOW()
       │
       ▼
┌─────────────────────┐
│ Audit log:          │
│ "Purged N records"  │
└─────────────────────┘
```

## Supported Languages & Hotlines

| Language | Default Hotline | Countries |
|----------|----------------|-----------|
| English (en) | 988 (call/text) | US, UK, CA, AU |
| Chinese (zh) | 800-810-1117 | CN, TW |
| Hindi (hi) | +91-22-27546669 | IN |
| Spanish (es) | +34 717 003 717 | ES, MX, US, AR |
| Arabic (ar) | 800 4673 (UAE) | AE, SA |
| French (fr) | 09 72 39 40 50 | FR, CA, BE |
| Bengali (bn) | 01779554391 | BD |
| Portuguese (pt) | +351 213 544 545 | PT, BR |
| Russian (ru) | +7 495 400 99 99 | RU |
| Urdu (ur) | 0311-7786264 | PK |

## False Positive Mitigation

The system filters out academic/hypothetical contexts:

```javascript
const NEGATIVE_CONTEXT_PATTERNS = [
  /\bsuicide prevention\b/i,
  /\bsuicide awareness\b/i,
  /\bstudying suicide\b/i,
  /\bresearch on suicide\b/i,
  /\bsuicide rate\b/i,
  /\barticle about\b/i,
  /\bmovie about\b/i,
  /\bbook about\b/i,
  /\bfor my class\b/i,
  /\bsuicide bomber\b/i,
];
```

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /opt-in | 10 requests | 15 minutes |
| POST /trigger | Standard API limit | 1 minute |
| GET /hotlines | Standard API limit | 1 minute |

## Security Measures

1. **Encryption**: All PII encrypted with AES-256-GCM at rest
2. **Consent Hash**: SHA-256 hash proves user consented without storing actual PII
3. **Audit Logging**: Every opt-in, opt-out, and trigger logged
4. **Auto-purge**: Records deleted after 30 days (no manual action needed)
5. **Wallet Auth**: Only wallet-authenticated users can opt in
6. **Rate Limiting**: Prevents abuse of opt-in system

## Deployment

### 1. Database Migration

```bash
cd apps/api
npx prisma migrate dev --name add_crisis_opt_in
npx prisma generate
```

### 2. Set Up Cron Job

Add to your server's crontab:

```bash
# Crisis opt-in auto-purge (daily at 3:00 AM)
0 3 * * * cd /path/to/SPiOSv2 && npx tsx apps/api/src/jobs/crisis-purge.ts >> logs/crisis-purge.log 2>&1
```

Or use a Node.js scheduler like `node-cron`:

```typescript
import cron from 'node-cron';
import { purgeExpiredCrisisOptIns } from './jobs/crisis-purge';

// Daily at 3:00 AM
cron.schedule('0 3 * * *', async () => {
  await purgeExpiredCrisisOptIns();
});
```

### 3. Update Privacy Policy

Add disclosure about:
- Client-side crisis detection (no server-side message scanning)
- Optional PII collection (user-controlled)
- 30-day retention period
- Right to withdraw at any time

### 4. Analytics Tracking (Optional)

The system fires these analytics events:
- `crisis_modal_dismissed` - User dismissed safety modal
- `crisis_safety_net_registered` - User opted in
- `crisis_safety_net_removed` - User opted out

## Legal & Compliance

### GDPR
- ✅ Explicit opt-in consent
- ✅ Right to withdraw (DELETE endpoint)
- ✅ Data minimization (only what user provides)
- ✅ Purpose limitation (crisis support only)
- ✅ Storage limitation (30-day auto-purge)
- ✅ Integrity & confidentiality (AES-256-GCM)

### HIPAA
- ✅ Not a covered entity (no healthcare services provided)
- ✅ No PHI storage (user-provided info, not health data)
- ⚠️ Consult legal counsel before deployment

### CCPA
- ✅ Right to know what data is collected
- ✅ Right to delete
- ✅ Right to opt-out of sale (no sale occurs)

## Ethical Considerations

1. **No Mandatory Reporting**: The system does NOT report to police/authorities automatically
2. **User Control**: Users decide whether to share info
3. **Immediate Help**: Hotline resources shown immediately, regardless of opt-in
4. **Privacy by Default**: No PII collected unless user explicitly opts in
5. **Transparency**: Clear about data use, retention, and withdrawal rights

## Testing

### Unit Tests

```bash
cd apps/api
npx vitest run src/routes/crisis.test.ts
```

### Manual Testing Flow

1. Start chat as authenticated user
2. Type crisis keyword: "I want to die"
3. Verify SafetyModal appears
4. Click "Set Up Safety Net"
5. Fill form and submit
6. Verify confirmation shown
7. Check database: `SELECT * FROM crisis_opt_in;`
8. Verify opt-in status via GET endpoint
9. Test DELETE endpoint
10. Verify record deleted

## Monitoring

Key metrics to track:
- Opt-in rate (% of crisis detections that result in opt-in)
- Dismissal rate (% of users who dismiss modal)
- False positive rate (% of detections filtered by context)
- Purge count (daily expired records deleted)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Modal not appearing | Check `useCrisisDetection` is enabled, verify keywords match |
| PII not encrypting | Verify `generateEncryptionKey()` is called before storage |
| Purge job failing | Check database connection, verify `expiresAt` field exists |
| Hotline wrong language | Check `detectedLanguage` matches supported codes |

## Future Enhancements

- [ ] Emergency contact notification (user-initiated only)
- [ ] Multi-language modal UI
- [ ] SMS crisis line integration
- [ ] Geolocation-based routing (browser API)
- [ ] Follow-up check-in messages (user-scheduled)
- [ ] Integration with professional crisis services

---

**Remember**: This feature is a safety tool, not a surveillance mechanism. Always prioritize user autonomy and privacy.
