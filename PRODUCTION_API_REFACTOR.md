# Production API Refactoring Guide

## Overview

Refactored testing endpoints into production-ready Web3 API layer with clean separation and shared utilities.

## API Structure

### Production Endpoints

#### Authentication (`/api/auth/*`)

**POST /api/auth/wallet/connect**
- **Purpose**: Request verification message
- **Auth**: Public
- **Input**: `{ address: string }` or `x-wallet-address` header
- **Output**: `{ success: true, data: { address, chainId, nonce, message } }`

**POST /api/auth/wallet/verify**
- **Purpose**: Verify signature and create session
- **Auth**: Public (creates session)
- **Input**: `{ address, signature, message, chainId }` or headers
- **Output**: `{ success: true, data: { address, chainId, verified: true, token } }`
- **Cookies**: Sets `walletSession` HTTP-only cookie

**GET /api/auth/session**
- **Purpose**: Get current session info
- **Auth**: Required (wallet session)
- **Output**: `{ success: true, data: { walletAddress, chainId, isVerified } }`

**POST /api/auth/logout**
- **Purpose**: Clear session
- **Auth**: Required (wallet session)
- **Output**: `{ success: true, message: "Logged out successfully" }`

#### DID (`/api/did/*`)

**POST /api/did/check**
- **Purpose**: Check if wallet has DID
- **Auth**: Required (wallet session)
- **Output**: `{ success: true, data: { hasDid, tokenId, encryptedDataExists, walletAddress } }`

**POST /api/did/create**
- **Purpose**: Create DID for wallet
- **Auth**: Required (wallet session)
- **Output**: `{ success: true, data: { hasDid: true, tokenId, txHash } }`

**GET /api/did/info**
- **Purpose**: Get complete DID metadata
- **Auth**: Required (wallet session)
- **Output**: `{ success: true, data: { hasDid, tokenId, encryptedDataExists, network, contractAddress, ... } }`

#### Chat (`/api/chat/*`)

**POST /api/chat/completions**
- **Purpose**: AI chat completion (streaming/non-streaming)
- **Auth**: Optional (recommended for encrypted chat)
- **Input**: `{ messages: [...], stream: boolean, ... }`
- **Output**: SSE stream or JSON response

**POST /api/chat/save**
- **Purpose**: Save encrypted chat history
- **Auth**: Required (wallet session)
- **Input**: `{ encryptedChatBlob: string, didTokenId: string | null }`
- **Output**: `{ success: true, data: { chatId, blobHash, didTokenId, requiresDidUpdate } }`

**GET /api/chat/load**
- **Purpose**: Load encrypted chat history
- **Auth**: Required (wallet session)
- **Output**: `{ success: true, data: { hasChat, encryptedChatBlob, blobHash, ... } }`

**GET /api/chat/health**
- **Purpose**: Health check
- **Auth**: Public
- **Output**: `{ success: true, message: "Chat endpoints are healthy" }`

### Testing Endpoints (Dev Only)

**Note**: `/api/testing/*` endpoints remain available for backward compatibility and development, but production code should use `/api/auth/*` and `/api/did/*` endpoints.

## Shared Utilities

### API Helpers (`apps/api/src/lib/api-helpers.ts`)

```typescript
import { sendSuccess, sendError, validateNetwork, asyncHandler } from '../lib/api-helpers';

// Success response
sendSuccess(res, { data: 'value' }, 'Operation successful');

// Error response
sendError(res, 'Error message', 'ERROR_CODE', 400);

// Network validation
const validation = validateNetwork(chainId);
if (!validation.valid) {
  return sendError(res, validation.error!, 'UNSUPPORTED_CHAIN', 400);
}

// Async handler wrapper
router.get('/endpoint', asyncHandler(async (req, res) => {
  // Route logic
}));
```

## Migration Guide

### Frontend Updates

**Old (Testing Endpoints)**:
```typescript
await fetch('/api/testing/wallet/connect', { ... });
await fetch('/api/testing/wallet/verify', { ... });
await fetch('/api/testing/did/check', { ... });
```

**New (Production Endpoints)**:
```typescript
await fetch('/api/auth/wallet/connect', { ... });
await fetch('/api/auth/wallet/verify', { ... });
await fetch('/api/did/check', { ... });
```

### Backend Updates

**Old**:
```typescript
router.post('/testing/wallet/connect', ...);
```

**New**:
```typescript
router.post('/auth/wallet/connect', ...);
```

## Code Examples

### Example: Protected Route

```typescript
import { Router } from 'express';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../lib/api-helpers';

const router = Router();

router.get('/protected', authenticateWallet, async (req: AuthenticatedRequest, res) => {
  if (!req.wallet) {
    return sendError(res, 'Authentication required', 'NOT_AUTHENTICATED', 401);
  }

  sendSuccess(res, {
    walletAddress: req.wallet.walletAddress,
    message: 'Access granted',
  });
});
```

### Example: Error Handling

```typescript
import { asyncHandler, sendError, validateNetwork } from '../lib/api-helpers';

router.post('/endpoint', asyncHandler(async (req, res) => {
  const { chainId } = req.body;
  
  const networkValidation = validateNetwork(chainId);
  if (!networkValidation.valid) {
    return sendError(res, networkValidation.error!, 'UNSUPPORTED_CHAIN', 400);
  }

  // Continue with logic...
}));
```

## Environment Variables

```env
# API Configuration
FRONTEND_URL=http://localhost:5173
PORT=3001

# JWT Configuration
JWT_SECRET=your-strong-random-secret
JWT_EXPIRES_IN=7d

# Web3 Configuration
RPC_URL=https://mainnet.infura.io/v3/...
ETH_RPC_URL=https://mainnet.infura.io/v3/...
DID_IDENTITY_TOKEN_ADDRESS=0x...
DID_BACKEND_SIGNER_PRIVATE_KEY=0x... (optional)

# Database
DATABASE_URL=postgresql://...
```

## Testing

### Test Production Endpoints

```bash
# Connect wallet
curl -X POST http://localhost:3001/api/auth/wallet/connect \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x..." \
  -H "x-chain-id: 1"

# Verify wallet
curl -X POST http://localhost:3001/api/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x..." \
  -H "x-wallet-signature: 0x..." \
  -H "x-wallet-message: ..." \
  -H "x-chain-id: 1"

# Get session
curl -X GET http://localhost:3001/api/auth/session \
  -H "Authorization: Bearer <token>"
```

## Files Created/Modified

### Backend
- `apps/api/src/routes/auth.ts` - Production auth endpoints
- `apps/api/src/lib/api-helpers.ts` - Shared utilities
- `apps/api/src/routes/chat.ts` - Added completions endpoint back
- `apps/api/src/index.ts` - Registered auth routes

### Frontend
- `apps/web/src/utils/did-contract.ts` - DID contract interaction

## Next Steps

1. Update frontend to use production endpoints
2. Mark testing endpoints as deprecated
3. Add API versioning if needed
4. Add comprehensive error handling
5. Add request/response logging
6. Add API documentation (OpenAPI/Swagger)

