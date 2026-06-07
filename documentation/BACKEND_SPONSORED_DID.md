# Backend-Sponsored DID Minting

## Overview

Backend-sponsored DID minting allows your SafePsy backend to pay the gas fees for users when they create their Safe ID Token (DID). This provides a seamless user experience where users don't need to acquire Sepolia ETH just to mint their identity token.

## How It Works

### Without Backend Sponsorship (User Pays Gas)
1. User connects wallet
2. User calls `createMyDid()` on the contract
3. **User pays gas** (~0.001 ETH on Sepolia)
4. DID is minted to user's wallet

### With Backend Sponsorship (Backend Pays Gas)
1. User connects wallet
2. User clicks "Create Safe ID Token"
3. Backend calls `createDid(userAddress)` using its funded signer
4. **Backend pays gas** — user pays nothing
5. DID is minted to user's wallet

## Configuration

### Required Environment Variables

Set the following in your `.env` file (copy from `.env.production.example` or `apps/api/.env.example`):

```bash
# Backend signer private key (REQUIRED for sponsored minting)
DID_BACKEND_SIGNER_PRIVATE_KEY=0xYourPrivateKeyHere

# Legacy DID Identity Token contract (required for backend-sponsored minting)
DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053

# RPC URL (required for any on-chain operations)
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Backend Signer Wallet Setup

1. **Create a dedicated wallet** for the backend signer:
   ```bash
   # Using Foundry
   cast wallet new
   
   # Or generate via MetaMask/other wallet
   ```

2. **Fund the wallet with Sepolia ETH**:
   - Get free Sepolia ETH from faucets:
     - https://sepoliafaucet.com/
     - https://faucets.chain.link/sepolia
     - https://cloud.google.com/application/web3/faucet/ethereum/sepolia
   - Recommended: 0.1-0.5 ETH for testing (covers ~100-500 DID mints)
   - Production: Monitor and replenish as needed

3. **Store the private key securely**:
   - Add to `.env` (never commit to git)
   - In production, use Secret Manager (Scaleway Secret Manager, AWS Secrets Manager, etc.)

## API Response

When a DID is created with backend sponsorship, the API response includes an `isSponsored` flag:

```json
{
  "success": true,
  "message": "DID created successfully (gas sponsored by backend)",
  "data": {
    "hasDid": true,
    "tokenId": "123",
    "encryptedDataExists": false,
    "walletAddress": "0x...",
    "txHash": "0x...",
    "isSponsored": true
  }
}
```

## Frontend UX

The frontend automatically detects and displays sponsored minting:

### DID Manager Component
- Shows "Gas-Free Minting" notice
- Success message indicates "Gas was sponsored by the backend"

### Chat Widget
- Toast notification shows "Creating Safe ID Token (gas sponsored)..."
- Success: "Safe ID Token created! Gas was sponsored — no ETH needed."

## Security Considerations

### Private Key Management
- **NEVER** commit the private key to version control
- Use environment variables or secret manager
- Rotate the key if accidentally exposed
- Consider using a dedicated wallet (not your main treasury)

### Rate Limiting
The DID creation endpoint (`POST /api/did/create`) should be rate-limited to prevent abuse:
- Already protected by wallet auth middleware
- Consider adding additional rate limiting per wallet address
- Monitor gas expenditure and set alerts

### Fallback Behavior
If `DID_BACKEND_SIGNER_PRIVATE_KEY` is not set:
- Backend cannot sponsor gas
- Users must mint their own DID via `createMyDid()` (requires Sepolia ETH)
- The API returns an error message guiding users

## Contract Architecture

### Why Legacy Contract?

The backend-sponsored minting uses `DIDIdentityTokenV2` (legacy contract) rather than `DIDRegistryV2` because:

1. **DIDRegistryV2** uses OpenZeppelin's `AccessControl` with `MINTER_ROLE`
   - Requires governance setup via timelock
   - More complex role management
   - Better for decentralized governance

2. **DIDIdentityTokenV2** uses simple `backendSigner` address
   - Direct owner-controlled signer
   - Simpler for backend-sponsored minting
   - Uses `createDid(address user)` function
   - Only owner or backendSigner can mint

### Contract Functions

```solidity
// DIDIdentityTokenV2.sol

/// @dev Create DID for a user (backend signer or owner only)
/// @param user The wallet address to create DID for
/// @return tokenId The created token ID
function createDid(address user) external onlyMinter returns (uint256)

/// @dev Modifier checking if caller is backend signer or public minting allowed
modifier onlyMinter() {
    require(
        msg.sender == backendSigner || allowPublicMinting || msg.sender == owner(),
        "Not authorized"
    );
    _;
}
```

## Monitoring & Operations

### Gas Tracking
Monitor the backend signer wallet balance:
```bash
# Check balance (using cast from Foundry)
cast balance <BACKEND_SIGNER_ADDRESS> --rpc-url $RPC_URL
```

### Alerting
Set up alerts for:
- Low backend signer balance (< 0.05 ETH)
- High DID creation rate (potential abuse)
- Failed transactions (contract issues)

### Metrics to Track
- DIDs created per day
- Total gas spent
- Average gas per DID
- Failed mint attempts

## Troubleshooting

### "Backend signer not configured" Error
**Cause**: `DID_BACKEND_SIGNER_PRIVATE_KEY` not set or invalid

**Solution**:
1. Verify the environment variable is set
2. Ensure the private key format is correct (0x prefix)
3. Restart the API server after setting

### "Insufficient funds" Error
**Cause**: Backend signer wallet has insufficient Sepolia ETH

**Solution**:
1. Check wallet balance
2. Add more Sepolia ETH from faucet
3. Verify RPC_URL is correct

### "DID already exists" Error
**Cause**: Wallet already has a minted DID

**Solution**:
1. Check DID status via `/api/did/check`
2. If revoked, user needs to migrate or use a new wallet
3. If active, no action needed — DID exists

## Testing

### Local Testing
```bash
# 1. Set environment variables
export DID_BACKEND_SIGNER_PRIVATE_KEY=0x...
export RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
export DID_IDENTITY_TOKEN_ADDRESS=0x...

# 2. Start the API
cd apps/api && npm run dev

# 3. Test DID creation
curl -X POST http://localhost:3001/api/did/create \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: <YOUR_WALLET>" \
  -H "x-chain-id: 11155111"
```

### Expected Flow
1. Wallet connects → `/api/auth/wallet/connect`
2. Wallet verifies → `/api/auth/wallet/verify`
3. DID check → `/api/did/check` (returns `hasDid: false`)
4. DID create → `/api/did/create` (returns `isSponsored: true`)
5. DID check → `/api/did/check` (returns `hasDid: true`)

## Production Deployment

### Checklist
- [ ] `DID_BACKEND_SIGNER_PRIVATE_KEY` set in production secrets
- [ ] Backend signer wallet funded with Sepolia ETH
- [ ] Rate limiting configured on `/api/did/create`
- [ ] Monitoring/alerting set up for gas balance
- [ ] Frontend build includes sponsored minting UI
- [ ] Documentation updated for ops team

### Scaleway Secret Manager
If using Scaleway Secret Manager:
1. Add secret named `did-backend-signer-private-key`
2. Set key `did-backend-signer-private-key` with value `0x...`
3. Ensure `SCALEWAY_SECRET_MANAGER_ENABLED=true`

## Cost Estimates

### Sepolia Testnet (Current)
- Gas per DID mint: ~50,000-100,000 gas
- Gas price: ~10-20 gwei
- Cost per DID: ~0.0005-0.002 ETH
- 1 ETH covers: ~500-2000 DID mints

### Ethereum Mainnet (Future)
- Significantly higher gas costs
- Consider L2 (Optimism, Arbitrum) for production
- Or keep DID on testnet, use mainnet for payments only

## Future Enhancements

1. **DIDRegistryV2 Integration**: Add MINTER_ROLE support for new registry
2. **Batch Minting**: Mint multiple DIDs in one transaction
3. **Gasless Meta-transactions**: Use EIP-2771 for truly gasless UX
4. **Sponsorship Tiers**: Different sponsorship levels based on user type

## Related Documentation
- [DID Contract Architecture](./DID_CONTRACTS.md)
- [Wallet Authentication](./WALLET_AUTH.md)
- [Environment Configuration](../.env.production.example)
