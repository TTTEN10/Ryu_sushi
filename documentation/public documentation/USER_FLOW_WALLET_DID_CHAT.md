# Complete User Flow: Wallet → DID → Encrypted Chat

## Overview

This document describes the complete user journey for using SafePsy's encrypted chat system with wallet authentication and DID-based key storage.

## Prerequisites

- MetaMask or compatible Web3 wallet browser extension
- Sepolia Testnet ETH (for gas fees when creating DID)
- Modern browser with localStorage support

## Complete User Flow

### Phase 1: Initial Connection

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User visits /beta/chat                                   │
│ 2. Sees ChatWidget with Dr. Safe                            │
│ 3. Can chat in guest mode (limited, no persistence)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. User clicks "Connect Wallet"                             │
│ 5. Wallet extension prompts for connection                  │
│ 6. User approves connection                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Wallet connected (address shown)                         │
│ 8. "Verify" button appears                                  │
│ 9. User clicks "Verify"                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. SIWE message presented in wallet                        │
│ 11. User signs the message                                  │
│ 12. Backend verifies signature                              │
│ 13. JWT session created                                     │
│ 14. authState.isVerified = true                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: DID Creation Prompt

```
┌─────────────────────────────────────────────────────────────┐
│ 15. System checks DID status via /api/did/check             │
│ 16. No DID found (didStatus: 'none')                        │
│ 17. DID creation prompt modal appears                       │
│                                                             │
│     "Create Your Safe ID Token"                             │
│     ✓ Save chat history permanently                         │
│     ✓ Access chats from any device                          │
│     ✓ Keep data secure and private                          │
│                                                             │
│     [Later] [Create Safe ID Token]                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    User clicks "Create Safe ID Token"
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 18. POST /api/did/create called                             │
│ 19. Backend mints soulbound DID token                       │
│ 20. Transaction submitted to Sepolia                        │
│ 21. User approves transaction in wallet                     │
│ 22. DID created with unique tokenId                         │
│ 23. Page reloads to refresh state                           │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Encryption Key Generation

```
┌─────────────────────────────────────────────────────────────┐
│ 24. useChatEncryption hook initializes                      │
│ 25. Checks DID contract for existing encryptedKeyMetadata   │
│ 26. No key found (new DID)                                  │
│ 27. Generates new AES-256-GCM symmetric key (DEK)           │
│ 28. Derives KEK from wallet signature                       │
│ 29. Encrypts DEK with KEK                                   │
│ 30. Stores encrypted DEK in:                                │
│     - localStorage (fallback)                               │
│     - DID contract (encryptedKeyMetadata)                   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4: Chat with Encrypted Persistence

```
┌─────────────────────────────────────────────────────────────┐
│ 31. User sends message to Dr. Safe                          │
│ 32. Message encrypted with AES-256-GCM + symmetric key      │
│ 33. POST /api/chat/save with encrypted blob                 │
│ 34. Backend stores in database:                             │
│     - walletAddress (unique key)                            │
│     - encryptedBlob                                         │
│     - encryptedBlobHash                                     │
│ 35. Response includes blobHash                              │
│ 36. Frontend updates DID contract with:                     │
│     - chatDataReference (hash)                              │
│     - encryptedKeyMetadata (if not already set)             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 5: Session Persistence & Recovery

```
┌─────────────────────────────────────────────────────────────┐
│ ON PAGE REFRESH / RETURN VISIT:                             │
│                                                             │
│ 37. Wallet reconnects (same address)                        │
│ 38. User verifies (signs SIWE)                              │
│ 39. useChatEncryption initializes                           │
│ 40. Checks localStorage for encryptedKey_0x...              │
│ 41. Found! Decrypts with wallet signature                   │
│ 42. Symmetric key restored                                  │
│ 43. GET /api/chat/load returns encrypted blob               │
│ 44. Decrypts with symmetric key                             │
│ 45. Chat history restored ✓                                 │
└─────────────────────────────────────────────────────────────┘
```

### Phase 6: Logout

```
┌─────────────────────────────────────────────────────────────┐
│ USER MANUAL LOGOUT:                                         │
│ 46. User clicks disconnect button                           │
│ 47. Session cleared                                         │
│ 48. Wallet disconnected                                     │
│ 49. NO idle timeout flag set                                │
│ 50. Next login: Normal flow (no "inactive" message)         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ IDLE TIMEOUT LOGOUT (1 hour):                               │
│ 46. User inactive for 60 minutes                            │
│ 47. Idle timeout triggers                                   │
│ 48. WALLET_IDLE_LOGOUT_FLAG set in sessionStorage           │
│ 49. Session cleared                                         │
│ 50. Next login: Shows "1 hour inactivity" message           │
└─────────────────────────────────────────────────────────────┘
```

## Key Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KEY HIERARCHY                            │
│                                                             │
│  Wallet Private Key (user controls)                         │
│         ↓ signs                                             │
│  Signature → SHA-256 → KEK (Key Encryption Key)             │
│         ↓ encrypts                                          │
│  DEK (Data Encryption Key - AES-256-GCM)                    │
│         ↓ encrypts                                          │
│  Chat Messages (AES-256-GCM ciphertext)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LOCATIONS                        │
│                                                             │
│  On-Chain (DID Contract):                                   │
│  - encryptedKeyMetadata: wallet-wrapped DEK                 │
│  - chatDataReference: hash of encrypted chat blob           │
│                                                             │
│  localStorage (Browser):                                    │
│  - encryptedKey_0x...: fallback for key recovery            │
│                                                             │
│  Database (PostgreSQL):                                     │
│  - encryptedBlob: ciphertext of chat history                │
│  - encryptedBlobHash: integrity check                       │
└─────────────────────────────────────────────────────────────┘
```

## Console Logs Reference

### Successful First-Time Flow

```
Initializing encryption key... {walletAddress: '0x...', hasDid: false}
Generating new encryption key (no existing key found)
New key generated and encrypted
Encrypted key stored in localStorage: {localStorageKey: 'encryptedKey_0x...'}
Chat saved successfully: {blobHash: '0x...', requiresDidUpdate: true}
```

### Successful Return Visit (Key Recovered)

```
Initializing encryption key... {walletAddress: '0x...', hasDid: true}
Checking localStorage for encrypted key: {hasStoredKey: true}
Found encrypted key in localStorage, attempting to decrypt...
Successfully loaded key from localStorage
Chat load response: {hasChat: true, hasBlob: true, blobLength: 521}
```

### DID Creation

```
POST /api/did/create
Response: {success: true, data: {hasDid: true, tokenId: '123'}}
Safe ID Token created! Your chats are now secured on-chain.
```

### Error Scenarios

**Wrong Wallet:**
```
Found encrypted key in localStorage, attempting to decrypt...
Failed to decrypt localStorage key (wrong wallet?): Signature verification failed
Generating new encryption key (no existing key found)
```

**Corrupted Chat:**
```
Chat load response: {hasChat: true, hasBlob: true}
Failed to decrypt chat history: OperationError
Chat decryption failed - clearing corrupted chat from backend
```

## Troubleshooting

### Issue: Key not found after refresh

**Symptoms:**
- "Generating new encryption key" on every refresh
- Previous chats don't load

**Causes:**
1. Browser localStorage cleared
2. Different wallet address
3. Private/incognito mode

**Solution:**
- Use same wallet address
- Avoid clearing browser data
- Create DID for on-chain key storage

### Issue: DID creation fails

**Symptoms:**
- "Transaction failed" error
- No DID created

**Causes:**
1. No Sepolia ETH for gas
2. Wrong network
3. RPC endpoint issues

**Solution:**
- Get Sepolia ETH from faucet
- Switch to Sepolia network in wallet
- Check RPC_URL in backend

### Issue: "1 hour inactivity" on manual logout

**Symptoms:**
- Manual logout shows inactivity message on next login

**Cause:**
- WALLET_IDLE_LOGOUT_FLAG incorrectly set

**Solution:**
- Fixed: Manual logout now uses `skipIdleFlag: true`

## Security Properties

1. **Zero-Knowledge**: Server never sees plaintext messages or keys
2. **Wallet-Gated**: Only wallet owner can decrypt
3. **Deterministic**: Same wallet + signature = same KEK
4. **Forward Secrecy**: Each chat session uses unique DEK
5. **On-Chain Verification**: Key authenticity verifiable on-chain

## Environment Variables

### Frontend (apps/web/.env)
```
VITE_DID_IDENTITY_TOKEN_ADDRESS=0x...  # DID contract address
VITE_RPC_URL=https://...               # Sepolia RPC
VITE_WALLETCONNECT_PROJECT_ID=...      # WalletConnect (optional)
```

### Backend (apps/api/.env)
```
DATABASE_URL=postgresql://...          # PostgreSQL connection
JWT_SECRET=...                         # Session JWT secret
DID_IDENTITY_TOKEN_ADDRESS=0x...       # DID contract address
RPC_URL=https://...                    # Sepolia RPC
```

## Related Documentation

- [DID_COMPLETE_GUIDE.md](./DID_COMPLETE_GUIDE.md) - Technical DID implementation
- [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md) - Encryption architecture
- [CHAT_COMPLETE_GUIDE.md](./CHAT_COMPLETE_GUIDE.md) - Chat system details
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - API reference
