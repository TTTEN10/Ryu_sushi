# Wallet Connection Implementation

This document describes the wallet connection implementation with WalletConnect API integration in the SafePsy application.

## ✅ Implementation Complete

### 1. WalletContext (`src/contexts/WalletContext.tsx`)

**Features:**
- Global wallet state management
- WalletConnect API integration
- MetaMask fallback support
- Automatic signature verification
- Session persistence
- Chain and account change handling

**Key Methods:**
- `connectWallet()` - Connect wallet via WalletConnect or MetaMask
- `disconnectWallet()` - Disconnect wallet and clear state
- `signMessage()` - Sign message and verify with backend

**Supported Networks:**
- Ethereum Mainnet (Chain ID: 1) - **Only supported network**

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
5. **Automatic verification** - User is prompted to sign verification message
6. **Signature verified** - Green checkmark appears when verified

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

The wallet connection integrates with the backend API:

- `POST /api/testing/wallet/connect` - Request verification message
- `POST /api/testing/wallet/verify` - Verify signature

### Request Headers

```
x-wallet-address: 0x...
x-chain-id: 1
x-wallet-signature: 0x... (for verification)
x-wallet-message: ... (for verification)
```

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
- **API Routes**: See `apps/api/src/routes/testing.ts`


