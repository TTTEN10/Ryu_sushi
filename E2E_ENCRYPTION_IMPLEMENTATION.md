# End-to-End Encryption Implementation Guide

Complete implementation of end-to-end encryption for ChatWidget with DID-based storage.

## Encryption Scheme

### Key Management

1. **Symmetric Key (AES-256-GCM)**
   - Generated client-side when DID is first created or on first chat
   - 32-byte random key
   - Used to encrypt/decrypt all chat messages

2. **Key Encryption (Wallet-Based)**
   - Symmetric key encrypted using wallet signature
   - Scheme: Sign deterministic message → Derive key from signature → Encrypt symmetric key
   - Only wallet owner can decrypt (requires private key)

3. **Storage**
   - Encrypted symmetric key stored in DID's `encryptedData` field (on-chain)
   - Encrypted chat history stored in database (off-chain)
   - Chat hash stored in DID's `encryptedData` (on-chain reference)

### Data Flow

```
Plaintext Messages
    ↓
AES-256-GCM Encryption (Symmetric Key)
    ↓
Ciphertext (Encrypted Chat Blob)
    ↓
Database Storage (Off-chain)
    ↓
Hash Generation (SHA-256)
    ↓
DID encryptedData Field (On-chain reference)
```

### Key Material

- **Plaintext**: Raw chat messages (never leaves client unencrypted)
- **Ciphertext**: AES-GCM encrypted messages (stored in database)
- **Encrypted Key**: Wallet-encrypted symmetric key (stored in DID)
- **Chat Hash**: SHA-256 hash of encrypted blob (stored in DID for verification)

## Implementation Files

### Backend

1. **Database Schema** (`apps/api/schema.prisma`)
   - `EncryptedChat` model for off-chain storage

2. **API Endpoints** (`apps/api/src/routes/chat.ts`)
   - `POST /api/chat/save` - Save encrypted chat
   - `GET /api/chat/load` - Load encrypted chat

3. **DID Service** (`apps/api/src/lib/did.service.ts`)
   - Already exists, used for DID operations

### Frontend

1. **Encryption Utilities** (`apps/web/src/utils/did-encryption.ts`)
   - `generateSymmetricKey()` - Generate AES key
   - `encryptSymmetricKey()` - Encrypt key with wallet
   - `decryptSymmetricKey()` - Decrypt key with wallet
   - `encryptChatHistory()` - Encrypt chat messages
   - `decryptChatHistory()` - Decrypt chat messages

2. **Encryption Hook** (`apps/web/src/hooks/useChatEncryption.ts`)
   - Manages encryption key lifecycle
   - Handles chat load/save with encryption

3. **ChatWidget** (`apps/web/src/components/ChatWidget.tsx`)
   - Updated to use encryption hook
   - Auto-saves encrypted chat

## Usage

### Frontend: ChatWidget Integration

```typescript
import { useChatEncryption } from '../hooks/useChatEncryption';

function ChatWidget() {
  const { symmetricKey, loadChat, saveChat, isLoading } = useChatEncryption();
  const [messages, setMessages] = useState([]);

  // Load chat on mount
  useEffect(() => {
    if (symmetricKey) {
      loadChat().then(setMessages);
    }
  }, [symmetricKey, loadChat]);

  // Save chat after each message
  const handleSend = async (message) => {
    const newMessages = [...messages, message];
    setMessages(newMessages);
    await saveChat(newMessages);
  };
}
```

### Backend: API Usage

```typescript
// Save encrypted chat
POST /api/chat/save
Headers: { Authorization: "Bearer <token>" }
Body: {
  encryptedChatBlob: "<encrypted-string>",
  didTokenId: "123"
}

// Load encrypted chat
GET /api/chat/load
Headers: { Authorization: "Bearer <token>" }
Response: {
  hasChat: true,
  encryptedChatBlob: "<encrypted-string>",
  blobHash: "0x..."
}
```

## Security Considerations

1. **Key Protection**
   - Symmetric key never stored unencrypted
   - Only wallet owner can decrypt (requires private key)
   - Key encrypted with wallet signature (proves ownership)

2. **Data Protection**
   - Plaintext never reaches backend
   - Only ciphertext stored in database
   - Hash verification ensures integrity

3. **Key Rotation**
   - Generate new symmetric key
   - Re-encrypt all chat history
   - Update DID with new encrypted key

4. **Network Failures**
   - Chat saved locally first
   - Retry DID update on next connection
   - Hash mismatch detection

## Next Steps

1. Add completions endpoint back to chat.ts
2. Update ChatWidget to use useChatEncryption hook
3. Add DID contract interaction for setDidData
4. Test end-to-end flow
5. Add key rotation UI

