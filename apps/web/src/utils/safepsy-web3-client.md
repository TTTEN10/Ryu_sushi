# SafePsy Web3 Client Library

Framework-agnostic TypeScript library for interacting with SafePsy's Web3 infrastructure.

## Features

- ✅ Wallet connection and authentication
- ✅ DID management (check, create, update)
- ✅ Encrypted chat storage operations
- ✅ Network validation (Ethereum Mainnet only)
- ✅ Automatic network switching
- ✅ Type-safe error handling
- ✅ Framework-agnostic (no React dependencies)

## Installation

The library is already included in the project. Import it from:

```typescript
import { SafePsyWeb3Client, connectWalletAndAuthenticate } from './utils/safepsy-web3-client';
```

## Configuration

The library reads configuration from environment variables:

- `VITE_API_URL` - Backend API base URL (default: `http://localhost:3001`)
- `VITE_DID_IDENTITY_TOKEN_ADDRESS` - DID contract address
- `VITE_RPC_URL` - Ethereum RPC URL (default: `https://eth.llamarpc.com`)

You can also pass configuration when creating a client:

```typescript
const client = new SafePsyWeb3Client({
  apiBaseUrl: 'https://api.safepsy.com',
  didContractAddress: '0x...',
  rpcUrl: 'https://eth.llamarpc.com',
});
```

## Usage

### Class-based API (Recommended)

```typescript
import { SafePsyWeb3Client } from './utils/safepsy-web3-client';

// Create client instance
const client = new SafePsyWeb3Client();

// Connect wallet and authenticate
const session = await client.connectWalletAndAuthenticate();
console.log('Authenticated:', session.walletAddress);

// Get current user's DID
const didInfo = await client.getCurrentUserDid();
if (didInfo) {
  console.log('DID Token ID:', didInfo.tokenId);
} else {
  console.log('No DID found');
}

// Create DID if missing
const did = await client.createDidIfMissing();
console.log('DID created/found:', did.tokenId);

// Get encrypted chat reference
const chatRef = await client.getEncryptedChatReference();
console.log('Chat reference:', chatRef);

// Update chat reference
await client.updateEncryptedChatReference(
  '0x...', // chat hash
  '0x...'  // encrypted key metadata
);

// Save encrypted chat
const result = await client.saveEncryptedChat(encryptedBlob);
console.log('Chat saved:', result.chatId);

// Load encrypted chat
const encryptedChat = await client.loadEncryptedChat();
if (encryptedChat) {
  console.log('Chat loaded');
}
```

### Function-based API (Convenience)

```typescript
import {
  connectWalletAndAuthenticate,
  getCurrentUserDid,
  createDidIfMissing,
  getEncryptedChatReference,
  updateEncryptedChatReference,
} from './utils/safepsy-web3-client';

// Connect and authenticate
const session = await connectWalletAndAuthenticate();

// Get DID
const did = await getCurrentUserDid();

// Create DID if missing
const newDid = await createDidIfMissing();

// Get chat reference
const ref = await getEncryptedChatReference();

// Update chat reference
await updateEncryptedChatReference('0x...', '0x...');
```

## API Reference

### SafePsyWeb3Client Class

#### Methods

##### `connectWalletAndAuthenticate(): Promise<UserSession>`

Connects wallet, validates network, signs verification message, and creates authenticated session.

**Returns:** `UserSession` with wallet address, chain ID, verification status, and DID info.

**Throws:** `AuthenticationError`, `NetworkError`

##### `getCurrentUserDid(): Promise<DidInfo | null>`

Gets current user's DID information from backend.

**Returns:** `DidInfo` if DID exists, `null` otherwise.

**Throws:** `AuthenticationError`, `DIDError`

##### `createDidIfMissing(): Promise<DidInfo>`

Checks if user has a DID, creates one if missing.

**Returns:** `DidInfo` for created or existing DID.

**Throws:** `AuthenticationError`, `DIDError`

##### `getEncryptedChatReference(): Promise<string | null>`

Gets encrypted chat reference from DID contract.

**Returns:** Chat reference (bytes32 hex string) or `null` if not set.

**Throws:** `AuthenticationError`, `ContractError`

##### `updateEncryptedChatReference(chatReference: string, encryptedKeyMetadata: string | Uint8Array): Promise<void>`

Updates chat reference and encrypted key metadata in DID contract.

**Parameters:**
- `chatReference`: Chat data reference (hash/CID/DB key)
- `encryptedKeyMetadata`: Encrypted key metadata (hex string or Uint8Array)

**Throws:** `AuthenticationError`, `ContractError`

##### `saveEncryptedChat(encryptedChatBlob: string): Promise<{...}>`

Saves encrypted chat blob to backend.

**Returns:** Object with `chatId`, `blobHash`, `chatReference`, `requiresDidUpdate`.

**Throws:** `AuthenticationError`, `NetworkError`

##### `loadEncryptedChat(): Promise<string | null>`

Loads encrypted chat blob from backend.

**Returns:** Encrypted chat blob or `null` if no chat exists.

**Throws:** `AuthenticationError`, `NetworkError`

##### `getCurrentSession(): UserSession | null`

Gets current authenticated session.

##### `isAuthenticated(): boolean`

Checks if user is authenticated.

##### `logout(): Promise<void>`

Logs out and clears session.

## Error Handling

The library uses typed error classes:

- `SafePsyError` - Base error class
- `NetworkError` - Network/API errors
- `AuthenticationError` - Authentication failures
- `DIDError` - DID operation errors
- `ContractError` - Smart contract errors

All errors include:
- `message`: Human-readable error message
- `code`: Error code for programmatic handling
- `details`: Additional error details

Example:

```typescript
try {
  await client.connectWalletAndAuthenticate();
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
    console.error('Details:', error.details);
  } else if (error instanceof AuthenticationError) {
    console.error('Auth error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Integration Examples

### React Component

```typescript
import { useState, useEffect } from 'react';
import { SafePsyWeb3Client, UserSession } from './utils/safepsy-web3-client';

function MyComponent() {
  const [client] = useState(() => new SafePsyWeb3Client());
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const newSession = await client.connectWalletAndAuthenticate();
      setSession(newSession);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {session ? (
        <p>Connected: {session.walletAddress}</p>
      ) : (
        <button onClick={handleConnect} disabled={loading}>
          Connect Wallet
        </button>
      )}
    </div>
  );
}
```

### Server Route (Next.js API Route)

```typescript
import { SafePsyWeb3Client } from '@/utils/safepsy-web3-client';

export default async function handler(req, res) {
  const client = new SafePsyWeb3Client({
    apiBaseUrl: process.env.API_URL,
    didContractAddress: process.env.DID_CONTRACT_ADDRESS,
  });

  try {
    const session = await client.connectWalletAndAuthenticate();
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## Network Requirements

- **Only Ethereum Mainnet (Chain ID: 1) is supported**
- The library automatically validates network and prompts user to switch if needed
- Network switching is handled automatically when possible

## Security Considerations

- All sensitive operations require wallet signature
- Session tokens are stored in HTTP-only cookies (backend)
- Private keys never leave the wallet
- Contract interactions require explicit user approval

## TypeScript Types

All types are exported for use in your code:

```typescript
import type {
  UserSession,
  DidInfo,
  DidProfile,
  WalletProvider,
  SafePsyError,
  NetworkError,
  AuthenticationError,
  DIDError,
  ContractError,
} from './utils/safepsy-web3-client';
```

