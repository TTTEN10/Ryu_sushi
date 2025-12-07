# DID Identity Token Contract - ERC-721 Soulbound Implementation

## Overview

The DID Identity Token is a **soulbound ERC-721 token** that serves as a user's decentralized identity on SafePsy. Each wallet can have exactly one non-transferable identity token.

## Contract Features

### ERC-721 Standard Compliance
- Extends OpenZeppelin's `ERC721` contract
- Implements standard ERC-721 functions (`ownerOf`, `tokenURI`, etc.)
- **Soulbound (Non-Transferable)**: All transfer functions are overridden to revert

### Storage Model

The contract uses a structured storage model:

```solidity
struct DidProfile {
    address owner;                    // 20 bytes
    uint64 createdAt;                 // 8 bytes (packed)
    uint64 lastUpdatedAt;             // 8 bytes (packed)
    bytes32 chatDataReference;        // 32 bytes (hash/CID/DB key)
    bytes encryptedKeyMetadata;       // Variable length
}
```

**Storage Layout:**
- `tokenId → DidProfile` mapping
- `owner → tokenId` mapping (for efficient lookup)
- `owner → bool` mapping (for quick existence checks)

### Key Functions

#### Profile Management

```solidity
// Get full profile by wallet address
function getProfileByOwner(address user) external view returns (DidProfile memory)

// Get full profile by token ID
function getProfile(uint256 tokenId) external view returns (DidProfile memory)

// Update chat reference and encrypted key metadata
function updateChatReference(
    string calldata newRef,
    bytes calldata newEncryptedKeyMetadata
) external

// Update only encrypted key metadata
function updateEncryptedKeyMetadata(bytes calldata newEncryptedKeyMetadata) external

// Update only chat data reference
function updateChatDataReference(string calldata newRef) external
```

#### DID Status

```solidity
// Check if wallet has a DID
function hasDid(address user) external view returns (bool)

// Get token ID for wallet
function getDidId(address user) external view returns (uint256)

// Get chat data reference
function getChatDataReference(address user) external view returns (bytes32)

// Get encrypted key metadata
function getEncryptedKeyMetadata(address user) external view returns (bytes memory)
```

#### Minting

```solidity
// Create DID for a user (backend signer or owner only)
function createDid(address user) external returns (uint256)

// Create DID for caller (public minting if enabled)
function createMyDid() external returns (uint256)
```

### Soulbound Implementation

All transfer functions are overridden to prevent transfers:

```solidity
function transferFrom(address, address, uint256) public pure override {
    revert("DIDIdentityToken: token is soulbound and non-transferable");
}

function safeTransferFrom(...) public pure override {
    revert("DIDIdentityToken: token is soulbound and non-transferable");
}

function approve(address, uint256) public pure override {
    revert("DIDIdentityToken: token is soulbound and cannot be approved");
}

function setApprovalForAll(address, bool) public pure override {
    revert("DIDIdentityToken: token is soulbound and cannot be approved");
}
```

### Access Control

- **Owner**: Contract deployer (can update backend signer, toggle public minting)
- **Backend Signer**: Can mint DIDs for users (if configured)
- **Public Minting**: Can be enabled/disabled by owner
- **DID Owner**: Can update their own profile data

### Events

```solidity
event DidCreated(
    address indexed user,
    uint256 indexed tokenId,
    uint64 timestamp
);

event DidChatReferenceUpdated(
    address indexed user,
    uint256 indexed tokenId,
    bytes32 indexed chatDataReference,
    uint64 timestamp
);

event DidKeyMetadataUpdated(
    address indexed user,
    uint256 indexed tokenId,
    uint64 timestamp
);
```

## Gas Optimization

1. **Packed Struct**: `DidProfile` uses `uint64` for timestamps (saves gas vs `uint256`)
2. **Efficient Lookups**: Direct `owner → tokenId` mapping for O(1) lookups
3. **Indexed Events**: All events use indexed parameters for efficient filtering
4. **Storage Slots**: Profile data is organized to minimize storage operations

## Upgradeability Considerations

The contract is designed with UUPS proxy compatibility in mind:

- Storage variables are grouped logically
- No storage layout conflicts with proxy patterns
- Consider using UUPS proxy for future upgrades

**Note**: If upgrading, ensure:
1. Storage layout compatibility
2. Preserve existing token IDs and profiles
3. Maintain soulbound behavior

## Deployment

### Constructor Parameters

```solidity
constructor(
    string memory name,              // e.g., "SafePsy DID Identity"
    string memory symbol,            // e.g., "SAFEPSY-DID"
    string memory baseURI,           // Base URI for token metadata
    address _backendSigner,          // Backend signer address (can be zero)
    bool _allowPublicMinting         // Whether to allow public minting
)
```

### Example Deployment

```javascript
const DIDIdentityToken = await ethers.getContractFactory("DIDIdentityToken");
const didToken = await DIDIdentityToken.deploy(
    "SafePsy DID Identity",
    "SAFEPSY-DID",
    "https://api.safepsy.com/did/metadata/",
    backendSignerAddress,
    false // Start with public minting disabled
);
```

## Usage Examples

### Backend: Create DID for User

```typescript
const didService = DIDService.getInstance();
const result = await didService.createDID(walletAddress);
// Returns: { tokenId: string, txHash: string }
```

### Frontend: Update Chat Reference

```typescript
import { updateChatReference } from '../utils/did-contract';

const receipt = await updateChatReference(
    signer,
    chatHash,              // String: hash/CID/DB key
    encryptedKeyMetadata   // Uint8Array: encrypted symmetric key
);
```

### Frontend: Get Profile

```typescript
import { getDIDProfile } from '../utils/did-contract';

const profile = await getDIDProfile(provider, walletAddress);
// Returns: { owner, createdAt, lastUpdatedAt, chatDataReference, encryptedKeyMetadata }
```

## Security Considerations

1. **Soulbound**: Tokens cannot be transferred, preventing identity theft
2. **Access Control**: Only DID owner can update their profile
3. **Backend Signer**: Controlled minting prevents spam
4. **Network Validation**: Contract enforces Ethereum Mainnet only
5. **Reentrancy Protection**: Uses `ReentrancyGuard` for state-changing functions

## Integration Points

### Backend (`apps/api/src/lib/did.service.ts`)
- `getProfile(walletAddress)`: Get full profile
- `getChatDataReference(walletAddress)`: Get chat reference
- `getEncryptedKeyMetadata(walletAddress)`: Get encrypted key

### Frontend (`apps/web/src/utils/did-contract.ts`)
- `updateChatReference(signer, chatRef, keyMetadata)`: Update both fields
- `updateEncryptedKeyMetadata(signer, keyMetadata)`: Update only key
- `updateChatDataReference(signer, chatRef)`: Update only reference
- `getDIDProfile(provider, walletAddress)`: Get full profile

## Migration from Previous Contract

If migrating from the previous non-ERC721 contract:

1. Deploy new ERC-721 contract
2. Migrate existing DIDs:
   - For each existing DID, call `createDid(userAddress)`
   - Preserve token IDs if possible (may require custom migration)
3. Update contract address in environment variables
4. Update frontend/backend ABIs

## Future Enhancements

- **Metadata URI**: Implement `tokenURI()` for rich metadata
- **Batch Operations**: Add batch minting for efficiency
- **Upgradeability**: Implement UUPS proxy pattern
- **Gas Optimization**: Consider using storage packing for additional savings

