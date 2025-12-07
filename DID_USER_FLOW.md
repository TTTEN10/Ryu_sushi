# DID User Flow: First-Time vs Returning Users

## Overview

This document explains how the system handles first-time users (no DID) vs returning users (existing DID).

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Connects Wallet                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Wallet Verification (Sign Message)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Auto-Check DID Status (POST /api/did/check)          │
└────────────┬───────────────────────────────┬────────────────┘
             │                               │
             ▼                               ▼
    ┌─────────────────┐           ┌─────────────────┐
    │  No DID Found   │           │   DID Found     │
    │  (First-Time)   │           │  (Returning)    │
    └────────┬────────┘           └────────┬────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  Show "Create Identity"  │   │  Show "Identity Active" │
│         Button           │   │    with Token ID        │
└────────────┬─────────────┘   └────────────┬────────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  User Clicks "Create"    │   │   Load DID Information    │
│  POST /api/did/create    │   │   GET /api/did/info       │
└────────────┬─────────────┘   └────────────┬────────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  Backend Mints Token     │   │   Display Token ID       │
│  Returns Token ID        │   │   Show Data Status        │
└────────────┬─────────────┘   └────────────┬────────────┘
             │                             │
             └─────────────┬───────────────┘
                           ▼
              ┌────────────────────────┐
              │   Ready to Use App     │
              └────────────────────────┘
```

## First-Time User Flow

### Step 1: Connect & Verify Wallet
```typescript
// User connects wallet via MetaMask/WalletConnect
await connectWallet();

// User signs verification message
await verifyWallet();
// → Creates JWT session
// → Sets isVerified = true
```

### Step 2: Auto-Check DID
```typescript
// Automatically triggered after verification
useEffect(() => {
  if (authState.isVerified) {
    checkDID(); // POST /api/did/check
  }
}, [authState.isVerified]);
```

**Backend Response**:
```json
{
  "success": true,
  "data": {
    "hasDid": false,  // ← No DID found
    "tokenId": null,
    "encryptedDataExists": false,
    "walletAddress": "0x..."
  }
}
```

**Frontend State**:
```typescript
authState.didStatus = 'none';
authState.didInfo = { hasDid: false, ... };
```

### Step 3: Show Create Button
```tsx
// DIDManager component shows:
<div>
  <AlertCircle /> No identity yet
  <button onClick={handleCreateDID}>
    Create my SafePsy Identity
  </button>
</div>
```

### Step 4: User Creates DID
```typescript
// User clicks "Create my SafePsy Identity"
await fetch('/api/did/create', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Backend Process**:
1. Validates authentication
2. Validates network (Ethereum Mainnet)
3. Checks if DID already exists (should be false)
4. Calls `didService.createDID(walletAddress)`
5. Backend signer mints token via `contract.createDid(walletAddress)`
6. Returns token ID and transaction hash

**Backend Response**:
```json
{
  "success": true,
  "message": "DID created successfully",
  "data": {
    "hasDid": true,
    "tokenId": "123",  // ← New token ID
    "encryptedDataExists": false,
    "walletAddress": "0x...",
    "txHash": "0x..."
  }
}
```

**Frontend State Update**:
```typescript
authState.didStatus = 'exists';
authState.didInfo = {
  hasDid: true,
  tokenId: "123",
  ...
};
```

### Step 5: Display Active Identity
```tsx
// DIDManager component updates to show:
<div>
  <CheckCircle /> Identity Active
  <p>Token ID: 123</p>
  <p>Secure Data Storage: No data stored yet</p>
</div>
```

## Returning User Flow

### Step 1: Connect & Verify Wallet
```typescript
// Same as first-time user
await connectWallet();
await verifyWallet();
```

### Step 2: Auto-Check DID
```typescript
// Automatically triggered after verification
checkDID(); // POST /api/did/check
```

**Backend Response**:
```json
{
  "success": true,
  "data": {
    "hasDid": true,  // ← DID found!
    "tokenId": "123",  // ← Existing token ID
    "encryptedDataExists": true,
    "walletAddress": "0x..."
  }
}
```

**Frontend State**:
```typescript
authState.didStatus = 'exists';
authState.didInfo = {
  hasDid: true,
  tokenId: "123",
  encryptedDataExists: true,
  ...
};
```

### Step 3: Display Active Identity
```tsx
// DIDManager component shows:
<div>
  <CheckCircle /> Identity Active
  <p>Token ID: 123</p>
  <p>Secure Data Storage: Yes - 256 bytes stored</p>
</div>
```

**No create button shown** - user already has DID.

## Key Implementation Details

### Auto-Check on Verification

```typescript
// In AuthContext.tsx
useEffect(() => {
  if (authState.isVerified) {
    // Always check DID status after verification
    checkDID();
  }
}, [authState.isVerified]);
```

### Duplicate Prevention

**Backend Check**:
```typescript
// In did.service.ts
const has = await this.hasDid(walletAddress);
if (has) {
  const tokenId = await this.contract.getDidId(walletAddress);
  throw new Error(`DID already exists with token ID ${tokenId}`);
}
```

**Contract Enforcement**:
```solidity
// In DIDIdentityToken.sol
function createDid(address user) external returns (uint256) {
    require(!_hasDid[user], "DIDIdentityToken: user already has a DID");
    // ... create DID
}
```

### State Management

**AuthContext State**:
```typescript
interface AuthState {
  walletAddress: string | null;
  isVerified: boolean;
  didStatus: 'none' | 'exists' | 'error' | 'checking';
  didInfo: DIDInfo | null;
}
```

**DID Status Transitions**:
- `'none'` → No DID found, show create button
- `'checking'` → Loading DID status
- `'exists'` → DID found, show active status
- `'error'` → Error checking/creating DID

## Error Scenarios

### Network Mismatch
```typescript
// User on wrong network
if (req.wallet.chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
  return res.status(400).json({
    error: 'UNSUPPORTED_CHAIN',
    message: 'Only Ethereum Mainnet is supported'
  });
}
```

### DID Already Exists (on Create)
```typescript
// If somehow DID exists when creating
const hasDid = await didService.hasDid(walletAddress);
if (hasDid) {
  // Return existing DID instead of error
  const didInfo = await didService.getDIDInfo(walletAddress);
  return res.json({
    success: true,
    message: 'DID already exists',
    data: didInfo
  });
}
```

### Backend Signer Not Configured
```typescript
// If backend signer missing and public minting disabled
if (!this.signer && !allowPublicMinting) {
  throw new Error('Backend signer not configured. User must create DID via wallet.');
}
```

## Testing Scenarios

### Test First-Time User
1. Use new wallet address (never connected)
2. Connect wallet
3. Verify wallet
4. Should see "No identity yet"
5. Click "Create my SafePsy Identity"
6. Should see "Identity Active" with token ID

### Test Returning User
1. Use wallet that already has DID
2. Connect wallet
3. Verify wallet
4. Should immediately see "Identity Active"
5. No create button shown

### Test Duplicate Prevention
1. Try to create DID twice
2. First attempt succeeds
3. Second attempt returns existing DID info (no error)

## Summary

- **First-Time Users**: Auto-check → No DID → Show create button → Create DID → Show active
- **Returning Users**: Auto-check → DID found → Show active immediately
- **No Duplicates**: Contract + backend enforce one DID per wallet
- **Auto-Integration**: DID check happens automatically after wallet verification
- **Seamless UX**: Users don't need to manually check DID status

