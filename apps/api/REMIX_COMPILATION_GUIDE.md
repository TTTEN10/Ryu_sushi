# Remix IDE Compilation Guide for DIDIdentityToken

## Issue
The contract exceeds the 24KB bytecode limit when compiled with default Remix settings.

## Solution: Configure Remix Compiler Settings

### Step 1: Open Remix IDE
Go to https://remix.ethereum.org

### Step 2: Configure Compiler Settings

1. **Click on the "Solidity Compiler" tab** (left sidebar, looks like a checkmark)

2. **Select Compiler Version**
   - Choose: `0.8.20` (must match the pragma version in the contract)

3. **Enable Optimizer**
   - Check the box: ✅ **"Enable optimization"**
   - Set **"Runs"** to: `1` (this is critical - lower = smaller bytecode)

4. **Advanced Config** (if available)
   - EVM Version: `paris` or `default`
   - Compilation Target: `EVM`

### Step 3: Compile

1. Make sure your `DIDIdentityToken.sol` file is open in Remix
2. Click the **"Compile DIDIdentityToken.sol"** button
3. The warning should disappear

## Expected Results

With `runs: 1`:
- ✅ Bytecode size: ~14,500 bytes
- ✅ Under the 24,576 byte limit
- ✅ Ready for deployment

## Alternative: Add Compiler Settings Comment

You can also add a comment at the top of your contract file to remind about the settings:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Compiler settings for Remix:
// - Enable optimization: Yes
// - Runs: 1
// - EVM Version: Paris (or default)

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// ... rest of contract
```

## Troubleshooting

### If warning persists:
1. Make sure optimizer is enabled
2. Verify `Runs` is set to `1` (not 200 or other values)
3. Clear Remix cache: Settings → Clear cache
4. Recompile the contract

### If you need to use higher runs value:
- `runs: 1` = smallest bytecode (recommended for deployment)
- `runs: 200` = balanced (may exceed limit)
- `runs: 10000+` = gas optimized (will likely exceed limit)

## Note
Remix compiler settings are independent of Hardhat. You must configure them separately in Remix's UI.

