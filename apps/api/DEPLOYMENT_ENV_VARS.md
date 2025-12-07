# Deployment Environment Variables

This document describes the environment variables needed for deploying and running the DID Identity Token contract.

## Local Development (.env file)

Create a `.env` file in `apps/api/` with the following variables:

```env
# Ethereum Mainnet RPC URL
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/qJRW4eIQ5l-M4gf7H9Hn3

# Private key for deployment (DO NOT COMMIT THIS FILE)
DID_BACKEND_SIGNER_PRIVATE_KEY=your_private_key_here

# Contract deployment configuration
DID_IDENTITY_TOKEN_NAME=SafePsy DID Identity
DID_IDENTITY_TOKEN_SYMBOL=SAFEPSY-DID
DID_BASE_URI=https://api.safepsy.com/metadata/
DID_BACKEND_SIGNER_ADDRESS=0x1f4739e229adcb1c986c8a8b66f686ddec29694c
DID_ALLOW_PUBLIC_MINTING=false

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# After deployment, add the deployed contract address:
DID_IDENTITY_TOKEN_ADDRESS=0x...
```

## Production / CI Environment Variables

In production or CI/CD environments (e.g., GitHub Actions, GitLab CI, Vercel, Netlify, Docker), set the following environment variables in the platform UI or secrets store:

### Required Variables

- `RPC_URL` - Your mainnet RPC endpoint
- `DID_IDENTITY_TOKEN_ADDRESS` - Address of the deployed contract (set after deployment)

### Optional Variables (for backend services)

- `DID_BACKEND_SIGNER_PRIVATE_KEY` - Only set if your backend service must sign transactions (keep in secrets manager)
- `DID_BACKEND_SIGNER_ADDRESS` - Address of the backend signer wallet
- `ETHERSCAN_API_KEY` - For contract verification

## GitHub Actions Example

```yaml
name: Deploy Contract

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: apps/api/package-lock.json
      
      - name: Install dependencies
        working-directory: apps/api
        run: npm ci
      
      - name: Deploy to Mainnet
        working-directory: apps/api
        run: npx hardhat run scripts/deploy.js --network mainnet
        env:
          RPC_URL: ${{ secrets.RPC_URL }}
          DID_BACKEND_SIGNER_PRIVATE_KEY: ${{ secrets.DID_BACKEND_SIGNER_PRIVATE_KEY }}
          DID_BACKEND_SIGNER_ADDRESS: ${{ secrets.DID_BACKEND_SIGNER_ADDRESS }}
          ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
```

## GitLab CI Example

```yaml
deploy:
  stage: deploy
  script:
    - cd apps/api
    - npm ci
    - npx hardhat run scripts/deploy.js --network mainnet
  variables:
    RPC_URL: $RPC_URL
    DID_BACKEND_SIGNER_PRIVATE_KEY: $DID_BACKEND_SIGNER_PRIVATE_KEY
    DID_BACKEND_SIGNER_ADDRESS: $DID_BACKEND_SIGNER_ADDRESS
    ETHERSCAN_API_KEY: $ETHERSCAN_API_KEY
  only:
    - main
```

## Docker Example

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY apps/api/package*.json ./
RUN npm ci

COPY apps/api/ ./

# Environment variables should be set at runtime
ENV RPC_URL=""
ENV DID_BACKEND_SIGNER_PRIVATE_KEY=""
ENV DID_IDENTITY_TOKEN_ADDRESS=""

CMD ["npx", "hardhat", "run", "scripts/deploy.js", "--network", "mainnet"]
```

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use secrets managers** - GitHub Secrets, AWS Secrets Manager, etc.
3. **Rotate keys regularly** - Especially if exposed
4. **Limit access** - Only grant access to necessary services
5. **Monitor usage** - Set up alerts for unusual activity

## After Deployment

After deploying, update your production environment with:

```env
DID_IDENTITY_TOKEN_ADDRESS=<deployed_contract_address>
```

This address will be printed in the deployment output and saved to `deployments/mainnet-latest.json`.

