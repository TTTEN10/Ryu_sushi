# Sepolia Testnet Deployment Guide

## Prerequisites

1. **Sepolia Testnet ETH** - Your wallet needs SepoliaETH for gas fees
   - Wallet: `0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c`
   - Get free SepoliaETH from:
     - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
     - [QuickNode Sepolia Faucet](https://faucet.quicknode.com/ethereum/sepolia)
     - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
     - [Chainlink Sepolia Faucet](https://faucets.chain.link/sepolia)

2. **Contract Compilation** - The contract needs to be compiled first
   - Due to Node.js 23 compatibility issues with Hardhat, you may need to:
     - Use Node.js 22 LTS: `nvm install 22 && nvm use 22`
     - Or compile on a different machine
     - Or use Remix IDE

## Configuration

Your `.env` file should have:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/qJRW4eIQ5l-M4gf7H9Hn3
DID_BACKEND_SIGNER_PRIVATE_KEY=48d3642d9eb0552f3331dcc213b324a22e724adc6d5d87dec38c018816711261
DID_BACKEND_SIGNER_ADDRESS=0x1f4739e229adcb1c986c8a8b66f686ddec29694c
```

## Deployment Steps

1. **Get SepoliaETH** (if needed):
   - Visit one of the faucets above
   - Request SepoliaETH for your wallet address
   - Wait for the transaction to confirm

2. **Compile the contract** (if not already compiled):
   ```bash
   cd apps/api
   npx hardhat compile
   ```
   If this fails due to Node version, use Node 22 or compile elsewhere.

3. **Deploy to Sepolia**:
   ```bash
   cd apps/api
   node scripts/deploy-direct.mjs sepolia
   ```

## After Deployment

The script will output:
- Contract address
- Transaction hash
- Links to view on Sepolia Etherscan:
  - Transaction: `https://sepolia.etherscan.io/tx/{TX_HASH}`
  - Contract: `https://sepolia.etherscan.io/address/{CONTRACT_ADDRESS}`

## Network Details

- **Network Name**: Sepolia Testnet
- **RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/qJRW4eIQ5l-M4gf7H9Hn3`
- **Chain ID**: 11155111
- **Currency Symbol**: SepoliaETH
- **Block Explorer**: https://sepolia.etherscan.io/

## Troubleshooting

### "Insufficient balance" error
- Get SepoliaETH from a faucet (see links above)

### "Contract not compiled" error
- Compile the contract first: `npx hardhat compile`
- If Hardhat fails, use Node.js 22 LTS

### "Failed to compile" error
- Hardhat 3.0 has compatibility issues with Node.js 23
- Solution: Use Node.js 22 LTS: `nvm install 22 && nvm use 22`

