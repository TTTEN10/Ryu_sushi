# DID Identity Token Implementation

Complete implementation of DID (Decentralized Identity) layer for SafePsy with soulbound identity tokens.

## Overview

This implementation provides:
- **Soulbound Identity Tokens**: One non-transferable token per wallet
- **Smart Contract**: Solidity contract for DID management
- **Backend Service**: Web3 integration with ethers.js
- **Production API**: RESTful endpoints for DID operations
- **Frontend UI**: React components for DID management
- **Auto-Creation**: Automatic DID creation on first connection

## Architecture

### Smart Contract

**File**: `apps/api/src/contracts/DIDIdentityToken.sol`

- **Soulbound Design**: Tokens cannot be transferred (one per wallet)
- **Key Functions**:
  - `hasDid(address user)` - Check if wallet has DID
  - `getDidId(address user)` - Get token ID for wallet
  - `getDidData(address user)` - Get encrypted data
  - `setDidData(bytes encryptedData)` - Update encrypted data (owner only)
  - `createDid(address user)` - Create DID (backend signer or public)
  - `createMyDid()` - Public self-minting

- **Events**:
  - `DidCreated(address indexed user, uint256 indexed tokenId)`
  - `DidDataUpdated(address indexed user)`

### Backend Service

**File**: `apps/api/src/lib/did.service.ts`

- **DIDService Class**: Manages Web3 interactions
- **Features**:
  - Network validation (Ethereum Mainnet only)
  - Wallet address validation
  - Backend signer support for minting
  - Public minting fallback

### API Endpoints

**File**: `apps/api/src/routes/did.ts`

#### POST /api/did/check
Check if authenticated wallet has a DID.

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "tokenId": "123",
    "encryptedDataExists": false,
    "walletAddress": "0x..."
  }
}
```

#### POST /api/did/create
Create a DID for authenticated wallet.

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "success": true,
  "message": "DID created successfully",
  "data": {
    "hasDid": true,
    "tokenId": "123",
    "encryptedDataExists": false,
    "walletAddress": "0x...",
    "txHash": "0x..."
  }
}
```

#### GET /api/did/info
Get all available metadata about user's DID.

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "tokenId": "123",
    "encryptedDataExists": true,
    "encryptedDataSize": 256,
    "walletAddress": "0x...",
    "contractAddress": "0x...",
    "network": "Ethereum Mainnet",
    "chainId": 1
  }
}
```

### Frontend Components

**File**: `apps/web/src/components/DIDManager.tsx`

- **DID Status Panel**: Shows identity status
- **Create Button**: Triggers DID creation
- **Auto-Refresh**: Updates on auth state changes

**States**:
- "No identity yet" - Shows create button
- "Identity active" - Shows token ID and data status
- Loading/Error states with appropriate UI

## User Flow

### First-Time User

1. **Connect Wallet** → MetaMask/WalletConnect
2. **Verify Wallet** → Sign verification message
3. **Auto-Check DID** → System checks if DID exists
4. **No DID Found** → Shows "Create my SafePsy Identity" button
5. **User Clicks Create** → Backend mints DID token
6. **DID Created** → Token ID assigned, status updated

### Returning User

1. **Connect Wallet** → MetaMask/WalletConnect
2. **Verify Wallet** → Sign verification message
3. **Auto-Check DID** → System checks if DID exists
4. **DID Found** → Shows "Identity Active" with token ID
5. **Ready to Use** → All features available

## Integration with Auth Flow

The DID check is automatically integrated into the authentication flow:

```typescript
// In AuthContext.tsx
useEffect(() => {
  if (authState.isVerified) {
    checkDID(); // Automatically checks DID after verification
  }
}, [authState.isVerified]);
```

## Security Features

### 1. Network Validation
- Only Ethereum Mainnet (Chain ID: 1) is supported
- Backend validates network before any operation
- Frontend shows error if wrong network

### 2. Authentication Required
- All DID endpoints require valid JWT session
- Wallet address extracted from authenticated session
- No arbitrary address minting allowed

### 3. Ownership Validation
- Only wallet owner can update their DID data
- Backend signer can create DIDs (if configured)
- Public minting option (if enabled in contract)

### 4. Duplicate Prevention
- Contract enforces one DID per wallet
- Backend checks before creation
- Returns existing DID if already created

## Environment Variables

### Backend

```env
# DID Contract Configuration
DID_IDENTITY_TOKEN_ADDRESS=0x... # Deployed contract address
RPC_URL=https://mainnet.infura.io/v3/... # Ethereum RPC endpoint
ETH_RPC_URL=https://mainnet.infura.io/v3/... # Alternative RPC URL

# Optional: Backend Signer (for backend-initiated minting)
DID_BACKEND_SIGNER_PRIVATE_KEY=0x... # Private key for backend signer

# JWT Configuration
JWT_SECRET=your-strong-random-secret
JWT_EXPIRES_IN=7d
```

### Frontend

```env
VITE_API_URL=http://localhost:3001
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

## Deployment

### 1. Deploy Smart Contract

```bash
# Compile contract
npx hardhat compile

# Deploy to Ethereum Mainnet
npx hardhat run scripts/deploy-did-token.js --network mainnet
```

**Deployment Script Example**:
```javascript
const DIDIdentityToken = await ethers.getContractFactory("DIDIdentityToken");
const didToken = await DIDIdentityToken.deploy(
  "0x0000000000000000000000000000000000000000", // Backend signer (zero = no backend)
  true // Allow public minting
);
await didToken.deployed();
console.log("DIDIdentityToken deployed to:", didToken.address);
```

### 2. Configure Backend

1. Set `DID_IDENTITY_TOKEN_ADDRESS` to deployed contract address
2. Set `RPC_URL` to Ethereum Mainnet RPC endpoint
3. (Optional) Set `DID_BACKEND_SIGNER_PRIVATE_KEY` for backend minting

### 3. Test Endpoints

```bash
# Check DID (requires auth)
curl -X POST http://localhost:3001/api/did/check \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Create DID (requires auth)
curl -X POST http://localhost:3001/api/did/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## Usage Examples

### Frontend: Display DID Status

```typescript
import { useAuth } from '../contexts/AuthContext';
import DIDManager from '../components/DIDManager';

function MyComponent() {
  const { authState } = useAuth();

  return (
    <div>
      {authState.isVerified && (
        <DIDManager />
      )}
    </div>
  );
}
```

### Frontend: Check DID Programmatically

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { authState, checkDID } = useAuth();

  useEffect(() => {
    if (authState.isVerified) {
      checkDID();
    }
  }, [authState.isVerified]);

  if (authState.didStatus === 'exists') {
    return <div>DID Active: {authState.didInfo?.did}</div>;
  }

  return <div>No DID found</div>;
}
```

### Backend: Protect Route with DID Check

```typescript
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { DIDService } from '../lib/did.service';

router.get('/protected', authenticateWallet, async (req: AuthenticatedRequest, res) => {
  const didService = DIDService.getInstance();
  if (!didService) {
    return res.status(503).json({ error: 'DID service unavailable' });
  }

  const hasDid = await didService.hasDid(req.wallet.walletAddress);
  if (!hasDid) {
    return res.status(403).json({ error: 'DID required' });
  }

  // Continue with protected logic
  res.json({ success: true });
});
```

## Error Handling

### Network Errors

If user is on wrong network:
- Frontend shows error banner
- Backend returns `UNSUPPORTED_CHAIN` error
- User must switch to Ethereum Mainnet

### DID Creation Errors

- **Already Exists**: Returns existing DID info
- **Network Mismatch**: Clear error message
- **Backend Signer Missing**: Falls back to public minting (if enabled)
- **Transaction Failed**: Detailed error from blockchain

### Authentication Errors

- **No Token**: Returns 401
- **Invalid Token**: Returns 401
- **Expired Token**: Frontend auto-refreshes or prompts re-verification

## Testing

### Manual Testing

1. **Deploy Contract** to testnet (Sepolia/Amoy)
2. **Update Environment** with testnet contract address
3. **Connect Wallet** to testnet
4. **Verify Wallet** and check DID status
5. **Create DID** and verify token ID
6. **Check DID Info** and verify all fields

### Unit Tests

```typescript
describe('DIDService', () => {
  it('should check if wallet has DID', async () => {
    const service = DIDService.getInstance();
    const hasDid = await service.hasDid('0x...');
    expect(hasDid).toBe(false);
  });

  it('should create DID for wallet', async () => {
    const service = DIDService.getInstance();
    const result = await service.createDID('0x...');
    expect(result.tokenId).toBeDefined();
  });
});
```

## Files Created/Modified

### Backend
- `apps/api/src/contracts/DIDIdentityToken.sol` - Smart contract
- `apps/api/src/lib/did.service.ts` - DID service
- `apps/api/src/routes/did.ts` - API endpoints
- `apps/api/src/index.ts` - Route registration

### Frontend
- `apps/web/src/components/DIDManager.tsx` - DID management UI
- `apps/web/src/contexts/AuthContext.tsx` - Updated DID check
- `apps/web/src/components/ConnectWallet.tsx` - Auto DID check

## Next Steps

1. **Deploy Contract**: Deploy to Ethereum Mainnet
2. **Configure Environment**: Set contract address and RPC URL
3. **Test Integration**: Verify end-to-end flow
4. **Add Encryption**: Implement encrypted data storage
5. **Add DID Metadata**: Store additional identity information
6. **Add DID Revocation**: Allow users to revoke their DID

## Contract Deployment Checklist

- [ ] Compile contract with Solidity 0.8.20+
- [ ] Deploy to Ethereum Mainnet
- [ ] Verify contract on Etherscan
- [ ] Set backend environment variables
- [ ] Test contract functions
- [ ] Test API endpoints
- [ ] Test frontend integration
- [ ] Monitor gas costs
- [ ] Set up contract upgradeability (if needed)

## Security Checklist

- [ ] Backend signer private key stored securely
- [ ] Contract address validated on every request
- [ ] Network validation on all operations
- [ ] Wallet address validation
- [ ] Rate limiting on create endpoint
- [ ] Error messages don't leak sensitive info
- [ ] JWT tokens expire appropriately
- [ ] HTTPS in production
- [ ] Contract audited (recommended)

