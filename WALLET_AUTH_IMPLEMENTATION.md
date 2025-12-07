# Wallet-Based Authentication Implementation

Complete wallet-based authentication system with DID integration for SafePsy.

## Overview

This implementation provides:
- **Wallet connection** (MetaMask/WalletConnect)
- **Signature verification** and session management
- **DID status checking** for authenticated users
- **Protected API routes** with JWT-based authentication
- **Client-side state management** for auth and DID status
- **Error handling** for network switches and disconnects

## Architecture

### Backend Components

1. **Session Management** (`apps/api/src/lib/session.ts`)
   - JWT token generation and verification
   - HTTP-only cookie support
   - Token extraction from headers/cookies

2. **Auth Middleware** (`apps/api/src/middleware/auth.ts`)
   - `authenticateWallet` - Required authentication
   - `optionalAuthenticateWallet` - Optional authentication
   - `getAuthenticatedWallet` - Helper to get wallet from request

3. **Updated Endpoints** (`apps/api/src/routes/testing.ts`)
   - `POST /api/testing/wallet/connect` - Request verification message
   - `POST /api/testing/wallet/verify` - Verify signature & create session
   - `GET /api/testing/did/check-by-wallet` - Check DID status (requires auth)
   - `POST /api/testing/auth/logout` - Clear session

### Frontend Components

1. **AuthContext** (`apps/web/src/contexts/AuthContext.tsx`)
   - Manages authentication state
   - Handles wallet verification
   - Checks DID status
   - Provides logout functionality

2. **ConnectWallet Component** (`apps/web/src/components/ConnectWallet.tsx`)
   - Wallet connection UI
   - Verification status display
   - DID status badges
   - Network error handling

## Usage Examples

### Backend: Protecting a Route

```typescript
import { Router } from 'express';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Protected route example
router.get('/protected', authenticateWallet, async (req: AuthenticatedRequest, res: Response) => {
  // Get authenticated wallet
  const wallet = req.wallet; // { walletAddress, chainId, isVerified }
  
  res.json({
    success: true,
    data: {
      message: `Hello ${wallet.walletAddress}`,
    },
  });
});

// Using helper function
router.get('/user-data', authenticateWallet, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wallet = getAuthenticatedWallet(req);
    // Use wallet.walletAddress, wallet.chainId, etc.
    res.json({ success: true, data: { wallet } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});
```

### Frontend: Using Auth Context

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { authState, verifyWallet, checkDID, logout } = useAuth();

  // Check authentication status
  if (!authState.isVerified) {
    return <div>Please verify your wallet</div>;
  }

  // Check DID status
  if (authState.didStatus === 'none') {
    return <div>No DID found. Create one?</div>;
  }

  return (
    <div>
      <p>Wallet: {authState.walletAddress}</p>
      <p>DID Status: {authState.didStatus}</p>
      {authState.didInfo?.hasDid && (
        <p>DID: {authState.didInfo.did}</p>
      )}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Frontend: Manual Verification

```typescript
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

function VerifyButton() {
  const { wallet, connectWallet } = useWallet();
  const { verifyWallet } = useAuth();

  const handleVerify = async () => {
    if (!wallet) {
      await connectWallet();
    }
    await verifyWallet();
  };

  return <button onClick={handleVerify}>Verify Wallet</button>;
}
```

## API Endpoints

### POST /api/testing/wallet/connect

Request verification message for wallet signature.

**Headers:**
- `x-wallet-address`: Wallet address (required)
- `x-chain-id`: Chain ID (required, must be 1 for Ethereum Mainnet)

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "chainId": 1,
    "nonce": "...",
    "message": "SafePsy Wallet Verification\n\nAddress: 0x...\nNonce: ...\n\nThis signature proves you own this wallet."
  }
}
```

### POST /api/testing/wallet/verify

Verify wallet signature and create session.

**Headers:**
- `x-wallet-address`: Wallet address (required)
- `x-wallet-signature`: Signature (required)
- `x-wallet-message`: Original message (required)
- `x-chain-id`: Chain ID (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "chainId": 1,
    "verified": true,
    "token": "jwt-token-here"
  }
}
```

**Cookies:**
- Sets `walletSession` HTTP-only cookie

### GET /api/testing/did/check-by-wallet

Check DID status for authenticated wallet.

**Authentication:**
- Requires valid session (JWT token in Authorization header or cookie)

**Response:**
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "did": "did:example:123",
    "didHash": "0x...",
    "isValid": true,
    "walletAddress": "0x...",
    "contractAddress": "0x..."
  }
}
```

### POST /api/testing/auth/logout

Clear session and logout.

**Authentication:**
- Requires valid session

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## State Management

### AuthState Interface

```typescript
interface AuthState {
  walletAddress: string | null;
  network: number | null;
  isVerified: boolean;
  didStatus: 'none' | 'exists' | 'error' | 'checking';
  didInfo: DIDInfo | null;
  isLoading: boolean;
  error: string | null;
}
```

### DIDInfo Interface

```typescript
interface DIDInfo {
  hasDid: boolean;
  did: string | null;
  didHash: string | null;
  isValid: boolean;
  contractAddress?: string;
}
```

## Error Handling

### Network Errors

If user switches to unsupported network:
- Frontend shows error banner
- Wallet disconnects automatically
- All features locked until correct network

### DID Check Errors

If DID check fails:
- `didStatus` set to `'error'`
- User can retry by calling `checkDID()`
- Non-blocking error (doesn't prevent app usage)

### Session Expiration

If JWT token expires:
- Frontend detects on next API call
- Automatically clears session
- User must re-verify wallet

## Security Features

1. **JWT Tokens**: Secure, signed tokens with expiration
2. **HTTP-Only Cookies**: Prevents XSS attacks
3. **Signature Verification**: Cryptographic proof of wallet ownership
4. **Chain ID Validation**: Only Ethereum Mainnet (1) allowed
5. **Rate Limiting**: Applied to all auth endpoints
6. **Session Expiration**: Tokens expire after 7 days (configurable)

## Environment Variables

### Backend

```env
# JWT Configuration
JWT_SECRET=your-strong-random-secret-here
JWT_EXPIRES_IN=7d

# DID Verification (optional)
DID_REGISTRY_ADDRESS=0x...
RPC_URL=https://mainnet.infura.io/v3/...
ETH_RPC_URL=https://mainnet.infura.io/v3/...
```

### Frontend

```env
VITE_API_URL=http://localhost:3001
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

## Testing

### Manual Testing Flow

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve in MetaMask/WalletConnect
   - Wallet address should appear

2. **Verify Wallet**
   - Click "Verify" button
   - Sign message in wallet
   - Should see ✅ "Verified" badge

3. **Check DID**
   - After verification, DID status checked automatically
   - Shows "DID Active" if exists, "No DID" if not

4. **Test Protected Route**
   - Make API call to protected endpoint
   - Should succeed if authenticated
   - Should return 401 if not authenticated

5. **Test Logout**
   - Click disconnect/logout
   - Session cleared
   - Must re-verify to access protected routes

## Next Steps

1. **Create Production Endpoints**
   - Move from `/api/testing/*` to `/api/auth/*` and `/api/did/*`
   - Add proper error handling and logging

2. **Add DID Creation Flow**
   - Allow users to create DID if none exists
   - Integrate with smart contract deployment

3. **Session Refresh**
   - Implement token refresh mechanism
   - Extend session on activity

4. **Multi-Wallet Support**
   - Allow switching between multiple wallets
   - Store multiple sessions

5. **Enhanced Error Messages**
   - User-friendly error messages
   - Recovery suggestions

## Files Created/Modified

### Backend
- `apps/api/src/lib/session.ts` - Session management
- `apps/api/src/middleware/auth.ts` - Auth middleware
- `apps/api/src/routes/testing.ts` - Updated endpoints
- `apps/api/src/index.ts` - Added cookie parser

### Frontend
- `apps/web/src/contexts/AuthContext.tsx` - Auth context
- `apps/web/src/components/ConnectWallet.tsx` - Updated component
- `apps/web/src/App.tsx` - Added AuthProvider

## Dependencies Added

### Backend
- `jsonwebtoken` - JWT token handling
- `@types/jsonwebtoken` - TypeScript types
- `cookie-parser` - Cookie parsing
- `@types/cookie-parser` - TypeScript types

All dependencies installed with `npm install --legacy-peer-deps`

