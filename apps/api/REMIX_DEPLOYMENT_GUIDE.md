# Remix IDE Deployment Guide for DIDIdentityToken

## Deployment Fields in Remix

Based on your contract constructor, here's what to fill in each field:

### Constructor Parameters

```solidity
constructor(
    string memory name,
    string memory symbol,
    string memory baseURI,
    address _backendSigner,
    bool _allowPublicMinting
)
```

### Field Values to Fill:

1. **name** (string):
   ```
   SafePsy DID Identity
   ```
   - This is the token name that will appear in wallets and explorers

2. **symbol** (string):
   ```
   SAFEPSY-DID
   ```
   - This is the token symbol (like ETH, USDC, etc.)

3. **baseURI** (string):
   ```
   https://api.safepsy.com/metadata/
   ```
   - Base URL for token metadata (JSON files)
   - Can be changed later via `setBaseURI()` if needed
   - For testing, you can use: `https://api.safepsy.com/metadata/`

4. **_backendSigner** (address):
   ```
   0x1f4739e229adcb1c986c8a8b66f686ddec29694c
   ```
   - This is your backend signer wallet address
   - This address can mint DIDs on behalf of users
   - Must be a valid Ethereum address (0x followed by 40 hex characters)

5. **_allowPublicMinting** (bool):
   ```
   false
   ```
   - Set to `false` to require backend signer for minting (recommended)
   - Set to `true` to allow anyone to mint their own DID
   - Can be changed later via `setAllowPublicMinting()`

## Complete Example

```
name: SafePsy DID Identity
symbol: SAFEPSY-DID
baseURI: https://api.safepsy.com/metadata/
_backendSigner: 0x1f4739e229adcb1c986c8a8b66f686ddec29694c
_allowPublicMinting: false
```

## Deployment Steps in Remix

1. **Compile the Contract**
   - Go to "Solidity Compiler" tab
   - Set Compiler to `0.8.20`
   - Enable Optimization: ✅ Yes
   - Runs: `1`
   - Click "Compile DIDIdentityToken.sol"

2. **Deploy the Contract**
   - Go to "Deploy & Run Transactions" tab
   - Select Environment: "Injected Provider - MetaMask" (or your wallet)
   - Make sure you're connected to the correct network (Sepolia or Mainnet)
   - Fill in the constructor parameters as shown above
   - Click "transact" button
   - Confirm the transaction in MetaMask

3. **After Deployment**
   - Copy the deployed contract address
   - Update your `.env` file:
     ```
     DID_IDENTITY_TOKEN_ADDRESS=0x... (your deployed address)
     ```

## Network Selection

- **For Testing**: Use Sepolia Testnet
  - Network: Sepolia
  - Chain ID: 11155111
  - Get test ETH from: https://sepoliafaucet.com/

- **For Production**: Use Ethereum Mainnet
  - Network: Mainnet
  - Chain ID: 1
  - Ensure you have enough ETH for gas fees

## Important Notes

- The `_backendSigner` address must have ETH for gas if it will mint DIDs
- The contract owner (deployer) can change `backendSigner` and `allowPublicMinting` later
- Once deployed, the contract address is permanent
- Save the deployment transaction hash for verification

## Verification (Optional)

After deployment, you can verify the contract on Etherscan:
1. Go to Etherscan (sepolia.etherscan.io for Sepolia)
2. Find your contract address
3. Click "Contract" tab → "Verify and Publish"
4. Upload your source code and constructor arguments

