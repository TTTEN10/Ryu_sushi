# SafePsy Beta Welcome Packet

**Version 1.0**
**Date:** August 2026
**Status:** Beta Access

---

## Welcome to SafePsy Beta

Thank you for joining the SafePsy beta program. You are among the first users to experience a mental health platform built from the ground up on a single principle: **you own your data — we do not store it, sell it, or train AI on it.**

This packet contains everything you need to know to get started, understand your rights, and make the most of the beta experience.

---

## What is SafePsy?

SafePsy is a **decentralized AI-powered mental health companion**. Think of it as a private space between therapy sessions where you can reflect, organize your thoughts, and get AI-assisted support — **without giving up control of your personal data.**

### How it works

1. **Your wallet is your identity.** Connect MetaMask or WalletConnect to log in. No email, no password, no personal data collected.
2. **Your data stays encrypted.** Conversations with Dr. Safe (our AI) are encrypted client-side using keys derived from your wallet. The server stores only ciphertext.
3. **You control your identity.** We mint you a Soulbound Identity Token (DID) on the Ethereum Sepolia testnet — a non-transferable digital identity you own.
4. **AI that listens without remembering.** Our AI assistant uses industry-standard models to provide conversational support. Your chats are **never used to train models.**

### What beta gives you

- **Full AI chat access** with Dr. Safe (streaming responses)
- **Encrypted, persistent chat history** (tied to your DID)
- **Wallet-based login and DID creation**
- **Cookie and data consent management**
- **Data export and account deletion features**
- **Direct access to the team** for feedback and support

### What to expect (limitations)

- **Testnet only.** Currently runs on Ethereum Sepolia (test network). No mainnet deployment yet.
- **No therapist marketplace.** SafePsy is a between-sessions tool, not a replacement for professional therapy.
- **Single device.** Encryption keys are stored locally. Losing your device means losing access to encrypted chat history (unless you back up your wallet).
- **Beta stability.** You may encounter bugs, performance issues, or service interruptions. We appreciate your patience and feedback.

---

## Getting Started (5 minutes)

### Step 1 — Connect your wallet

1. Visit the SafePsy app.
2. Click **Connect wallet** and choose your wallet provider (MetaMask recommended).
3. Switch to **Ethereum Sepolia Testnet** if prompted.
4. Approve the connection request.

### Step 2 — Sign in

1. A signature request will appear in your wallet.
2. **Sign the message** (this is free — no gas required).
3. This proves you own the wallet address and creates your session.

### Step 3 — Create your Safe ID Token

1. On first login, you will see **"Create my Safe ID Token."**
2. Click it and confirm the transaction in your wallet.
3. You may need a small amount of **test ETH** (Sepolia) for gas.
   - Get free test ETH from the [Sepolia Faucet](https://sepoliafaucet.com/).
4. When you see **"Identity active"** with a token ID, you're done.

### Step 4 — Have your first chat

1. Navigate to the chat section.
2. Send a message to **Dr. Safe.**
3. The AI will respond in real-time with streaming text.
4. Your encrypted conversation is saved automatically.

### Step 5 — Explore

- Review your chat history
- Update your profile and DID metadata
- Read our [Security and Privacy Policy](/sap-policy) to understand your data rights
- Use **Cookie Preferences** (in the footer) to manage tracking consent

---

## Your Data Rights

SafePsy is built around GDPR and your rights as a user. Here is what applies to you during the beta:

### Right to Access
Request a copy of all personal data we hold. Submit a request via the [Contact page](/contact-us).

### Right to Rectification
Correct inaccurate personal data we hold. Contact us through the app.

### Right to Erasure ("Right to be Forgotten")
- **Off-chain data** (chat history, account data, contact messages) can be **fully deleted** upon request via `POST /api/account`.
- **On-chain data** (DID token, blockchain events) **cannot be erased** — they are permanent. However, we can **revoke** your DID so it no longer grants access to our services.
- When you request deletion, we also sever the linkage between your wallet and your consent records.

### Right to Data Portability
Request your data in a structured, machine-readable format (JSON). Submit via [Contact page](/contact-us).

### Right to Withdraw Consent
- Withdraw cookie or analytics consent at any time via the **Cookie Preferences** button (footer) or the cookie banner.
- Withdraw health data processing consent — this will block AI chat access but will not affect previously created off-chain data.

### Right to Object
Object to processing of your personal data. Contact us via the app.

---

## Privacy by Design

### What is stored on-chain?

| Data | Personal? | Retained? |
|------|-----------|-----------|
| Wallet address (plaintext) | Yes | Yes |
| DID token ID (ERC-721) | Indirect | Yes |
| Encrypted key metadata | Yes (encrypted) | Yes |
| Revocation status | No | Yes |
| Timestamps | Indirect | Yes |
| **Chat content** | — | **No** |
| **Email / name** | — | **No** |
| **Health data** | — | **No** |

**Bottom line:** Raw health data, chat messages, emails, and names are **never** stored on the blockchain.

### What is stored off-chain?

| Data | Encrypted? | Retention |
|------|-----------|-----------|
| Chat history | Yes (AES-256-GCM, client-side) | Until deleted |
| Encrypted key blobs | Yes (wallet-wrapped) | Until deleted |
| Account profile | No | Until deleted |
| Audit logs (redacted) | No | Defined period |
| Analytics cookies (opt-in) | No | Until consent withdrawn |

---

## Security Best Practices

1. **Back up your wallet seed phrase.** SafePsy cannot recover lost keys. If you lose your wallet, you lose access to your encrypted chat history permanently.
2. **Use a hardware wallet** for additional security (Ledger, Trezor).
3. **Never share your seed phrase** with anyone — not even SafePsy support.
4. **Use Sepolia Testnet.** Mainnet deployment is not yet available. Using mainnet may result in real gas costs for actions that are intended to be testnet-only.
5. **Log out securely.** Disconnect your wallet in the app's wallet settings when done.

---

## Crisis Safety Notice

**SafePsy is not a crisis intervention tool.** The AI assistant is designed for between-sessions reflection and support, not for handling emergencies.

If you are in crisis or experiencing a mental health emergency:

- **Europe:** Call 112 (emergency) or find your country's crisis hotline at [befrienders.org](https://www.befrienders.org)
- **USA:** Call or text 988 (Suicide & Crisis Lifeline)
- **UK:** Call 111 (NHS) or 999 (emergency)
- **General:** Contact your local emergency services

The AI will provide crisis resources if detected in conversation, but it **will not replace professional emergency intervention.**

---

## Giving Feedback

Your feedback shapes SafePsy. We want to know:

- What worked well?
- What felt broken, confusing, or frustrating?
- What features would make this indispensable for your practice?

**Ways to share feedback:**

1. **In-app contact form** — [Contact Us](/contact-us)
2. **Email** — beta@safepsy.com
3. **Direct message** — through your wallet connection (DMs are encrypted)

We read every piece of feedback and respond within 5 business days.

---

## FAQ

### Is SafePsy free during beta?
Yes. Full access is provided at no cost during the beta period.

### Can I use SafePsy without a wallet?
Guest mode is available: you can send up to 5 messages per session without connecting a wallet. Messages are not saved. Connect a wallet for persistent, encrypted history.

### What happens to my data after the beta?
If SafePsy launches as a paid service, your existing data will be retained unless you request deletion. You will be notified of any policy changes before they take effect.

### Is SafePsy HIPAA compliant?
SafePsy is built with security and privacy practices aligned with healthcare data standards (ISO 27001 framework). However, we are **not currently HIPAA certified**. For healthcare professionals, we recommend reviewing our [Security and Privacy Policy](/sap-policy) and consulting your legal counsel before using SafePsy for professional purposes.

### Can I transfer my DID to another wallet?
No. SafePsy DIDs are **Soulbound** (non-transferable). They are permanently bound to the wallet address that created them.

### What happens if SafePsy shuts down?
You retain your DID on-chain. All off-chain data (chat history, account info) can be exported before shutdown. We commit to providing an advance notice period and export tools.

---

## Support

For questions about SafePsy, your data, or the beta program:

- **Contact page:** [https://safepsy.com/contact-us](https://safepsy.com/contact-us)
- **Email:** beta@safepsy.com
- **Security & Privacy Policy:** [https://safepsy.com/sap-policy](https://safepsy.com/sap-policy)
- **Terms of Service:** [https://safepsy.com/tos](https://safepsy.com/tos)
- **Cookie Policy:** [https://safepsy.com/cookies](https://safepsy.com/cookies)

SafePsy OÜ · Registered in Estonia

---

*Welcome aboard. Thank you for helping us build something that puts privacy first.*