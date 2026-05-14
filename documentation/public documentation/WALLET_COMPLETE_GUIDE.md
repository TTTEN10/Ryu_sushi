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

3. **Production endpoints** (`apps/api/src/routes/auth.ts`, `apps/api/src/routes/did.ts`)
   - `POST /api/auth/wallet/connect` — Request verification message (JSON body)
   - `POST /api/auth/wallet/verify` — Verify signature & create session (JSON body)
   - `POST /api/did/check` — Check DID status (requires auth; used by the web app after verify)
   - `POST /api/auth/logout` — Clear session

   **Dev-only mirror:** `apps/api/src/routes/testing.ts` registers wallet/DID-style handlers under **`/api/testing/*`** only when **`NODE_ENV !== 'production'`** (see `createApp()` in `apps/api/src/app.ts`). In production, requests to that prefix get **404**; integrations must call **`/api/auth/*`** and **`/api/did/*`** instead.

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

## API Endpoints (production)

SafePsy wallet auth is **Sepolia-only** at runtime (`chainId` **11155111**). Request bodies use **`Content-Type: application/json`**. The API middleware still accepts **legacy header-based** calls for backward compatibility.

### POST /api/auth/wallet/connect

Request verification message for wallet signature.

**Body (JSON):**
- `address` (required): checksummed or lowercase `0x` address
- `chainId` (optional in schema; send **11155111** for Sepolia)

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "chainId": 11155111,
    "nonce": "...",
    "message": "SafePsy Wallet Verification\n\nAddress: 0x...\nNonce: ...\n\nThis signature proves you own this wallet."
  }
}
```

### POST /api/auth/wallet/verify

Verify wallet signature and create session.

**Body (JSON):**
- `address`, `message`, `signature` (required)
- `chainId` (optional in schema; should match Sepolia)

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "chainId": 11155111,
    "verified": true,
    "token": "jwt-token-here"
  }
}
```

**Cookies:**
- Sets `walletSession` HTTP-only cookie  
- The web client also stores `walletSessionToken` in `localStorage` when returned in `data.token`.

### POST /api/did/check

Check DID status for the authenticated wallet (Bearer JWT and/or session cookie).

**Authentication:**
- Requires valid session (`Authorization: Bearer …` and/or cookie)

**Response:** See `apps/api/src/routes/did.ts` — includes `hasDid`, `tokenId`, etc.

### POST /api/auth/logout

Clear session and logout.

**Authentication:**
- Requires valid session (Bearer token recommended)

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
4. **Chain ID Validation**: SafePsy wallet auth enforces **Sepolia** (**11155111**) at runtime
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
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
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

1. **DID-backed chat key storage (see `programming_sprint.md` Phase D)**  
   Reduce reliance on **localStorage** for encryption key material; align with DID metadata / contract flows.

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
- `apps/api/src/routes/auth.ts` - Production wallet session routes
- `apps/api/src/routes/testing.ts` - Dev-only mirrors (`/api/testing/*`)
- `apps/api/src/app.ts` - `createApp()`, cookie parsing, route mounts

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

# Wallet Connection Implementation

This document describes the wallet connection implementation with WalletConnect API integration in the SafePsy application.

## ✅ Implementation Complete

### 1. WalletContext (`src/contexts/WalletContext.tsx`)

**Features:**
- Global wallet state management
- WalletConnect (`@walletconnect/ethereum-provider`) when `VITE_WALLETCONNECT_PROJECT_ID` is set; otherwise injected wallets (e.g. MetaMask)
- **`personal_sign`** via EIP-1193 for both paths — compatible with MetaMask and WalletConnect-backed wallets
- Chain and account change handling (Sepolia enforced for SafePsy)

**Key Methods:**
- `connectWallet()` — Connect via WalletConnect QR/modal or injected provider
- `disconnectWallet()` — Disconnect wallet and clear state
- `signMessage()` — **Sign only** (`personal_sign`); session verification is **`AuthContext.verifyWallet`** (calls `/api/auth/wallet/connect` then `/api/auth/wallet/verify`)

**Supported Networks:**
- **Sepolia** (Chain ID: **11155111**) — **Only supported network** for this product path

### 2. ConnectWallet Component (`src/components/ConnectWallet.tsx`)

**Features:**
- Connect/Disconnect wallet button
- Wallet address display (truncated)
- Verification status indicator
- Automatic signature verification
- Error handling and display

**UI States:**
- Not Connected: Shows "Connect Wallet" button
- Connected (Not Verified): Shows address with yellow indicator + "Verify" button
- Connected (Verified): Shows address with green checkmark
- Loading: Shows "Connecting..." state

### 3. Header Integration

The ConnectWallet component is integrated into the Header component and appears on all pages:
- Top right corner
- Next to theme toggle
- Responsive design (hides text on mobile, shows icon only)

## 📦 Dependencies Added

```json
{
  "@walletconnect/ethereum-provider": "^2.9.2",
  "@walletconnect/modal": "^2.6.2"
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in `apps/web/`:

```env
# API Configuration
VITE_API_URL=http://localhost:3001

# WalletConnect Configuration
# Get your Project ID from https://cloud.walletconnect.com
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

### Getting WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Sign up or log in
3. Create a new project
4. Copy the Project ID
5. Add it to your `.env` file

**Note:** If Project ID is not set, the app will fall back to MetaMask only.

## 🚀 Usage

### User Flow

1. **User clicks "Connect Wallet" button** (top right of header)
2. **WalletConnect modal appears** (if Project ID is set) or MetaMask popup
3. **User selects/approves wallet connection**
4. **Wallet connects** and address is displayed
5. User clicks **Verify** — app requests a message from **`POST /api/auth/wallet/connect`**, user signs with **`personal_sign`**, then **`POST /api/auth/wallet/verify`** establishes the session
6. **Verified** — green checkmark when JWT/session is valid

### Programmatic Usage

```typescript
import { useWallet } from '../contexts/WalletContext';

function MyComponent() {
  const { wallet, connectWallet, disconnectWallet, signMessage } = useWallet();

  // Check if wallet is connected
  if (wallet) {
    console.log('Connected:', wallet.address);
  }

  // Connect wallet
  await connectWallet();

  // Sign a message
  const signature = await signMessage('Hello, SafePsy!');

  // Disconnect
  disconnectWallet();
}
```

## 🔐 Security Features

1. **Signature Verification**: All signatures are verified server-side
2. **Nonce-based Messages**: Each verification uses a unique nonce
3. **Session Management**: Wallet state persists across page reloads
4. **Error Handling**: Comprehensive error handling and user feedback
5. **Privacy**: Wallet addresses are truncated in UI

## 📱 Supported Wallets

### WalletConnect (Mobile & Desktop)
- Trust Wallet
- MetaMask Mobile
- Rainbow
- Coinbase Wallet
- And 300+ other wallets

### Injected Providers (Desktop)
- MetaMask
- Coinbase Wallet
- Brave Wallet
- Any EIP-1193 compatible wallet

## 🎨 UI/UX Features

1. **Responsive Design**: Adapts to mobile and desktop
2. **Visual Indicators**: Color-coded status (green = verified, yellow = unverified)
3. **Truncated Addresses**: Shows first 6 and last 4 characters
4. **Loading States**: Clear feedback during connection/verification
5. **Error Messages**: User-friendly error messages
6. **Accessibility**: Proper ARIA labels and keyboard navigation

## 🔄 State Management

### Wallet State

```typescript
interface WalletInfo {
  address: string;        // Wallet address
  chainId: number;        // Current chain ID
  isConnected: boolean;  // Connection status
}
```

### Context State

- `wallet`: Current wallet info or null
- `provider`: Ethers provider instance
- `signer`: Ethers signer instance
- `isLoading`: Loading state
- `error`: Error message or null

## 🐛 Troubleshooting

### WalletConnect Not Working

1. **Check Project ID**: Ensure `VITE_WALLETCONNECT_PROJECT_ID` is set
2. **Check Network**: Ensure you're on a supported network
3. **Check Console**: Look for error messages in browser console
4. **Fallback**: App will automatically fall back to MetaMask

### Signature Verification Failing

1. **Check API**: Ensure backend API is running
2. **Check Network**: Ensure wallet is on correct network
3. **Check Message**: Verify message format is correct
4. **Retry**: Click "Verify" button to retry

### Wallet Not Persisting

1. **Check localStorage**: Wallet state is stored in localStorage
2. **Check Browser**: Some browsers block localStorage
3. **Clear Cache**: Try clearing browser cache

## 📝 API Integration

Production routes (`apps/web` uses same-origin `/api` or `VITE_API_URL`):

- `POST /api/auth/wallet/connect` — JSON `{ "address", "chainId" }`
- `POST /api/auth/wallet/verify` — JSON `{ "address", "message", "signature", "chainId" }` with `credentials: 'include'` for cookies

Legacy header-only requests are still accepted server-side; prefer JSON bodies for new clients.

## 🔮 Future Enhancements

- [ ] Multi-wallet support (show all connected wallets)
- [ ] Wallet switching
- [ ] Network switching UI
- [ ] Transaction history
- [ ] Wallet balance display
- [ ] Custom RPC endpoints
- [ ] Hardware wallet support (Ledger, Trezor)

## 📚 Documentation

- **WalletConnect Docs**: https://docs.walletconnect.com/
- **Ethers.js Docs**: https://docs.ethers.org/
- **API Routes**: See `apps/api/src/routes/auth.ts` (wallet connect/verify/session/logout). Dev-only mirrors live in `apps/api/src/routes/testing.ts` when `NODE_ENV !== 'production'`.


