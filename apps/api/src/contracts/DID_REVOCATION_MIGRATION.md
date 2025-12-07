# DID Revocation and Migration Design

## Overview

This document describes the design and implementation of DID revocation and wallet migration features for SafePsy.

## Revocation

### Purpose

Allow users to reset their identity by revoking their DID token. This is useful for:
- Privacy concerns
- Security incidents (compromised wallet)
- Starting fresh with a new identity

### Implementation

#### Solidity Contract

**Storage Structure:**
- Separate mappings for revocation status (preserves storage layout):
  - `mapping(uint256 => bool) private _revokedTokens`
  - `mapping(address => bool) private _revokedAddresses`

**Functions:**
```solidity
// Check revocation status
function isRevoked(address user) external view returns (bool)
function isRevokedById(uint256 tokenId) external view returns (bool)

// Revoke DID
function revokeDid(bool clearChatReference) external
function revokeDid() external // Convenience: clears chat reference by default
```

**Behavior:**
- Only DID owner can revoke their DID
- Revoked DIDs cannot be updated (enforced by `notRevoked` modifier)
- Token remains in existence (soulbound, cannot be burned)
- Optionally clears chat data reference and encrypted key metadata
- Emits `DidRevoked` event

**Modifiers:**
- `notRevoked(address user)` - Prevents operations on revoked DIDs
- Applied to all update functions (`updateChatReference`, `updateEncryptedKeyMetadata`, etc.)

#### Backend API

**Endpoint:** `POST /api/did/revoke`

**Request:**
```json
{
  "clearChatReference": true  // Optional, defaults to true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Revocation must be performed by wallet owner",
  "data": {
    "walletAddress": "0x...",
    "clearChatReference": true,
    "requiresWalletSignature": true,
    "instructions": "Call revokeDid() on the DID contract with your wallet"
  }
}
```

**Note:** The backend endpoint validates the request but does not perform the revocation. The actual revocation must be done by the wallet owner calling the contract directly (for security).

#### Frontend Flow

1. User requests revocation via UI
2. Frontend calls `POST /api/did/revoke` to validate
3. Frontend calls `revokeDid()` on the contract with user's wallet
4. Contract emits `DidRevoked` event
5. Frontend updates UI to show revoked status

### UX Implications

**Before Revocation:**
- Show clear warning about consequences
- Explain that:
  - DID will be permanently revoked
  - Chat data reference will be cleared (if option selected)
  - Cannot be undone
  - User can create a new DID after revocation

**After Revocation:**
- Show revoked status in UI
- Disable all DID update operations
- Allow user to create a new DID
- Optionally show option to migrate to new wallet

## Migration

### Purpose

Allow users to migrate their DID and associated data from one wallet to another. This is useful for:
- Lost wallet recovery
- Hardware wallet upgrades
- Security improvements (moving to more secure wallet)

### Implementation

#### Solidity Contract

**Function:**
```solidity
function migrateDid(
    address oldWallet,
    address newWallet,
    bool clearChatReference
) external
```

**Access Control:**
- Only callable by contract owner or backend signer
- This ensures migration is a support-driven process with proper verification

**Behavior:**
1. Validates old wallet has a DID (not revoked)
2. Validates new wallet does not have a DID
3. Revokes old wallet's DID
4. Creates new DID for new wallet
5. Optionally copies chat data reference and encrypted key metadata
6. Emits events: `DidRevoked`, `DidCreated`, `DidMigrated`

**Security Considerations:**
- Old wallet's DID is revoked (cannot be used)
- New wallet gets a new token ID
- Profile data can be preserved or cleared
- Migration requires off-chain verification (see below)

#### Backend API

**Endpoint:** `POST /api/did/migrate` (Admin/Support only)

**Request:**
```json
{
  "oldWallet": "0x...",
  "newWallet": "0x...",
  "clearChatReference": false  // Optional, defaults to false
}
```

**Response:**
```json
{
  "success": true,
  "message": "DID migrated successfully",
  "data": {
    "oldTokenId": "1",
    "newTokenId": "2",
    "txHash": "0x...",
    "oldWallet": "0x...",
    "newWallet": "0x..."
  }
}
```

**Access Control:**
- Requires admin authentication
- Should be behind additional verification (see Migration Flow below)

#### Migration Flow (Support-Driven)

**Step 1: User Request**
- User contacts support requesting wallet migration
- Provides:
  - Old wallet address
  - New wallet address
  - Reason for migration

**Step 2: Verification**
- Support verifies user identity (off-chain):
  - Email verification
  - Phone verification
  - KYC if required
  - Proof of ownership of old wallet (signature challenge)

**Step 3: Off-Chain Verification**
- Support creates a signed message from old wallet:
  - Message: "I authorize migration of my SafePsy DID from {oldWallet} to {newWallet}"
  - Signature from old wallet proves ownership
- Support stores verification record in database

**Step 4: Migration Execution**
- Support calls `POST /api/did/migrate` with:
  - Old wallet address
  - New wallet address
  - Verification signature
  - Support admin credentials
- Backend verifies signature
- Backend calls `migrateDid()` on contract
- Backend updates off-chain data (chat storage, etc.)

**Step 5: Notification**
- User is notified of successful migration
- User can now use new wallet with migrated DID

### Future: Self-Service Migration

For future implementation, consider:

1. **Two-Wallet Signature:**
   - User signs with both old and new wallet
   - Backend verifies both signatures
   - Migration can proceed automatically

2. **Time-Locked Migration:**
   - User initiates migration
   - 7-day waiting period
   - User confirms with new wallet
   - Migration executes

3. **Recovery Phrase Verification:**
   - User provides recovery phrase (encrypted)
   - Backend verifies can derive old wallet
   - Migration proceeds

### UX Implications

**Migration Request:**
- Clear form explaining requirements
- List of information needed
- Estimated processing time
- Contact information for support

**During Migration:**
- Show pending status
- Provide tracking/reference number
- Set expectations for timeline

**After Migration:**
- Confirm successful migration
- Show new wallet address
- Remind user to update any saved addresses
- Option to clear old wallet's data

## Data Handling

### Chat Data

**On Revocation:**
- If `clearChatReference = true`:
  - Chat reference cleared on-chain
  - Off-chain chat data can be:
    - Deleted (privacy)
    - Archived (compliance)
    - Retained for recovery period

**On Migration:**
- If `clearChatReference = false`:
  - Chat reference copied to new DID
  - Off-chain chat data linked to new wallet address
  - Old wallet's chat data can be:
    - Transferred to new wallet
    - Archived
    - Deleted

### Encrypted Key Metadata

**On Revocation:**
- If `clearChatReference = true`:
  - Encrypted key metadata cleared
  - User cannot decrypt old chat data
  - New DID will have new encryption keys

**On Migration:**
- If `clearChatReference = false`:
  - Encrypted key metadata copied
  - User can decrypt migrated chat data
  - Same encryption keys used

## Security Considerations

### Revocation
- ✅ Only wallet owner can revoke
- ✅ Revoked DIDs cannot be updated
- ✅ Clear audit trail via events
- ⚠️ Cannot be undone (by design)

### Migration
- ✅ Requires admin/backend signer
- ✅ Off-chain verification required
- ✅ Old DID is revoked (prevents double-use)
- ✅ New wallet must not have existing DID
- ⚠️ Support-driven process (manual verification)

## Events

### DidRevoked
```solidity
event DidRevoked(
    address indexed user,
    uint256 indexed tokenId,
    uint64 timestamp
);
```

### DidMigrated
```solidity
event DidMigrated(
    address indexed oldWallet,
    address indexed newWallet,
    uint256 indexed tokenId,
    uint64 timestamp
);
```

## Testing

### Revocation Tests
- [ ] User can revoke their DID
- [ ] Revoked DID cannot be updated
- [ ] Chat reference cleared when requested
- [ ] Revoked status is correctly reported
- [ ] User can create new DID after revocation

### Migration Tests
- [ ] Admin can migrate DID
- [ ] Old DID is revoked after migration
- [ ] New wallet gets new DID
- [ ] Chat reference preserved when requested
- [ ] Migration fails if new wallet has DID
- [ ] Migration fails if old DID is revoked

## Future Enhancements

1. **Time-Locked Revocation:**
   - 7-day cooldown before revocation takes effect
   - User can cancel during cooldown

2. **Partial Revocation:**
   - Revoke specific data (chat, profile, etc.)
   - Keep DID active for other uses

3. **Automated Migration:**
   - Self-service with two-wallet signature
   - Recovery phrase verification
   - Social recovery (guardians)

4. **Migration History:**
   - Track all migrations
   - Show migration chain
   - Prevent circular migrations

