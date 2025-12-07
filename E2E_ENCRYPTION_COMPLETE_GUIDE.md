# End-to-End Encryption Complete Implementation Guide

## Encryption Scheme Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Encryption Layers                         │
└─────────────────────────────────────────────────────────────┘

Layer 1: Symmetric Encryption (AES-256-GCM)
├── Key: 32-byte random key (generated client-side)
├── Purpose: Encrypt/decrypt chat messages
└── Storage: Encrypted with wallet signature

Layer 2: Wallet-Based Key Encryption
├── Method: Wallet signature + key derivation
├── Purpose: Protect symmetric key
└── Storage: DID's encryptedData field (on-chain)

Layer 3: Chat Storage
├── Encrypted Chat: Database (off-chain)
├── Chat Hash: DID encryptedData (on-chain reference)
└── Encrypted Key: DID encryptedData (on-chain)
```

### Key Material Flow

1. **Symmetric Key Generation** (Client-side)
   - Generate 32-byte random key: `generateSymmetricKey()`
   - This key encrypts all chat messages

2. **Key Encryption** (Client-side)
   - Sign deterministic message with wallet
   - Derive encryption key from signature
   - Encrypt symmetric key: `encryptSymmetricKey(key, wallet, signer)`
   - Result: Encrypted key string (format: `signature:encryptedKey`)

3. **Key Storage** (On-chain)
   - Store encrypted key in DID's `encryptedData` field
   - Format: JSON `{ encryptedKey: "...", chatHash: "...", ... }`
   - Only wallet owner can decrypt (requires private key)

4. **Chat Encryption** (Client-side)
   - Encrypt chat history with symmetric key: `encryptChatHistory(chatJson, key)`
   - Result: Encrypted blob (base64 string)

5. **Chat Storage** (Off-chain)
   - Store encrypted blob in database
   - Generate hash: `hashEncryptedChat(encryptedBlob)`
   - Store hash in DID's `encryptedData` field

## Complete Code Examples

### Frontend: Encryption Hook Usage

```typescript
import { useChatEncryption } from '../hooks/useChatEncryption';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { updateDIDData } from '../utils/did-contract';

function ChatWidget() {
  const { wallet, signer } = useWallet();
  const { authState } = useAuth();
  const { symmetricKey, loadChat, saveChat, encryptedKey, saveKeyToDID } = useChatEncryption();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat on mount
  useEffect(() => {
    if (symmetricKey && authState.isVerified) {
      setIsLoading(true);
      loadChat()
        .then((loaded) => {
          setMessages(loaded);
        })
        .finally(() => setIsLoading(false));
    }
  }, [symmetricKey, authState.isVerified, loadChat]);

  // Save chat after each message
  const handleSaveChat = async (updatedMessages: Message[]) => {
    if (!symmetricKey) return;

    try {
      await saveChat(updatedMessages);
      
      // Update DID if needed
      if (authState.didInfo?.hasDid && encryptedKey) {
        const didDataString = await saveKeyToDID();
        if (didDataString && signer) {
          // Update DID contract
          await updateDIDData(signer, didDataString);
        }
      }
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const handleSend = async (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
      timestamp: new Date(),
    };
    
    const updated = [...messages, newMessage];
    setMessages(updated);
    await handleSaveChat(updated);
  };

  return (
    <div>
      {isLoading && <div>Loading chat...</div>}
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      {/* Chat UI */}
    </div>
  );
}
```

### Frontend: DID Contract Interaction

```typescript
import { updateDIDData } from '../utils/did-contract';
import { useWallet } from '../contexts/WalletContext';

function UpdateDIDButton() {
  const { signer } = useWallet();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateDID = async () => {
    if (!signer) return;

    try {
      setIsUpdating(true);
      
      // Prepare DID data (from saveChat response)
      const didData = {
        encryptedKey: 'signature:encryptedKey...',
        chatHash: '0x...',
        updatedAt: new Date().toISOString(),
      };

      const receipt = await updateDIDData(signer, JSON.stringify(didData));
      console.log('DID updated:', receipt.hash);
    } catch (error) {
      console.error('Error updating DID:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button onClick={handleUpdateDID} disabled={isUpdating}>
      {isUpdating ? 'Updating...' : 'Update DID'}
    </button>
  );
}
```

### Backend: Chat Save Endpoint

```typescript
// POST /api/chat/save
router.post('/save', authenticateWallet, async (req: AuthenticatedRequest, res) => {
  const { encryptedChatBlob, didTokenId } = req.body;
  const walletAddress = req.wallet.walletAddress;

  // Generate hash
  const hash = await crypto.subtle.digest('SHA-256', 
    new TextEncoder().encode(encryptedChatBlob)
  );
  const blobHash = ethers.hexlify(new Uint8Array(hash));

  // Save to database
  const chat = await prisma.encryptedChat.upsert({
    where: { walletAddress },
    update: { encryptedBlob: encryptedChatBlob, encryptedBlobHash: blobHash },
    create: { walletAddress, encryptedBlob: encryptedChatBlob, encryptedBlobHash: blobHash },
  });

  // Return data for DID update
  res.json({
    success: true,
    data: {
      chatId: chat.id,
      blobHash,
      requiresDidUpdate: true,
      didDataToUpdate: JSON.stringify({ chatHash: blobHash }),
    },
  });
});
```

## End-to-End Flow Examples

### First-Time User with No DID or Chats

1. **Connect Wallet**
   ```typescript
   await connectWallet(); // MetaMask/WalletConnect
   ```

2. **Verify Wallet**
   ```typescript
   await verifyWallet(); // Sign message, create session
   ```

3. **Create DID** (if needed)
   ```typescript
   await fetch('/api/did/create', {
     method: 'POST',
     headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

4. **Initialize Encryption**
   ```typescript
   // Hook automatically generates symmetric key
   const { symmetricKey } = useChatEncryption();
   // Key is encrypted and ready to store in DID
   ```

5. **Send First Message**
   ```typescript
   const message = { role: 'user', content: 'Hello' };
   const encrypted = await encryptChatHistory(JSON.stringify([message]), symmetricKey);
   await fetch('/api/chat/save', {
     method: 'POST',
     body: JSON.stringify({ encryptedChatBlob: encrypted })
   });
   ```

6. **Update DID**
   ```typescript
   const didData = {
     encryptedKey: encryptedKeyString,
     chatHash: blobHash,
   };
   await updateDIDData(signer, JSON.stringify(didData));
   ```

### Returning User with Existing DID and Encrypted Chat

1. **Connect & Verify Wallet**
   ```typescript
   await connectWallet();
   await verifyWallet();
   ```

2. **Load DID Info**
   ```typescript
   const didInfo = await fetch('/api/did/info');
   // Returns: { hasDid: true, tokenId: "123", encryptedDataExists: true }
   ```

3. **Load Encrypted Key from DID**
   ```typescript
   // Hook automatically loads encrypted key from DID
   const { symmetricKey } = useChatEncryption();
   // Key is decrypted using wallet signature
   ```

4. **Load Encrypted Chat**
   ```typescript
   const chatData = await fetch('/api/chat/load');
   const encryptedBlob = chatData.data.encryptedChatBlob;
   const decrypted = await decryptChatHistory(encryptedBlob, symmetricKey);
   const messages = JSON.parse(decrypted);
   ```

5. **Continue Chatting**
   ```typescript
   // Messages are encrypted before saving
   // Chat is automatically saved after each message
   ```

## Security Considerations

### Key Protection

**Problem**: How to prevent server/others from reading chat history?

**Solution**:
- Symmetric key encrypted with wallet signature
- Only wallet owner can decrypt (requires private key)
- Server never sees plaintext or unencrypted key
- Key stored on-chain in DID (wallet-controlled)

### Key Rotation

**Scenario**: Key compromised or user wants reset

**Solution**:
```typescript
// 1. Generate new symmetric key
const newKey = generateSymmetricKey();

// 2. Re-encrypt all chat history
const encryptedHistory = await encryptChatHistory(chatJson, newKey);

// 3. Encrypt new key
const encryptedKey = await encryptSymmetricKey(newKey, wallet.address, signer);

// 4. Update DID with new key
await updateDIDData(signer, JSON.stringify({ encryptedKey }));

// 5. Save re-encrypted chat
await saveChat(encryptedHistory);
```

### Network/Contract Failures

**Scenario**: Contract call fails, but chat is saved

**Solution**:
```typescript
try {
  // Save chat (always succeeds)
  const result = await saveChat(encryptedChat);
  
  // Try to update DID
  if (result.data.requiresDidUpdate) {
    try {
      await updateDIDData(signer, result.data.didDataToUpdate);
    } catch (contractError) {
      // Store pending update, retry later
      localStorage.setItem('pendingDidUpdate', result.data.didDataToUpdate);
    }
  }
} catch (error) {
  // Handle error
}

// Retry pending updates on next connection
useEffect(() => {
  const pending = localStorage.getItem('pendingDidUpdate');
  if (pending && signer) {
    updateDIDData(signer, pending)
      .then(() => localStorage.removeItem('pendingDidUpdate'))
      .catch(() => {}); // Will retry later
  }
}, [signer]);
```

## Database Migration

Run migration to create `encrypted_chats` table:

```bash
cd apps/api
npx prisma migrate dev --name add_encrypted_chats
```

## Environment Setup

### Backend

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/safepsy

# DID Contract
DID_IDENTITY_TOKEN_ADDRESS=0x...
RPC_URL=https://mainnet.infura.io/v3/...
DID_BACKEND_SIGNER_PRIVATE_KEY=0x... (optional)

# JWT
JWT_SECRET=your-strong-random-secret
JWT_EXPIRES_IN=7d
```

### Frontend

```env
VITE_API_URL=http://localhost:3001
VITE_DID_IDENTITY_TOKEN_ADDRESS=0x...
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
```

## Testing Checklist

- [ ] Generate symmetric key
- [ ] Encrypt/decrypt symmetric key with wallet
- [ ] Store encrypted key in DID
- [ ] Load encrypted key from DID
- [ ] Encrypt chat messages
- [ ] Save encrypted chat to database
- [ ] Load encrypted chat from database
- [ ] Decrypt chat messages
- [ ] Update DID with chat hash
- [ ] Handle network failures
- [ ] Test key rotation
- [ ] Verify plaintext never reaches backend

## Files Summary

### Backend
- `apps/api/schema.prisma` - EncryptedChat model
- `apps/api/src/routes/chat.ts` - Save/load endpoints + completions
- `apps/api/src/routes/auth.ts` - Production auth endpoints
- `apps/api/src/lib/api-helpers.ts` - Shared utilities

### Frontend
- `apps/web/src/utils/did-encryption.ts` - Encryption utilities
- `apps/web/src/hooks/useChatEncryption.ts` - Encryption hook
- `apps/web/src/utils/did-contract.ts` - DID contract interaction
- `apps/web/src/components/ChatWidget.tsx` - (Needs update to use hook)

## Next Steps

1. Update ChatWidget to use `useChatEncryption` hook
2. Add DID contract address to frontend env
3. Test end-to-end encryption flow
4. Add key rotation UI
5. Add error recovery UI
6. Add loading states
7. Test with real DID contract

