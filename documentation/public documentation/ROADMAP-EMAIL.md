# Roadmap: Professional Email — contact@safepsy.com

> **Goal:** Provision and wire `contact@safepsy.com` as the official SafePsy contact address, replacing the current `noreply@polinapsycho.com` fallback.

---

## Context

- The contact form (`apps/api/src/routes/contact.ts`) already stores messages in Prisma and sends admin notification emails via the Postmark provider.
- The email service (`apps/api/src/lib/emailService.ts`) defaults to `noreply@polinapsycho.com` when no `EMAIL_FROM_ADDRESS` is set.
- `beta@safepsy.com` is referenced in the beta welcome packet — the domain is known but not yet fully wired for outbound mail.

---

## 1. Domain & DNS Setup

### 1.1 Register / verify `safepsy.com` with an email provider

Pick one provider and complete domain verification:

| Provider | Pros | Considerations |
|----------|------|----------------|
| **Postmark** (current backend dependency) | Works with existing Postmark provider code; excellent deliverability | Requires domain verification + DKIM setup |
| **AWS SES** | Cheapest at scale; already in codebase (was removed) | Requires IAM setup; harder sandbox → production approval |
| **Resend / SendGrid / Mailgun** | Good APIs; modern DX | Adds a new dependency to the email abstraction |

**Recommendation:** Use Postmark since the backend already depends on the `postmark` SDK and the infrastructure is partially wired.

### 1.2 DNS Records

For Postmark (recommended), add these records at your domain registrar:

| Type | Name / Host | Value | TTL |
|------|-------------|-------|-----|
| **MX** | `safepsy.com` | `smtp.postmarkapp.com` | 3600 |
| **SPF** | `safepsy.com` (TXT) | `v=spf1 include:postmarkapp.com ~all` | 3600 |
| **DKIM 1** | `postmark._domainkey.safepsy.com` (CNAME) | `postmarkapp.com.dkim.domains.marketing.email.mig43g12.com` (from Postmark dashboard) | 3600 |
| **DMARC** | `_dmarc.safepsy.com` (TXT) | `v=DMARC1; p=none; rua=mailto:dmarc@safepsy.com` | 3600 |

### 1.3 Create the mailbox

- In the Postmark dashboard, create the address **`contact@safepsy.com`** (or alias it to the existing admin inbox).
- Set up an alias/routing rule so that messages sent to `contact@safepsy.com` land in the same inbox as admin notifications.

---

## 2. Application Changes

### 2.1 Environment variable

Add to `.env.production` (and `.env.template`):

```
EMAIL_FROM_ADDRESS=contact@safepsy.com
ADMIN_NOTIFICATION_EMAIL=<admin-inbox@yourdomain.com>
```

The existing `EMAIL_FROM_ADDRESS` env var is already consumed by `PostmarkEmailProvider` (see `emailService.ts:73`).

### 2.2 Update email templates

Update all email templates in `apps/api/src/lib/emailService.ts` to:

- Use `contact@safepsy.com` as the sender (already handled via `EMAIL_FROM_ADDRESS`).
- Update footer/signature to reference `contact@safepsy.com` instead of `noreply@polinapsycho.com`.

### 2.3 Update beta contact references

| File | Current | Update to |
|------|---------|-----------|
| `documentation/public documentation/BETA_WELCOME_PACKET.md:177` | `beta@safepsy.com` | `contact@safepsy.com` |
| `documentation/public documentation/BETA_WELCOME_PACKET.md:211` | `beta@safepsy.com` | `contact@safepsy.com` |

### 2.4 (Optional) Subscribe endpoint

If the subscribe/waitlist endpoint uses the same email service, update its confirmation emails to send from `contact@safepsy.com` instead of `noreply@polinapsycho.com`.

---

## 3. Deliverability Hardening

### 3.1 DMARC policy evolution

| Phase | DMARC policy | Goal |
|-------|-------------|------|
| **Phase 1** | `p=none` | Monitor only — no rejection, collect reports |
| **Phase 2** (after 2–4 weeks, no issues) | `p=quarantine` | Mark suspicious mail as spam |
| **Phase 3** (after 1–2 months) | `p=reject` | Reject unauthenticated mail |

### 3.2 Bounce / complaint monitoring

- Set up Postmark bounce/webhook notifications.
- Monitor the admin inbox for bounce alerts.
- Keep the bounce rate below 5% and complaint rate below 0.1%.

---

## 4. Security & Privacy

- **SPF:** Softfail (`~all`) during ramp-up, hardfail (`-all`) once stable.
- **DKIM:** Sign all outbound mail from `safepsy.com`.
- **DMARC aggregate reports:** Route to `dmarc@safepsy.com` (can be a forwarding alias).
- **PII:** The contact form already redacts PII in logs (`emailService.ts` + `safetyMiddleware`). Ensure admin notification emails don't log sensitive message content.

---

## 5. Verification Checklist

- [ ] Domain `safepsy.com` verified in Postmark
- [ ] MX, SPF, DKIM records propagated (check with `dig` or MXToolbox)
- [ ] `contact@safepsy.com` created and sending test mail
- [ ] `EMAIL_FROM_ADDRESS` set in `.env.production`
- [ ] All email templates updated (confirmations, admin notifications)
- [ ] `BETA_WELCOME_PACKET.md` updated to reference `contact@safepsy.com`
- [ ] DMARC `p=none` record in place
- [ ] Test full flow: submit contact form → message stored in DB → admin receives email from `contact@safepsy.com`
- [ ] Monitor Postmark dashboard for delivery, bounces, and complaints for 1–2 weeks

---

## 6. Rollback Plan

If issues arise after switching:

1. Revert `EMAIL_FROM_ADDRESS` in `.env.production` to `noreply@polinapsycho.com`.
2. The code path is unchanged — only the env var value changes, no code deploy needed.
3. DNS records can be kept for future use; they don't affect anything if the domain isn't verified.