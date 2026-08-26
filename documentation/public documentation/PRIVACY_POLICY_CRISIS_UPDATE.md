# Privacy Policy Update: Crisis Safety Net Feature

## Effective Date: [Insert Date]

This document describes updates to the SafePsy Privacy Policy related to the new **Crisis Safety Net** feature.

---

## 1. Client-Side Crisis Detection

### What It Is
SafePsy now includes **client-side crisis detection** that operates entirely in your browser. When you type a message in the chat, the system checks for keywords that may indicate emotional distress or crisis in 10 languages (English, Chinese, Hindi, Spanish, Arabic, French, Bengali, Portuguese, Russian, and Urdu).

### What Data Is Collected
- **No message content is sent to our servers** for crisis detection
- Detection happens **locally in your browser** before the message is sent
- Only the **language detected** (e.g., "en" for English) is transmitted if a crisis is detected
- **No keywords or message text** are stored or transmitted for crisis detection purposes

### Purpose
- To provide immediate crisis support resources when you may be experiencing distress
- To offer you the option to voluntarily provide contact information for follow-up support
- To fulfill our duty of care while respecting your privacy

### Legal Basis (GDPR)
- **Legitimate Interest**: Providing immediate crisis support resources
- **Consent**: Optional PII collection only with explicit opt-in

---

## 2. Safety Net Opt-In (Voluntary)

### What It Is
When crisis keywords are detected, you will see a **Safety Net modal** offering:
1. Immediate crisis hotline resources (always shown)
2. An **optional** form to provide contact information for follow-up support

### What Data Is Collected (If You Opt In)
If you **choose** to opt in, we collect:
- **Email address** (encrypted at rest)
- **Full name** (encrypted at rest)
- **Emergency contact** (optional, encrypted at rest)
- **Language code** (e.g., "en", "zh", "es")
- **Wallet address** (pseudonymous identifier)
- **Consent hash** (cryptographic proof of consent, not reversible)

### What Data Is NOT Collected
- **Chat message content** is never stored as part of the Safety Net
- **Crisis keywords** that triggered the detection are not stored
- **Session data** or browsing history

### How Long We Keep It
- **30 days** from registration date
- **Automatically deleted** after 30 days (no action required from you)
- You can **withdraw at any time** from your profile settings

### Encryption
All PII is encrypted using **AES-256-GCM** before storage. Only you (with your wallet) can access this data during the 30-day window.

### Legal Basis (GDPR)
- **Explicit Consent** (Article 6(1)(a)): You actively opt in by completing the form
- **Right to Withdraw**: You can remove your Safety Net registration at any time

---

## 3. Crisis Hotline Routing

### What It Is
Based on the detected language, we display appropriate crisis hotline resources (phone numbers, websites).

### Data Processing
- **Language detection** happens in your browser
- **No location data** is collected for hotline routing
- **Default hotlines** are shown based on language, not geography

### Example Hotlines
| Language | Hotline | Website |
|----------|---------|---------|
| English (US) | 988 | 988lifeline.org |
| Spanish | +34 717 003 717 | telefonodelaesperanza.org |
| French | 09 72 39 40 50 | sosamitie.org |

---

## 4. False Positive Mitigation

### Contextual Filtering
The system includes safeguards to reduce false positives:
- Messages containing "suicide prevention", "research", "studying", etc. are **not flagged**
- Academic or hypothetical discussions are **filtered out**
- Rate limiting prevents repeated modal displays (max once per session)

### User Control
- **Dismiss**: You can dismiss the Safety Net modal (won't reappear during that session)
- **No penalty**: Dismissing does not affect your ability to use the chat
- **No logging**: Dismissals are logged anonymously (no PII, no message content)

---

## 5. Your Rights

### Right to Access
You can request a copy of your Safety Net data at any time by contacting support or from your profile settings.

### Right to Rectification
You can update your Safety Net information by withdrawing and re-registering.

### Right to Erasure ("Right to be Forgotten")
- **Automatic**: Data is deleted after 30 days
- **Manual**: You can delete it immediately from your profile settings

### Right to Restrict Processing
Withdrawing from the Safety Net stops all processing of your PII for crisis follow-up.

### Right to Data Portability
You can export your Safety Net data in JSON format from your profile.

### Right to Object
You can object to crisis detection by not using the chat feature. Detection cannot be disabled separately as it is integral to the safety system.

---

## 6. Third-Party Sharing

### No Sharing
Your Safety Net data is **never shared** with:
- Third-party advertisers
- Data brokers
- Law enforcement (unless legally compelled by court order)
- Family members or emergency contacts (unless you explicitly request it)

### Service Providers
Data is processed only by:
- **SafePsy** (data controller)
- **Hosting provider** (encrypted storage)
- **Legal authorities** (only if legally compelled)

---

## 7. Security Measures

### Technical Safeguards
- **AES-256-GCM encryption** at rest
- **TLS 1.3** in transit
- **Wallet authentication** required for access
- **Rate limiting** to prevent abuse
- **Audit logging** of all access (without PII)

### Organizational Safeguards
- **Access controls**: Only authorized personnel can access encrypted data
- **Training**: Staff trained on crisis response and privacy
- **Incident response**: Breach notification procedures in place

---

## 8. Children's Privacy

The Crisis Safety Net is available to all users. We do not knowingly collect PII from children under 16 without parental consent. If you believe a child has provided PII through the Safety Net, please contact us immediately.

---

## 9. Changes to This Policy

We will notify you of material changes to this policy via:
- **In-app notification**
- **Email** (if you've provided one)
- **Website posting** with updated effective date

---

## 10. Contact

For questions about the Crisis Safety Net or to exercise your privacy rights:

**Email**: privacy@safepsy.com  
**Address**: [Insert mailing address]  
**Data Protection Officer**: [Insert DPO contact if applicable]

---

## Summary Table

| Feature | Data Collected | Storage | Retention | Opt-Out |
|---------|---------------|---------|-----------|---------|
| Crisis Detection (client-side) | None (browser only) | N/A | N/A | N/A (integral to safety) |
| Safety Modal Display | Language code only | Temporary (session) | Session-only | Dismiss modal |
| Safety Net Opt-In | Email, name, contact (encrypted) | Encrypted DB | 30 days | Anytime via profile |
| Audit Logging | Hashed wallet, event type | Secure logs | 1 year | N/A (security) |

---

**Last Updated**: [Insert date]  
**Version**: 1.0
