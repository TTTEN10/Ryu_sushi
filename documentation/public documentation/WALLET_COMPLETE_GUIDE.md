# Wallet-Based Authentication Implementation

Complete wallet-based authentication system with DID integration for SafePsy.

## Overview

This implementation provides:
- **Wallet connection** (MetaMask/WalletConnect)
- **Signature verification** and session management
- **DID status checking** for authenticated users
- **Protected API routes** with httpOnly `walletSession` cookies (JWT never exposed to browser JS on web)
- **Client-side state management** for auth and DID status
- **Error handling** for network switches and disconnects
- **Chat data export/delete** — users can export encrypted chat or delete it permanently

## Web session (cookie-only)

The React web app does **not** store session JWTs in `localStorage`, `sessionStorage`, or React state.

| Step | What happens |
|------|----------------|
| Login | `useWalletLogin` → `auth.service`: one `POST /api/auth/wallet/verify`; API sets httpOnly `walletSession` |
| Confirm | `GET /api/auth/me` via `fetchWalletSession()` (`credentials: 'include'`) |
| Authenticated API | `apiFetch()` / `auth.service` / `postDidCheck()` — all use `API_SESSION_CREDENTIALS` (`'include'`) from `apps/web/src/config/api.ts` |
| Logout | `POST /api/auth/logout` clears the cookie; `AuthContext` removes legacy `walletSessionToken` from localStorage if present |
| `useAuth().token` | Always **`null`** — session lives in the cookie only |

**Verify response:** `POST /api/auth/wallet/verify` may include `data.token` in JSON for **mobile** (`safepsy-mobile` SecureStore). The web client **ignores** that field and relies on the cookie.

**Cross-origin:** If the SPA and API are on different hosts, set `VITE_API_URL` to the API origin and configure API CORS with `credentials: true`. Same-origin dev uses Vite proxy to `/api`.

**Mobile (out of scope for web):** `Authorization: Bearer <token>` remains supported on the API for the native app.

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

3. **Production endpoints** (`apps/api/src/routes/auth.ts`, `apps/api/src/routes/did.ts`, `apps/api/src/routes/chat.ts`)
   - `POST /api/auth/wallet/connect` — Request SIWE verification message (requires JSON body: `{ address, chainId }`)
   - `POST /api/auth/wallet/verify` — Verify signature & create httpOnly cookie session (requires JSON body: `{ message, signature }`)
   - `GET /api/auth/me` — Confirm session status (no body; returns wallet info)
   - `POST /api/did/check` — Check DID status (requires auth; creates DID if missing)
   - `POST /api/auth/logout` — Clear session cookie
   - `POST /api/chat/export` — Export encrypted chat as JSON (requires auth; rate limited: 5/hour)
   - `DELETE /api/chat` — Delete chat history permanently (requires auth; rate limited: 5/hour)

   **Dev-only mirror:** `apps/api/src/routes/testing.ts` registers wallet/DID-style handlers under **`/api/testing/*`** only when **`NODE_ENV !== 'production'`** (see `createApp()` in `apps/api/src/app.ts`). In production, requests to that prefix get **404**; integrations must call **`/api/auth/*`** and **`/api/did/*`** instead.

### Frontend Components

1. **AuthContext** (`apps/web/src/contexts/AuthContext.tsx`)
   - Manages authentication state; exposes **`token: null`** (JWT only in httpOnly cookie)
   - **`loginWithWallet()`** — `executeLogin()` (one verify), then **`fetchWalletSession()`** (`GET /api/auth/me`); does not call verify twice
   - On wallet connect, **`refreshAuth()`** re-validates the cookie session and re-runs DID check when verified
   - Checks DID status (`postDidCheck` / `checkDID`) with cookie credentials only
   - **`logout()`** — `logoutWalletSession()`, clears legacy `walletSessionToken`, disconnects wallet

2. **auth.service** (`apps/web/src/services/auth.service.ts`)
   - Sole HTTP layer for **`POST /api/auth/wallet/connect`**, **`POST /api/auth/wallet/verify`**, session **`GET /api/auth/me`**, and logout
   - Always sends JSON bodies and `credentials: 'include'` (no Bearer token in browser JS)
   - Uses **`apiFetch()`** from `config/api.ts` for consistent base URL and cookie handling

3. **useWalletLogin** (`apps/web/src/hooks/useWalletLogin.ts`)
   - `wallet/connect` → `personal_sign` → **one** `wallet/verify` per login
   - Does NOT call verify twice; session confirmation via `GET /api/auth/me`

4. **apiFetch** (`apps/web/src/config/api.ts`)
   - Wrapper around `fetch()` with default `credentials: 'include'`
   - Resolves API base URL: `VITE_API_URL` or same-origin `/api`
   - Use for all authenticated requests to ensure cookie sessions work

5. **ConnectWallet Component** (`apps/web/src/components/ConnectWallet.tsx`)
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
  const { authState, loginWithWallet, checkDID, logout } = useAuth();

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
  const { loginWithWallet } = useAuth();

  return <button onClick={() => loginWithWallet()}>Verify Wallet</button>;
}
```

## API Endpoints (production)

SafePsy wallet auth is **Sepolia-only** at runtime (`chainId` **11155111**, `SUPPORTED_CHAIN_ID` in `apps/api/src/lib/constants.ts`). Request bodies use **`Content-Type: application/json`**. The API still accepts legacy **`x-wallet-*`** headers for older clients; the web app sends JSON bodies only.

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
- `message`, `signature` (required; EIP-4361 SIWE)
- `address`, `chainId` (optional; recovered from SIWE when omitted)

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "chainId": 11155111,
    "verified": true
  }
}
```

(`data.token` may appear for **mobile** clients; web ignores it.)

**Cookies (web client):**
- API sets **`walletSession`** (httpOnly, `Secure` in production). Browser sends it automatically on same-site or configured cross-origin requests with `credentials: 'include'`.
- Web never reads or persists the JWT; **`AuthContext.loginWithWallet`** clears legacy **`walletSessionToken`** from localStorage before verify.

### GET /api/auth/me

Confirm session after verify (cookie only on web).

**Authentication:** `walletSession` cookie (`credentials: 'include'`)

### POST /api/did/check

Check DID status for the authenticated wallet.

**Authentication:**
- **Web:** `walletSession` httpOnly cookie (`credentials: 'include'`)
- **Mobile:** `Authorization: Bearer <token>` (optional on API for backward compatibility)

**Response:** See `apps/api/src/routes/did.ts` — includes `hasDid`, `tokenId`, etc.

### POST /api/auth/logout

Clear session and logout.

**Authentication:**
- **Web:** session cookie (`POST` with `credentials: 'include'`)
- **Mobile:** Bearer token optional

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

When the `walletSession` cookie expires or is invalid:
- `GET /api/auth/me` returns **401**; `fetchWalletSession()` returns `null`
- `refreshAuth()` clears verified state; user must sign in again via **`loginWithWallet()`**
- Legacy `walletSessionToken` in localStorage is removed on failed DID/session checks

## Security Features

1. **HTTP-Only `walletSession` cookie (web)**: JWT is not accessible to page JavaScript (XSS mitigation)
2. **Signature verification**: EIP-4361 SIWE / wallet message proof of ownership
3. **Chain ID validation**: **Sepolia** (**11155111**) enforced at connect, verify, and middleware
4. **Rate limiting**: Applied to auth endpoints
5. **Session expiration**: Cookie/JWT lifetime from `JWT_EXPIRES_IN` (default **7d**)
6. **Bearer JWT (mobile only)**: Native app may use `Authorization`; not used by `apps/web`

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
   Chat DEK material is stored in DID **`encryptedKeyMetadata`** on-chain (`useChatEncryption` + `updateChatReference`); legacy `localStorage` `encryptedKey_*` is migration-only.

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
- `apps/web/src/contexts/AuthContext.tsx` - Auth context (cookie session, `token: null`)
- `apps/web/src/services/auth.service.ts` - Wallet connect/verify/me/logout/did-check HTTP
- `apps/web/src/hooks/useWalletLogin.ts` - Single-verify login orchestration
- `apps/web/src/config/api.ts` - `apiFetch`, `API_SESSION_CREDENTIALS`
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
- **`signMessage()`** uses ethers `signer.signMessage()` (MetaMask and injected wallets); WalletConnect falls back to raw EIP-1193 `personal_sign` via `walletConnectProviderRef` when needed
- Chain and account change handling (Sepolia enforced for SafePsy)

**Key Methods:**
- `connectWallet()` — Connect via WalletConnect QR/modal or injected provider
- `disconnectWallet()` — Disconnect wallet and clear state
- `signMessage()` — **Sign only** (ethers or WC `personal_sign`); session verification is **`AuthContext.loginWithWallet`** → **`useWalletLogin`** → **`auth.service`** (`/api/auth/wallet/connect` then `/api/auth/wallet/verify`, then `GET /api/auth/me`)

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
# API Configuration (optional)
# Unset = same-origin /api (Vite proxy in dev). Or full API base or origin:
# VITE_API_URL=https://polinapsycho.com/api
# VITE_API_URL=http://localhost:3001

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
6. **Verified** — green checkmark when the httpOnly session cookie is valid (`GET /api/auth/me`)

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
3. **Session persistence**: httpOnly `walletSession` survives reloads; `refreshAuth()` restores verified state via `GET /api/auth/me`
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

### Session Not Persisting After Verify

1. **Cookies**: Ensure third-party cookie blocking is off for your app origin; web auth uses httpOnly `walletSession` only.
2. **Same-origin / CORS**: If SPA and API are on different hosts, set `VITE_API_URL` to the API base and configure CORS + `credentials` on the API.
3. **Network**: Wallet must stay on **Sepolia** (11155111).

## 📝 API Integration

Production routes (`apps/web` uses `apiUrl()` / `apiFetch()` from `apps/web/src/config/api.ts` — same-origin `/api` when `VITE_API_URL` is unset):

- `POST /api/auth/wallet/connect` — JSON `{ "address", "chainId" }`, `credentials: 'include'`
- `POST /api/auth/wallet/verify` — JSON `{ "message", "signature", "address?", "chainId?" }`, `credentials: 'include'`
- `GET /api/auth/me` — confirm session after verify
- `POST /api/auth/logout` — clear session

HTTP for connect/verify is centralized in **`auth.service.ts`** (used by **`useWalletLogin`** and **`SafePsyWeb3Client`**). Legacy `x-wallet-*` headers are still accepted server-side; prefer JSON bodies for new clients.

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


