# DID Revocation and Migration - Implementation Summary

## Overview

Implemented complete DID revocation and wallet migration functionality for SafePsy, allowing users to reset their identity and migrate to new wallets.

## Files Modified/Created

### Solidity Contract
- **`apps/api/src/contracts/DIDIdentityToken.sol`**
  - Added revocation mappings (`_revokedTokens`, `_revokedAddresses`)
  - Added `isRevoked()` and `isRevokedById()` view functions
  - Added `revokeDid()` function (with optional chat reference clearing)
  - Added `migrateDid()` function (admin/backend only)
  - Added `notRevoked` modifier to prevent updates on revoked DIDs
  - Added events: `DidRevoked`, `DidMigrated`

### Backend
- **`apps/api/src/lib/did.service.ts`**
  - Updated ABI to include revocation and migration functions
  - Added `isRevoked()` method
  - Added `migrateDid()` method
  - Updated `getDIDInfo()` to include revocation status

- **`apps/api/src/routes/did.ts`**
  - Added `POST /api/did/revoke` endpoint
  - Updated `POST /api/did/check` to include `isRevoked` status
  - Updated `GET /api/did/info` to include `isRevoked` status

### Documentation
- **`apps/api/src/contracts/DID_REVOCATION_MIGRATION.md`**
  - Complete design documentation
  - UX implications
  - Security considerations
  - Future enhancements

## Key Features

### Revocation

**User Flow:**
1. User requests revocation via UI
2. Frontend validates with backend (`POST /api/did/revoke`)
3. User calls `revokeDid()` on contract with wallet
4. DID is marked as revoked
5. Optionally clears chat data reference
6. Revoked DIDs cannot be updated

**Contract Functions:**
```solidity
function revokeDid(bool clearChatReference) external
function revokeDid() external // Convenience: clears by default
function isRevoked(address user) external view returns (bool)
```

**Backend Endpoint:**
- `POST /api/did/revoke` - Validates request, returns instructions

### Migration

**Support-Driven Flow:**
1. User contacts support requesting migration
2. Support verifies identity (off-chain)
3. Support calls `POST /api/did/migrate` (admin only)
4. Backend calls `migrateDid()` on contract
5. Old DID is revoked, new DID is created
6. Chat data can be preserved or cleared

**Contract Function:**
```solidity
function migrateDid(
    address oldWallet,
    address newWallet,
    bool clearChatReference
) external // Only owner or backend signer
```

**Backend Endpoint:**
- `POST /api/did/migrate` - Admin only, performs migration

## Security

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

## Storage Design

**Revocation Status:**
- Separate mappings (preserves storage layout):
  - `mapping(uint256 => bool) private _revokedTokens`
  - `mapping(address => bool) private _revokedAddresses`

**Benefits:**
- No changes to `DidProfile` struct
- Backward compatible
- Efficient lookups
- Easy to query revocation status

## Events

```solidity
event DidRevoked(
    address indexed user,
    uint256 indexed tokenId,
    uint64 timestamp
);

event DidMigrated(
    address indexed oldWallet,
    address indexed newWallet,
    uint256 indexed tokenId,
    uint64 timestamp
);
```

## Next Steps

1. **Update Frontend:**
   - Add revocation UI component
   - Add migration request form
   - Show revoked status in DID display
   - Disable operations on revoked DIDs

2. **Update Web3 Client:**
   - Add `revokeDid()` function
   - Add `isRevoked()` check
   - Add migration request helper

3. **Admin Panel:**
   - Create admin interface for migrations
   - Add verification workflow
   - Track migration requests

4. **Testing:**
   - Unit tests for revocation
   - Integration tests for migration
   - E2E tests for user flows

## Usage Examples

### Revoke DID (Frontend)
```typescript
// Check if revoked
const isRevoked = await contract.isRevoked(walletAddress);

// Revoke (clears chat reference)
await contract.revokeDid(true);

// Or use convenience function
await contract.revokeDid();
```

### Check Revocation Status (Backend)
```typescript
const didInfo = await didService.getDIDInfo(walletAddress);
if (didInfo.isRevoked) {
  // Handle revoked DID
}
```

### Migrate DID (Admin/Backend)
```typescript
const result = await didService.migrateDid(
  oldWallet,
  newWallet,
  false // Preserve chat reference
);
```

## UX Considerations

### Revocation
- Show clear warning before revocation
- Explain consequences (cannot be undone)
- Allow user to choose whether to clear chat data
- Show revoked status after revocation
- Allow creating new DID after revocation

### Migration
- Provide clear migration request form
- Set expectations for processing time
- Show pending status during migration
- Confirm successful migration
- Remind user to update saved addresses

## Future Enhancements

1. **Time-Locked Revocation:** 7-day cooldown before effect
2. **Self-Service Migration:** Two-wallet signature verification
3. **Partial Revocation:** Revoke specific data types
4. **Migration History:** Track all migrations
5. **Recovery Options:** Social recovery, guardians

