# 🚀 Smart Contract Deployment Guide - Sepolia Testnet

Complete setup and deployment instructions for SafePsy DID smart contracts on Ethereum Sepolia testnet.

## ⚠️ Important: Private Key vs API Key

The value `qJRW4eIQ5l-M4gf7H9Hn3` is your **Alchemy API key** (used in the RPC URL), not a deployer private key.

**For deployment, you need:**
- **Deployer Private Key**: A 64-character hex string starting with `0x` (your wallet's private key)
- **RPC URL**: The Alchemy endpoint (already configured)

## Current Configuration

✅ **RPC URLs Configured:**
- Primary: `https://eth-sepolia.g.alchemy.com/v2/qJRW4eIQ5l-M4gf7H9Hn3`
- Backup: `https://ethereum-sepolia.rpc.subquery.network/public`

✅ **Network:** Sepolia Testnet (Chain ID: 11155111)

## Prerequisites

- Node.js and npm/yarn installed
- A wallet with Sepolia ETH for gas fees
- Access to the project repository

## Step-by-Step Deployment

### Step 1: Create `.env` File

```bash
cd apps/api
cp .env.example .env
```

### Step 2: Get a Deployer Private Key

**⚠️ CRITICAL**: You need a wallet private key to deploy contracts. This should be:
- A 64-character hex string
- Starting with `0x`
- From a wallet you control (for testnet, use a test wallet with Sepolia ETH)

**Option A: Use MetaMask**
1. Open MetaMask
2. Select your account
3. Click account menu → Account Details → Show Private Key
4. Copy the private key (starts with `0x`)

**Option B: Generate a Test Wallet**
```bash
# Generate a new test wallet (for testnet only!)
node -e "const {Wallet} = require('ethers'); const w = Wallet.createRandom(); console.log('Private Key:', w.privateKey); console.log('Address:', w.address);"
```

**Option C: Use Hardhat Test Accounts**
```bash
# Start Hardhat node to see test accounts with private keys
npx hardhat node
```

### Step 3: Fund Your Deployer Wallet

Your deployer wallet needs Sepolia ETH for gas fees:

1. Get Sepolia ETH from a faucet:
   - https://sepoliafaucet.com/
   - https://faucet.quicknode.com/ethereum/sepolia
   - https://www.alchemy.com/faucets/ethereum-sepolia

2. Send Sepolia ETH to your deployer wallet address
   - Check balance: Visit https://sepolia.etherscan.io/ and search for your wallet address
   - You'll need at least 0.01 ETH for deployment

### Step 4: Update `.env` File

Edit `apps/api/.env` and set:

```bash
# Your deployer private key (64-char hex string starting with 0x)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# RPC URL (already configured)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/qJRW4eIQ5l-M4gf7H9Hn3

# Network
NETWORK=sepolia
```

**Alternative:** You can also use `DID_BACKEND_SIGNER_PRIVATE_KEY` instead of `PRIVATE_KEY`:

```bash
DID_BACKEND_SIGNER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

### Step 5: Compile Contracts

```bash
cd apps/api
npx hardhat compile
```

This generates the contract artifacts (bytecode and ABI) needed for deployment.

### Step 6: Deploy Contracts

**Option A: Using `.env` file (Recommended)**

```bash
# Make sure you're in apps/api directory
cd apps/api

# Deploy (script will use .env variables automatically)
yarn deploy:contracts --network sepolia
```

**Option B: Export variables manually**

```bash
export PRIVATE_KEY=0xYOUR_PRIVATE_KEY
export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/qJRW4eIQ5l-M4gf7H9Hn3
yarn deploy:contracts --network sepolia
```

### Step 7: Verify Deployment

After deployment completes, verify everything worked:

1. **Check deployment registry**:
   ```bash
   cat apps/api/src/contracts/deployments/sepolia.json
   ```

2. **Run smoke checks**:
   ```bash
   yarn smoke-check --network sepolia
   ```

3. **View on Etherscan**:
   - Visit: https://sepolia.etherscan.io/
   - Search for your contract addresses from the deployment registry
   - Verify contract code is deployed

## Expected Output

Successful deployment will show:

```
========================================
  Smart Contract Deployment
========================================
Network: sepolia
RPC URL: https://eth-sepolia.g.alchemy.com/v2/qJRW4eIQ5l-M4gf7H9Hn3
Force: NO
========================================

=== Deploying DIDOwnership ===
[DEPLOY] Deploying DIDOwnership...
  Deployer: 0x...
  Balance: 0.1 ETH
  Deploying with constructor args: none
  Transaction hash: 0x...
  Waiting for confirmation...
  ✅ Deployed at: 0x...
  Block: 123456
  Gas used: 2345678

=== Deploying DIDRegistry ===
[DEPLOY] Deploying DIDRegistry...
  Deployer: 0x...
  Balance: 0.09 ETH
  Deploying with constructor args: ["SafePsy DID Identity","SAFEPSY-DID","0x...","0x..."]
  Transaction hash: 0x...
  Waiting for confirmation...
  ✅ Deployed at: 0x...
  Block: 123460
  Gas used: 3456789

========================================
  Deployment Summary
========================================
DIDOwnership:
  Address: 0x...
  Tx: 0x...
  Block: 123456
DIDRegistry:
  Address: 0x...
  Tx: 0x...
  Block: 123460
========================================

=== Running Smoke Checks ===

Running smoke checks for network: sepolia
RPC URL: https://eth-sepolia.g.alchemy.com/v2/qJRW4eIQ5l-M4gf7H9Hn3

Checking DIDRegistry at 0x...
Checking DIDOwnership at 0x...

=== Smoke Check Results ===
[PASS] DIDRegistry reachable at 0x...
[PASS] DIDOwnership reachable at 0x...

[PASS] All smoke checks succeeded

✅ All deployments and smoke checks completed successfully!
```

## Troubleshooting

### "PRIVATE_KEY environment variable is required"

**Solution:**
- Make sure you've set `PRIVATE_KEY` in `.env` file or exported it
- The private key must be a 64-character hex string starting with `0x`
- Example: `PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
- You can also use `DID_BACKEND_SIGNER_PRIVATE_KEY` instead

### "Insufficient balance"

**Solution:**
- Fund your deployer wallet with Sepolia ETH from a faucet
- Check balance: Visit https://sepolia.etherscan.io/ and search for your wallet address
- You need at least 0.01 ETH for deployment (more is recommended)

### "Failed to load contract artifact"

**Solution:**
- Run `npx hardhat compile` first
- Make sure you're in the `apps/api` directory
- Check that `artifacts/` directory exists after compilation

### "RPC_URL environment variable is required"

**Solution:**
- Set `SEPOLIA_RPC_URL` in `.env` file
- Or export it: `export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/qJRW4eIQ5l-M4gf7H9Hn3`
- Try the backup RPC: `export RPC_URL=https://ethereum-sepolia.rpc.subquery.network/public`
- Check your Alchemy dashboard for API key status

### "Chain ID mismatch"

**Solution:**
- Verify your RPC URL points to Sepolia (Chain ID: 11155111)
- Check `SEPOLIA_RPC_URL` is set correctly
- Network should be set to `sepolia`

### Contract deployment fails

**Solution:**
- Check transaction on Etherscan for error details
- Verify you have enough ETH for gas
- Try increasing gas limit if needed (though testnet usually auto-determines)
- Check contract compilation succeeded

## Idempotent Deployment

The deployment script is **idempotent** - safe to run multiple times:

- **First run**: Deploys contracts
- **Subsequent runs**: Detects existing deployments and skips (unless `--force` is used)

To force redeploy (creates new contracts):
```bash
yarn deploy:contracts --network sepolia --force
```

⚠️ **Warning**: Force deployment creates NEW contracts. Old contracts remain on-chain.

## Next Steps After Deployment

### 1. Save Contract Addresses

Add deployed contract addresses to your `.env`:

```bash
# Add to apps/api/.env (Sepolia)
DID_REGISTRY_ADDRESS=0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5
DID_OWNERSHIP_ADDRESS=0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722
# See apps/api/deployments/SEPOLIA_DEPLOYED_CONTRACTS.md for full list
```

**Note**: If `DID_REGISTRY_ADDRESS` is not set, the API falls back to `deployments/sepolia-latest.json` when running on Sepolia.

### 2. Commit Deployment Registry

```bash
git add apps/api/src/contracts/deployments/sepolia.json
git commit -m "Deploy contracts to Sepolia testnet"
```

### 3. Update Application Configuration

Update your application code to use the deployed contract addresses:

- Update `DID_REGISTRY_ADDRESS` in environment variables
- Update `DID_OWNERSHIP_ADDRESS` in environment variables
- Test contract interactions with deployed addresses

### 4. Test Contract Interactions

- Test DID creation
- Test DID ownership verification
- Test authorization checks
- Verify all contract functions work as expected

### 5. Monitor Deployment

- Set up monitoring for contract events
- Track contract usage
- Monitor gas costs
- Set up alerts for critical events

## Security Notes

### ⚠️ Critical Security Practices

- **Never commit `.env` file** to git
- **Never share your private key** publicly
- **Use test wallets** for testnet deployments
- **For mainnet**, use hardware wallets or secure key management
- **Consider using a multisig** for production deployments
- **Rotate keys** if compromised
- **Use separate wallets** for testnet and mainnet

### Best Practices

- ✅ Store private keys in secure key management systems
- ✅ Use environment variables, not hardcoded values
- ✅ Verify contract addresses on Etherscan before using
- ✅ Test thoroughly on testnet before mainnet deployment
- ✅ Keep deployment records for audit purposes
- ✅ Use version control for deployment scripts

## Additional Resources

### Documentation

- **Full deployment guide**: `apps/api/src/contracts/SMART-CONTRACTS_DEPLOYMENT.md`
- **Quick start guide**: `apps/api/src/contracts/scripts/QUICK_START.md`
- **Hardhat documentation**: https://hardhat.org/docs

### Useful Links

- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- **Sepolia Faucets**:
  - https://sepoliafaucet.com/
  - https://faucet.quicknode.com/ethereum/sepolia
  - https://www.alchemy.com/faucets/ethereum-sepolia
- **Alchemy Dashboard**: https://dashboard.alchemy.com/
- **Ethers.js Docs**: https://docs.ethers.org/

### Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review deployment logs for error messages
3. Check transaction status on Etherscan
4. Verify all environment variables are set correctly
5. Ensure contracts are compiled before deployment

## Deployment Checklist

Before deploying, ensure:

- [ ] `.env` file created and configured
- [ ] Deployer private key set (64-char hex string starting with `0x`)
- [ ] Deployer wallet funded with Sepolia ETH
- [ ] Contracts compiled (`npx hardhat compile`)
- [ ] RPC URL configured correctly
- [ ] Network set to `sepolia`
- [ ] All prerequisites met

After deployment, verify:

- [ ] Deployment registry file created (`deployments/sepolia.json`)
- [ ] Smoke checks passed
- [ ] Contracts visible on Etherscan
- [ ] Contract addresses saved to `.env`
- [ ] Deployment registry committed to git
- [ ] Application configured with new addresses

---

**Ready to deploy?** Follow the steps above, and you'll have your contracts deployed to Sepolia testnet in minutes!
