# Key Rotation Guide

**Last updated:** 2026-06-12

This guide explains how and why to rotate your encryption key in SafePsy, including technical implementation details for developers.

---

## Overview

**Key rotation** is the process of generating a new encryption key for your chat data and re-encrypting all existing chat history with the new key. This is a security best practice that limits the exposure window if a key is ever compromised.

### Why rotate your key?

You might want to rotate your encryption key in these situations:

1. **Suspected compromise** — You believe your wallet or key may have been exposed
2. **Wallet change** — You've switched to a new wallet and want to re-key your data
3. **Security hygiene** — Regular rotation as part of your security practices
4. **After sharing access** — If you previously granted someone access to decrypt your data

### What happens during key rotation?

1. A new random 256-bit AES encryption key is generated
2. Your existing chat history is decrypted with the old key
3. All chat data is re-encrypted with the new key
4. The new key is wrapped (encrypted) with your wallet signature
5. The wrapped key is stored in your ID token on-chain
6. The re-encrypted chat blob is saved to the database

**Important:** After rotation, the old key can no longer decrypt your chat data. Only the new key works.

---

## User Guide

### How to rotate your key

1. **Open SafePsy** and connect your wallet
2. **Navigate to My ID token** (`/profile`)
3. **Scroll to "Chat Data Management"** section
4. **Click "Rotate Key"**
5. **Review the confirmation dialog** — understand what will happen
6. **Click "Confirm Key Rotation"**
7. **Wait for completion** — your wallet may ask you to sign a transaction to update your ID token on-chain

### What you need

- **Your wallet** — You must have access to the same wallet that owns your ID token
- **Existing chat data** — Key rotation requires chat history to re-encrypt
- **Network connection** — Both the API and blockchain (for ID token update) must be accessible

### After rotation

- Your chat history remains intact — just re-encrypted with the new key
- The on-chain ID token metadata is updated with the new wrapped key
- Your local session immediately uses the new key for future messages
- The rotation event is logged in the security audit log

### Important notes

- **Rotation is irreversible** — You cannot "go back" to the old key
- **On-chain metadata is permanent** — The old wrapped key remains on-chain (as part of ID token history), but the active key is updated
- **No downtime** — You can continue chatting immediately after rotation
- **Rate limited** — Key rotation is limited to 5 times per hour to prevent abuse

---

## Developer Guide

### Architecture

The key rotation feature consists of three components:

#### 1. Backend API (`apps/api/src/routes/chat.ts`)

**Endpoint:** `POST /api/chat/rotate-key`

**Request:**
```json
{
  "newEncryptedBlob": "<AES-256-GCM encrypted chat>",
  "newBlobHash": "<SHA-256 hash of encrypted blob>",
  "newEncryptedKeyMetadata": "<wallet-wrapped key in format signature:iv:encrypted>"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Key rotation successful...",
  "data": {
    "rotatedAt": "2026-06-12T10:30:00.000Z",
    "blobHash": "0x..."
  }
}
```

**Security:**
- Requires authenticated wallet session
- Rate limited (5/hour via `exportDeleteRateLimit`)
- Audit logged with event type `KEY_ROTATION_INITIATED`
- Validates encrypted key metadata format

#### 2. Frontend Utilities (`apps/web/src/utils/did-encryption.ts`)

**Function:** `rotateEncryptionKey()`

```typescript
export async function rotateEncryptionKey(
  currentSymmetricKey: Uint8Array,
  encryptedChatHistory: string,
  walletAddress: string,
  signer: ethers.JsonRpcSigner,
  messages?: any[]
): Promise<{
  newSymmetricKey: Uint8Array;
  newEncryptedKey: string;
  newEncryptedChat: string;
  newBlobHash: string;
}>
```

**Flow:**
1. Generate new random 32-byte symmetric key
2. Encrypt new key with wallet signature (wrap it)
3. Decrypt chat history with old key
4. Re-encrypt chat history with new key
5. Generate hash of new encrypted chat
6. Return all new key material

#### 3. Frontend Hook (`apps/web/src/hooks/useChatEncryption.ts`)

**Function:** `rotateKey()`

Orchestrates the full rotation flow:
1. Loads current encrypted chat from API
2. Calls `rotateEncryptionKey()` utility
3. Saves new encrypted chat via `/api/chat/rotate-key`
4. Updates DID contract with new wrapped key
5. Updates local state with new key
6. Persists to localStorage (for users without DID)

### Key Format

The encrypted key metadata uses this format:
```
signature:ivHex:ciphertextHex
```

Where:
- `signature` — Ethereum signature proving wallet ownership
- `ivHex` — Initialization vector (hex-encoded)
- `ciphertextHex` — Encrypted symmetric key (hex-encoded)

This format is parsed by `decryptSymmetricKey()` in `did-encryption.ts`.

### On-Chain Storage

The wrapped key is stored in the DID contract's `encryptedKeyMetadata` field as UTF-8 bytes:

```typescript
// Encoding (frontend)
const bytes = new TextEncoder().encode(encryptedKeyString);
await updateEncryptedKeyMetadata(signer, bytes);

// Decoding (frontend)
const decoded = new TextDecoder().decode(bytes).replace(/\0/g, '').trim();
```

### Security Considerations

1. **Atomic operation** — The rotation should succeed or fail atomically. If the API save succeeds but the ID token update fails, the user still has a valid rotation (just needs to retry the ID token update).

2. **Verification** — After rotation, the frontend should verify that decryption works with the new key before clearing the old key from memory.

3. **Audit logging** — All rotation events are logged with:
   - Event type: `KEY_ROTATION_INITIATED`
   - Redacted wallet address (first 10 chars)
   - New blob hash (first 16 chars)
   - IP address and user agent

4. **Rate limiting** — Prevents abuse: 5 requests per hour per wallet

5. **No key escrow** — SafePsy never stores the plaintext key. Only the wallet-wrapped version exists on-chain.

---

## Troubleshooting

### "No chat history found to rotate"

This error occurs if you don't have any saved chat history. Key rotation requires existing chat data to re-encrypt.

**Solution:** Send some messages in your chat first, then try rotation again.

### "Failed to update ID token on-chain"

The API rotation succeeded, but the on-chain ID token update failed (e.g., network congestion, gas issues).

**Solution:** Your chat is still protected with the new key. You can manually update your ID token by:
1. Going to **My ID token** (`/profile`)
2. Clicking "Refresh" to reload your profile
3. The app should detect the mismatch and offer to update

### "Invalid encrypted key metadata format"

The wrapped key format is invalid (missing colons, corrupted data).

**Solution:** This is a developer error — the key wrapping logic produced malformed output. Check the `encryptSymmetricKey()` function.

---

## Security Checklist

After implementing or auditing key rotation, verify:

- [ ] New key is cryptographically random (32 bytes from CSPRNG)
- [ ] Old key is securely cleared from memory after rotation
- [ ] Chat is decrypted and re-encrypted client-side (never plaintext on server)
- [ ] DID contract update is attempted after API save
- [ ] Audit log entry is created for every rotation
- [ ] Rate limiting is enforced (5/hour)
- [ ] Error messages don't leak sensitive information
- [ ] localStorage is updated with new wrapped key (for users without DID)

---

## Related Documentation

- [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md) — Full encryption architecture
- [DID_COMPLETE_GUIDE.md](./DID_COMPLETE_GUIDE.md) — DID contract details
- [WALLET_COMPLETE_GUIDE.md](./WALLET_COMPLETE_GUIDE.md) — Wallet authentication
- [CLAIMS_AND_TRUST_LANGUAGE.md](./CLAIMS_AND_TRUST_LANGUAGE.md) — Approved security claims

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-12 | Initial key rotation feature implemented |
