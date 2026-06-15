# FAQ 

## Getting started (outcomes, not jargon)

### What does "unlock private persistent chat" mean?

It is a **one-time setup** after you connect your wallet. You do not need to understand blockchain terminology to use SafePsy.

**What you unlock:**

- Encrypted chat history that comes back when you return  
- Conversations tied to your wallet, not a platform account  
- Keys derived from your wallet (not stored on SafePsy servers)

**What happens behind the scenes:** SafePsy mints a soulbound on-chain identity record (a **DID**, also called a **Safe ID Token**) linked to your wallet. That record anchors your encrypted data. The product surfaces the **outcome** ("unlock private persistent chat") because that is what matters; "create your DID" is the technical step underneath.

### What is a DID (Decentralized Identity)?

A **DID** is the technical name for that on-chain identity record. It proves your wallet owns your persistence anchor. You control it with your wallet keys. For wallet loss, on-chain visibility, and revocation, see the sections below.

---

## Encryption and privacy

> Full detail: [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md)

### 1. Is my chat really end-to-end encrypted?

**No, not in the strict sense.** We use **client-side encryption at rest**: your browser encrypts the conversation before it is saved, and we store only ciphertext in our database. When you chat with Dr. Safe, your **browser sends readable message text** to our API over HTTPS so the model can reply; we do **not** decrypt your saved database blob on the server for that step. After you get a reply, the client encrypts the updated thread again before saving. We do not use your chats to train models. See the encryption guide for guest mode, summaries, and caching.

### 2. Can SafePsy read my messages?

**During each AI request, yes in principle:** your device sends plaintext in the completions request, and our API processes it in memory to forward to the LLM. We do **not** persist plaintext chat in the database, and we redact message bodies in application logs where the redaction middleware applies. We do not use your chats to train models. Optional deployments may cache AI **replies** in Redis for performance (`AI_RESPONSE_CACHE`); that is separate from your encrypted chat blob.

### 3. Who else can see my chat content?

Your messages are sent to the **LLM provider** (e.g. Scaleway Generative API or a self-hosted GPU service, depending on configuration) in plaintext so they can generate responses. We do not attach your wallet address or DID to the message payload sent to the model. You should review that provider’s privacy policy. Network-level metadata may still apply.

### 3a. What about guest mode?

Without a verified wallet session, chat stays **in your browser only** (limited prompts). It is **not** saved to encrypted storage. Refreshing the page clears that session.

### 4. If you don’t store my keys, what happens if I lose my wallet?

If you lose access to your wallet or seed phrase, we **cannot** recover your DID or decrypt your stored chat data. There is no backdoor or recovery mechanism. We recommend backing up your seed phrase securely and, if appropriate, using a hardware wallet.

---

## Compliance and certifications

### 5. Are you HIPAA compliant?

We implement technical and organizational measures that support **HIPAA-style** safeguards (access control, audit controls, transmission security, integrity). We are **not** a HIPAA-covered entity and we do **not** hold HIPAA certification. If you are a covered entity or business associate, you should consult legal counsel about your obligations and whether our measures are sufficient for your use case.

### 6. Are you GDPR compliant?

We implement measures aimed at **GDPR compliance**, including data subject rights (access, rectification, erasure, portability, restriction, objection), lawful bases, minimization, and transparency. Whether we meet all requirements in your jurisdiction depends on your role and the specific processing. We do not offer a formal “GDPR certification”; for legal certainty, consult your legal advisor.

### 7. Are you ISO 27001 certified?

Our security controls and documentation are **aligned with** ISO/IEC 27001:2022. We are **not certified** to ISO 27001. Certification would require an accredited certification body and a formal audit.

### 8. You mention APA and HIPAA on the site—what does that mean?

We aim to operate in line with **APA guidelines** and professional ethics for psychological services. When we refer to HIPAA, we mean we implement **safeguards that support HIPAA-style** security and privacy; we do not claim to be a HIPAA-covered entity or certified. For any “compliant with APA and HIPAA” phrasing, use the approved wording in our Claims and Trust Language doc (e.g. “aligned with” / “measures supporting”) and avoid implying certification.

---

## Blockchain and on-chain

### 9. Which blockchain do you use?

Today our app uses **Sepolia Testnet** (Chain ID 11155111) for DID operations. We may support Ethereum Mainnet in the future after a professional audit and readiness review. Always check the app or latest docs for the current network.

### 10. Is my therapy content stored on the blockchain?

**No.** Chat messages and summaries are **not** stored on the blockchain. They are encrypted and stored off-chain. On-chain we store DID identifiers, document metadata, service endpoints, and authorization events—so some **metadata** is public and persistent, but not the content of your conversations.

### 11. Can my identity or activity be traced on-chain?

DID-related events (e.g. creation, updates, authorization) are recorded on-chain and are publicly visible. So someone who knows your wallet address could see that you have a DID and some metadata. They could **not** see your chat content, which stays off-chain and encrypted.

---

## Security and audits

### 12. Have your smart contracts been audited?

Our DID smart contracts on **Sepolia** have undergone an **internal** audit (documented in our repo). We run invariant tests and on-chain verification scripts. A **professional external audit** is required before we use these contracts on mainnet. We do not claim they are “fully audited” in the sense of an independent third-party mainnet audit.

### 13. What if there’s a bug or breach?

We have incident response and security practices in place. In the event of a security incident that affects your data, we would follow our procedures and applicable law (including breach notification where required). We do not guarantee that our systems are immune to bugs or attacks.

---

## AI and therapy

### 14. Is the AI a replacement for a therapist?

**No.** The AI assistant is **not** a substitute for professional mental health care. It does not provide medical advice, diagnosis, or treatment. It is designed to complement human support (e.g. preparation, reflection, general guidance). Always consult licensed mental health professionals for clinical decisions.

### 15. Do you use my chats to train your AI?

We do **not** use your chat content to train our models. Your messages are sent to the AI provider only to generate responses for your session. Please also review the AI provider’s policy (e.g. Scaleway or our GPU service) regarding their use of data.

---

## Governance and control

### 16. Who controls the smart contracts?

Sensitive operations and upgrades are governed by a **Timelock** and **multisig Safe(s)**. So control is with the signers of that Safe, not with a single key. This is documented in our governance and deployment docs.

### 17. Can you revoke or delete my DID?

You can initiate **on-chain revocation** of your DID (permanent for that identity record). Revocation does **not** erase ciphertext already stored off-chain or bytes already on-chain; use **export/delete chat** if you want off-chain chat removed. Today, encrypted chat save/load uses **wallet session auth** and may not block revoked DIDs automatically; treat revocation as identity lifecycle, not a cryptographic wipe of all stored chats. Governance may revoke in abuse cases per contract rules.

---

## Data and deletion

### 18. If I delete my data, is it really gone?

We support deletion of your **off-chain** data (e.g. chat history, encrypted blobs). Once deleted according to our process, we do not retain it in our active systems. **On-chain** DID and lifecycle events are permanent on the blockchain and cannot be erased; we can mark a DID as revoked so it is no longer used.

### 19. How long do you keep my data?

Retention is described in our Privacy Policy and related docs. We do not retain chat content in plaintext; encrypted data may be kept for the periods stated there. Audit and security logs (with redacted identifiers) may be kept longer for security and compliance.

### 20. Can I export or delete my chat history?

Yes. You can **export** your encrypted chat history at any time from your DID Profile page. The export is a JSON file containing your encrypted chat blob, metadata, and decryption instructions. You will need your wallet to decrypt it later.

You can also **delete** your chat history permanently. This removes the encrypted data from our servers. Note: on-chain DID metadata (hashes pointing to your chat) remains on the blockchain but will point to deleted data. This is a trade-off of our hybrid architecture: off-chain storage with on-chain verification.

### 21. How do I export my chat history?

1. Go to your **DID Profile** page (requires wallet verification)
2. Scroll to the **Chat Data Management** section
3. Click **Export Chat**
4. A JSON file will download: `safepsy-chat-0x....json`
5. Store this file securely—you will need your wallet and the `decryptChat()` function to read it

We recommend exporting before deleting, or periodically backing up if you use SafePsy long-term.

### 22. What happens when I delete my chat?

When you confirm deletion:
1. Your encrypted chat blob is permanently deleted from our database
2. We log the deletion event (with redacted identifier) for security auditing
3. On-chain DID metadata (hash) remains but points to deleted data
4. You cannot recover the deleted chat—export first if you want a backup

Deletion is immediate and irreversible. Rate limits apply (5 export/delete requests per hour) to prevent accidental or malicious data loss.

### 23. Can I rotate my encryption key?

Yes. You can rotate your encryption key at any time from your **DID Profile** page. Key rotation generates a new random encryption key, re-encrypts your chat history with the new key, and updates your DID contract with the new wrapped key.

**Why rotate?** You might rotate your key if you suspect it was compromised, after switching wallets, or as part of regular security hygiene.

**What happens:** Your chat remains intact but is re-encrypted with the new key. The old key can no longer decrypt your data. The rotation event is logged in our security audit log.

**Rate limits:** Key rotation is limited to 5 times per hour to prevent abuse.

For full details, see [KEY_ROTATION_GUIDE.md](./KEY_ROTATION_GUIDE.md).

---

## Liability and guarantees

### 20. Do you guarantee my data is secure?

We implement strong technical and organizational measures (encryption, access control, logging, etc.) but we **do not guarantee** that our systems are invulnerable. No online service can guarantee absolute security. We recommend reading our Terms of Service and Security & Privacy Policy for the full picture.

---

## Using this FAQ

- **Internal use**: Train support and leadership on these answers.
- **Public use**: Copy answers into your help center or FAQ; keep wording consistent with `CLAIMS_AND_TRUST_LANGUAGE.md`.
- **Updates**: When product or policy changes (e.g. mainnet, new AI provider, certification), update both this FAQ and the Claims doc.
