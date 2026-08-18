# SafePsy Privacy Policy

**Last Updated:** July 9, 2026  
**Effective Date:** July 9, 2026  
**Version:** 2.0

---

## 1. Introduction

SafePsy ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mental wellness platform.

**SafePsy is a privacy-first mental wellness platform** that helps people get private support between therapy sessions without giving up control of their data. We combine wallet-based identity, client-side encryption, and ethical AI to provide a confidential space for reflection and support.

### Key Privacy Principles

1. **Minimal data collection** — We collect only what is necessary for functionality
2. **User-controlled encryption** — Your encryption keys are derived from your wallet, not stored on our servers
3. **No training on your data** — Your conversations are never used to train AI models
4. **Transparent processing** — This policy clearly explains what data is collected and why
5. **Privacy by design** — Privacy protections are built into our architecture, not added as an afterthought

---

## 2. Information We Collect

### 2.1 Information You Provide Directly

| Data Type | When Collected | Purpose | Legal Basis |
|-----------|----------------|---------|-------------|
| **Wallet address** | When you connect your wallet | Authentication, identity verification | Contract performance (necessary to provide service) |
| **Email address** (optional) | Newsletter signup, contact form | Communication, support | Consent |
| **Full name** (optional) | Contact form | Support response | Consent |
| **Crisis contact info** (optional, encrypted) | Crisis Safety Net opt-in | Crisis follow-up support | Explicit consent (GDPR Art. 9) |
| **Support messages** | Contact form | Customer support | Legitimate interest |

### 2.2 Information Collected Automatically

| Data Type | When Collected | Purpose | Legal Basis |
|-----------|----------------|---------|-------------|
| **DID token ID** | When you create your Safe ID Token | Identity anchoring, data association | Contract performance |
| **Encrypted chat blobs** | When you save chat history | Persistent chat storage | Contract performance |
| **Chat blob hash** | When you save chat history | Integrity verification | Legitimate interest (security) |
| **Language code** | Crisis detection (client-side only) | Display appropriate crisis resources | Legitimate interest (safety) |
| **Device information** | During session | Security, fraud prevention | Legitimate interest |
| **Usage analytics** (anonymized) | During browsing | Service improvement | Legitimate interest |

### 2.3 Information We Do NOT Collect

- ❌ **Chat message content in plaintext** (only encrypted blobs stored)
- ❌ **Message content for crisis detection** (happens client-side, never transmitted)
- ❌ **Your location** (crisis hotlines shown by language, not geography)
- ❌ **Browsing history from other sites**
- ❌ **Payment card information** (processed by Stripe, not stored by us)
- ❌ **Biometric data, racial/ethnic data, political opinions, religious beliefs** (special category data under GDPR Art. 9)

---

## 3. How We Use Your Information

### 3.1 Primary Purposes

| Purpose | Data Used | Legal Basis |
|---------|-----------|-------------|
| **Provide chat functionality** | Wallet address, encrypted chat blobs, DID token ID | Contract performance |
| **Authenticate your session** | Wallet address, SIWE message signature | Contract performance |
| **Generate AI responses** | Message content (transient, in memory only) | Contract performance |
| **Crisis detection and support** | Language code (client-side detection) | Legitimate interest (vital interests) |
| **Send service communications** | Email address (if provided) | Consent |
| **Prevent fraud and abuse** | IP address (hashed, optional), wallet address | Legitimate interest (security) |
| **Improve service quality** | Anonymized analytics, error logs | Legitimate interest |

### 3.2 Secondary Purposes

| Purpose | Data Used | Legal Basis |
|---------|-----------|-------------|
| **Respond to support requests** | Email, name, message content | Consent |
| **Send newsletters** (opt-in only) | Email address | Consent |
| **Legal compliance** | All relevant data as required | Legal obligation |

---

## 4. Data Retention

### 4.1 Retention Schedule

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| **Encrypted chat blobs** | Indefinite (until you delete) | User-initiated deletion from profile |
| **Crisis opt-in PII** | 30 days from registration | Automatic purge (daily cron job) |
| **Wallet address** | Indefinite (account lifetime) | Account deletion removes association |
| **DID token** | Permanent (on-chain) | Can be revoked (metadata remains on-chain) |
| **Email subscriptions** | Until unsubscribe | User-initiated unsubscribe link |
| **Contact messages** | 2 years from submission | Automatic deletion |
| **Security audit logs** | 1 year from event | Automatic deletion |
| **Analytics events** (anonymized) | 14 months | Automatic deletion |
| **Session cookies** | 400 days | Automatic expiration |

### 4.2 Automatic Deletion

- **Crisis opt-in data:** Automatically deleted 30 days after registration via daily database purge
- **Guest chat sessions:** Cleared when browser session ends (in-memory only)
- **Failed authentication attempts:** Deleted after 24 hours

### 4.3 User-Initiated Deletion

You can delete the following at any time from your profile settings (`/profile`):
- Encrypted chat history
- Crisis Safety Net registration
- Email subscription

---

## 5. How We Share Your Information

### 5.1 Third-Party Service Providers

| Provider | Role | Data Shared | Your Rights |
|----------|------|-------------|-------------|
| **Scaleway Generative API** (or configured LLM provider) | AI chat completions | Message content (plaintext, transient) | Review their privacy policy; opt-out by not using chat |
| **Stripe** | Payment processing | Payment info, email (for receipts) | Stripe privacy policy applies; you can request data deletion |
| **Hosting provider** (Scaleway AWS, or self-hosted) | Encrypted data storage | Ciphertext only (no plaintext access) | Data Processing Agreement in place |
| **Sentry** (if configured) | Error monitoring | Redacted error logs (no PII, no message content) | Opt-out via browser settings |

### 5.2 We Do NOT Share Your Data With

- ❌ Data brokers or advertisers
- ❌ Social media platforms (unless you choose to share)
- ❌ Employers or insurance companies
- ❌ Family members or emergency contacts (unless you explicitly request during crisis opt-in)

### 5.3 Legal Disclosures

We may disclose your information if legally required:
- In response to a court order or subpoena
- To comply with legal obligations
- To protect our rights or the safety of users
- In connection with a merger, acquisition, or sale of assets (with notice to you)

---

## 6. Your Privacy Rights

### 6.1 GDPR Rights (EU/EEA/UK Users)

| Right | How to Exercise | Timeline |
|-------|-----------------|----------|
| **Right to access** | Email privacy@polinapsycho.com or use Export feature in `/profile` | 30 days |
| **Right to rectification** | Update directly in `/profile` or email us | 30 days |
| **Right to erasure** ("right to be forgotten") | Use Delete feature in `/profile` or email us | 30 days |
| **Right to restrict processing** | Email privacy@polinapsycho.com | 30 days |
| **Right to data portability** | Download JSON export from `/profile` | 30 days |
| **Right to object** | Email privacy@polinapsycho.com | 30 days |
| **Right to withdraw consent** | Unsubscribe link (email) or delete crisis opt-in in `/profile` | Immediate |

### 6.2 CCPA/CPRA Rights (California Users)

| Right | How to Exercise | Timeline |
|-------|-----------------|----------|
| **Right to know** | Email privacy@polinapsycho.com | 45 days |
| **Right to delete** | Use Delete feature in `/profile` or email us | 45 days |
| **Right to opt-out of sale** | N/A (we do not sell personal information) | N/A |
| **Right to non-discrimination** | N/A (built into policy) | N/A |

### 6.3 How to Submit a Request

1. **Email:** privacy@polinapsycho.com
2. **In-app:** Go to `/profile` → Privacy Settings
3. **Mail:** [Insert mailing address]

We will verify your identity using your wallet signature before processing requests.

---

## 7. Data Security

### 7.1 Technical Safeguards

| Safeguard | Implementation |
|-----------|----------------|
| **Encryption at rest** | AES-256-GCM for chat data; only ciphertext stored |
| **Encryption in transit** | TLS 1.3 for all network communication |
| **Key management** | Keys derived from wallet, not stored on servers |
| **Access controls** | Wallet-based authentication (SIWE, EIP-4361) |
| **Rate limiting** | Prevents abuse (5 req/min on crisis endpoints, 100 req/15min on general API) |
| **Log redaction** | Message bodies redacted in application logs |
| **IP hashing** (optional) | SHA-256 with salt when enabled; default OFF |

### 7.2 Organizational Safeguards

- **Access controls:** Only authorized personnel can access encrypted data
- **Training:** Staff trained on privacy, crisis response, and data protection
- **Incident response:** Breach notification procedures in place (72-hour GDPR requirement)
- **Data Processing Agreements:** In place with all third-party processors

### 7.3 Security Limitations

While we implement robust security measures:
- ⚠️ **We are not HIPAA certified** (we implement HIPAA-style safeguards)
- ⚠️ **We are not ISO 27001 certified** (controls aligned with ISO 27001:2022)
- ⚠️ **Not strict end-to-end encryption:** Message content is sent to LLM provider in plaintext for AI processing
- ⚠️ **On-chain metadata is public:** DID identifiers, service endpoints, and authorization events are publicly visible on blockchain

---

## 8. International Data Transfers

### 8.1 Where Your Data Is Processed

| Data Type | Processing Location | Transfer Mechanism |
|-----------|---------------------|-------------------|
| Encrypted chat blobs | EU (Scaleway, France) | No transfer needed |
| AI processing | EU (Scaleway Generative API) or self-hosted | Standard Contractual Clauses if outside EU |
| Payment processing | Global (Stripe) | EU-US Data Privacy Framework |
| Analytics | Global (configured provider) | Standard Contractual Clauses |

### 8.2 Safeguards for Transfers

- **EU-US Data Privacy Framework:** For US-based processors
- **Standard Contractual Clauses (SCCs):** For other international transfers
- **Adequacy decisions:** Where European Commission has determined adequate protection

---

## 9. Children's Privacy

SafePsy is **not intended for children under 16** without parental consent.

- We do not knowingly collect personal information from children under 16
- If you are under 16, do not use SafePsy without parental consent
- If we learn we have collected data from a child under 16 without consent, we will delete it immediately
- Parents who believe their child has provided data should contact privacy@polinapsycho.com

---

## 10. Crisis Safety Net Feature

### 10.1 What It Is

The Crisis Safety Net is an **optional, opt-in feature** that allows users in crisis to voluntarily provide contact information for follow-up support.

### 10.2 Data Collected (If You Opt In)

| Data Type | Encryption | Retention |
|-----------|------------|-----------|
| Email address | AES-256-GCM (application layer) | 30 days |
| Full name | AES-256-GCM (application layer) | 30 days |
| Emergency contact (optional) | AES-256-GCM (application layer) | 30 days |
| Language code | Plaintext | 30 days |
| Wallet address (pseudonymous link) | Plaintext (database) | 30 days |
| Consent hash | Plaintext (audit trail) | 30 days |

### 10.3 Data NOT Collected

- ❌ Chat message content
- ❌ Crisis keywords that triggered detection
- ❌ Session data or browsing history

### 10.4 How to Withdraw

- **Automatic:** Data deleted after 30 days (no action required)
- **Manual:** Go to `/profile` → Crisis Safety Net → Withdraw
- **Immediate:** Email privacy@polinapsycho.com

---

## 11. Blockchain and On-Chain Data

### 11.1 What Is Stored On-Chain

| Data Type | Public? | Immutable? | Can Be Deleted? |
|-----------|---------|------------|-----------------|
| DID token ID | Yes | Yes | No (permanent) |
| Wallet address | Yes | Yes | No (permanent) |
| Service endpoint URLs | Yes | Yes | No (permanent) |
| Authorization events | Yes | Yes | No (permanent) |
| Chat blob hashes | Yes | Yes | No (permanent) |
| Encrypted key metadata | Yes | Yes | No (permanent) |
| **Chat message content** | **No** | **No** | **N/A (not stored on-chain)** |

### 11.2 Privacy Implications

- **Public metadata:** Someone who knows your wallet address can see that you have a DID token
- **Permanent record:** On-chain data cannot be deleted (blockchain immutability)
- **Content remains private:** Only hashes and references are on-chain, not message content

### 11.3 Revocation

You can revoke your DID token from `/profile`:
- Revocation is permanent and cannot be undone
- Revoked addresses cannot mint a new DID token
- Revocation is recorded on-chain (permanent metadata)
- Off-chain data (encrypted chat) can still be deleted

---

## 12. Changes to This Policy

We will notify you of material changes via:
- **In-app notification** (banner on next login)
- **Email** (if you have provided an email address)
- **Website posting** with updated "Last Updated" date

**Material changes** include:
- New categories of data collection
- New purposes for processing
- New third-party sharing
- Changes to your privacy rights

Continued use after changes constitutes acceptance of the updated policy.

---

## 13. Contact Us

### Data Controller

**SafePsy**  
[Insert legal entity name once Estonian OÜ is registered]  
[Insert registered address]  
[Insert email]  
[Insert phone]

### Data Protection Officer (if applicable)

**Email:** dpo@polinapsycho.com (or privacy@polinapsycho.com)

### Privacy Requests

**Email:** privacy@polinapsycho.com  
**In-app:** `/profile` → Privacy Settings  
**Response time:** 30 days (GDPR), 45 days (CCPA)

### Complaints

If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority:

- **France:** CNIL (cnil.fr)
- **Estonia:** Andmekaitse Inspektsioon (aki.ee)
- **EU:** Your national DPA (see edpb.europa.eu)
- **California:** California Attorney General

---

## 14. Summary Table

| Feature | Data Collected | Storage Location | Retention | Opt-Out |
|---------|---------------|------------------|-----------|---------|
| **Wallet authentication** | Wallet address | Database (plaintext) | Account lifetime | Delete account |
| **Encrypted chat** | Ciphertext only | Database (encrypted) | Until deleted | Delete in `/profile` |
| **AI completions** | Message content (transient) | Not stored (in memory only) | Session only | Do not use chat |
| **Crisis detection** (client-side) | None (browser only) | N/A | N/A | Integral to safety |
| **Crisis Safety Net** (opt-in) | Email, name, contact (encrypted) | Database (encrypted) | 30 days | Withdraw in `/profile` |
| **DID creation** | Wallet, token ID, endpoints | On-chain (Sepolia) | Permanent | Revoke (permanent) |
| **Analytics** (anonymized) | Device, country, page views | Database | 14 months | Browser settings |
| **Security logs** | Hashed wallet, event type | Database | 1 year | N/A (security) |
| **Email subscription** | Email, consent timestamp | Database | Until unsubscribe | Unsubscribe link |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **AES-256-GCM** | Advanced Encryption Standard with 256-bit keys and Galois/Counter Mode |
| **DID** | Decentralized Identifier — a unique on-chain identity token |
| **SIWE** | Sign-In with Ethereum — wallet-based authentication standard (EIP-4361) |
| **Ciphertext** | Encrypted data (unreadable without decryption key) |
| **Plaintext** | Unencrypted, readable data |
| **Pseudonymous** | Identified by a pseudonym (wallet address) rather than real name |
| **Special category data** | Sensitive data under GDPR (health, race, religion, etc.) requiring extra protection |

---

## Appendix B: Legal Bases for Processing (GDPR Art. 6)

| Processing Activity | Legal Basis | GDPR Article |
|---------------------|-------------|--------------|
| Wallet authentication | Contract performance | Art. 6(1)(b) |
| Encrypted chat storage | Contract performance | Art. 6(1)(b) |
| AI completions | Contract performance | Art. 6(1)(b) |
| Crisis detection (client-side) | Legitimate interest (vital interests) | Art. 6(1)(d) / Art. 9(2)(c) |
| Crisis Safety Net (opt-in) | Explicit consent | Art. 6(1)(a) / Art. 9(2)(a) |
| Security logging | Legitimate interest (security) | Art. 6(1)(f) |
| Analytics (anonymized) | Legitimate interest (improvement) | Art. 6(1)(f) |
| Email newsletters | Consent | Art. 6(1)(a) |
| Legal compliance | Legal obligation | Art. 6(1)(c) |

---

**Last Updated:** July 9, 2026  
**Version:** 2.0  
**Next Review:** January 9, 2027 (or upon material changes)